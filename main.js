// PokeStreams — uma janela só com até 5 lives da Twitch em grade (estilo PokeGrid).
// Cada quadro = <webview> do player + <webview> do chat, todos na MESMA sessão
// (persist:twitch), para você entrar na Twitch uma vez só.
const { app, BrowserWindow, ipcMain, screen, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

const SLOTS = 5;
const PARTITION = 'persist:twitch';
const STREAM_HOSTS = [
  'twitch.tv', 'twitchcdn.net', 'ttvnw.net', 'jtvnw.net', 'twitchsvc.net', // Twitch
  'kick.com'                                                               // Kick
];
const PLATFORMS = ['twitch', 'kick'];

// O Poke Idle World precisa que a live toque sem clique.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Remove "Electron/x" e o nome do app do User-Agent: fica o UA do Chromium de verdade
// (o motor é o Chrome). Sem isso, o login da Twitch costuma recusar o navegador.
app.userAgentFallback = app.userAgentFallback
  .replace(/\s*Electron\/\S+/i, '')
  .replace(/\s*pokestreams\/\S+/i, '');

// ---------- Configuração (userData/config.json) ----------
const CONFIG_PATH = () => path.join(app.getPath('userData'), 'config.json');
const DEFAULT_CONFIG = {
  slots: Array.from({ length: SLOTS }, () => ({ platform: 'twitch', channel: '', enabled: true, chat: false })),
  layout: 'centro',     // 'centro' (1 no meio + 4 nos cantos) | '3-2' | '2-3'
  quality: '160p30',
  volume: 0.05,         // volume baixo em vez de mudo
  chatWidth: 260,
  autoReloadMin: 0,
  window: null          // { bounds, maximized, fullscreen }
};

function loadConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8'));
       const merged = { ...DEFAULT_CONFIG, ...c };
   merged.slots = DEFAULT_CONFIG.slots.map((d, i) => ({ ...d, ...(c.slots && c.slots[i]) }));
   merged.slots = merged.slots.map(s => ({ ...s, ...parseChannel(s.channel, s.platform) }));
   return merged;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}
let config;
let saveTimer = null;
function saveConfig() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(CONFIG_PATH(), JSON.stringify(config, null, 2)); } catch (e) { console.error(e); }
  }, 300);
}

// ---------- Utilidades ----------
function isStreamUrl(u) {
  try {
    const h = new URL(u).hostname;
    return STREAM_HOSTS.some(d => h === d || h.endsWith('.' + d));
  } catch { return false; }
}
// Aceita "nome", "twitch.tv/nome" ou "kick.com/nome". Um link define a plataforma sozinho.
function parseChannel(s, platform) {
  s = String(s || '').trim();
  let m = s.match(/twitch\.tv\/(?:popout\/)?([A-Za-z0-9_]{2,25})/i);
  if (m) return { platform: 'twitch', channel: m[1].toLowerCase() };
  m = s.match(/kick\.com\/(?:popout\/)?([A-Za-z0-9_-]{2,30})/i);
  if (m) return { platform: 'kick', channel: m[1].toLowerCase() };
  const p = PLATFORMS.includes(platform) ? platform : 'twitch';
  const re = p === 'kick' ? /[^A-Za-z0-9_-]/g : /[^A-Za-z0-9_]/g;
  return { platform: p, channel: s.replace(re, '').slice(0, 30).toLowerCase() };
}

// ---------- Segurança de todo conteúdo web (webviews e popups) ----------
app.on('web-contents-created', (_e, wc) => {
  // Webviews: só a página do app pode criá-las, sempre sem Node e na sessão da Twitch.
  wc.on('will-attach-webview', (_ev, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.preload = path.join(__dirname, 'webview-preload.js');
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.backgroundThrottling = false;
    webPreferences.partition = PARTITION;
    params.partition = PARTITION;
    if (!isStreamUrl(params.src)) _ev.preventDefault();
  });

  if (wc.getType() === 'webview' || wc.getType() === 'window') {
    wc.setWindowOpenHandler(({ url }) => {
      if (/\/login|passport\./i.test(url) && /twitch\.tv/i.test(url)) { openLogin('twitch'); return { action: 'deny' }; }
      if (/^https?:/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    wc.on('will-navigate', (e, url) => {
      if (url.startsWith('file:')) return; // a própria página do app
      if (!isStreamUrl(url)) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
    });
  }
});

// ---------- Janelas ----------
let win = null;
let loginWin = null;

function openLogin(platform) {
  if (loginWin && !loginWin.isDestroyed()) { loginWin.close(); }
  const kick = platform === 'kick';
  loginWin = new BrowserWindow({
    width: kick ? 1100 : 520, height: 800,
    title: kick ? 'Entrar na Kick — clique em "Entrar/Log In" e, depois de entrar, feche esta janela' : 'Entrar na Twitch',
    autoHideMenuBar: true, parent: win, backgroundColor: '#0e0e10',
    webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false }
  });
  loginWin.on('page-title-updated', e => e.preventDefault());
  if (kick) {
    // A Kick faz o login numa janelinha dentro do próprio site: você fecha quando terminar.
    loginWin.loadURL('https://kick.com/');
  } else {
    loginWin.loadURL('https://www.twitch.tv/login');
    loginWin.webContents.on('did-navigate', (_e, url) => {
      if (!/\/login|passport\./i.test(url)) setTimeout(() => loginWin && !loginWin.isDestroyed() && loginWin.close(), 800);
    });
  }
  loginWin.on('closed', async () => {
    loginWin = null;
    send('login', await checkLogin());
    send('reload-all');
  });
}

// Quem está logado em cada site (pelos cookies da sessão; nada é enviado para fora).
async function checkLogin() {
  const ses = session.fromPartition(PARTITION);
  const out = { twitch: null, kick: false };
  try {
    const c = await ses.cookies.get({ domain: 'twitch.tv', name: 'login' });
    if (c.length && c[0].value) out.twitch = c[0].value;
  } catch {}
  try {
    const c = await ses.cookies.get({ domain: 'kick.com' });
    out.kick = c.some(x => /session_token|kick_session/i.test(x.name) && x.value && x.value.length > 20);
  } catch {}
  return out;
}

function send(ch, data) {
  if (win && !win.isDestroyed()) win.webContents.send(ch, data);
}

function createWindow() {
  const saved = config.window;
  let bounds = saved && saved.bounds;
  // Só usa a posição salva se ainda cair dentro de algum monitor.
  if (bounds) {
    const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
    const inside = screen.getAllDisplays().some(d => cx >= d.bounds.x && cx <= d.bounds.x + d.bounds.width && cy >= d.bounds.y && cy <= d.bounds.y + d.bounds.height);
    if (!inside) bounds = null;
  }

  win = new BrowserWindow({
    ...(bounds || { width: 1600, height: 900 }),
    minWidth: 900, minHeight: 600,
       title: 'PokeStreams', backgroundColor: '#0d1117', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      backgroundThrottling: false
    }
  });
  if (saved && saved.maximized) win.maximize();
  if (saved && saved.fullscreen) win.setFullScreen(true);

  win.loadFile(path.join(__dirname, 'index.html'));

  const remember = () => {
    if (!win || win.isDestroyed()) return;
    config.window = {
      bounds: (win.isMaximized() || win.isFullScreen()) ? (config.window && config.window.bounds) || win.getNormalBounds() : win.getBounds(),
      maximized: win.isMaximized(),
      fullscreen: win.isFullScreen()
    };
    saveConfig();
  };
  ['moved', 'resized', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach(ev => win.on(ev, remember));

  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.on('closed', () => { win = null; app.quit(); });
}

// ---------- IPC ----------
ipcMain.handle('get-state', async () => ({ config, user: await checkLogin() }));
ipcMain.handle('set-slot', (_e, i, data) => {
  const slot = config.slots[i];
  if (!slot) return config;
    if ('platform' in data && PLATFORMS.includes(data.platform)) slot.platform = data.platform;
  if ('channel' in data) {
    const r = parseChannel(data.channel, slot.platform);
    slot.platform = r.platform;
    slot.channel = r.channel;
  }
  if ('enabled' in data) slot.enabled = !!data.enabled;
  if ('chat' in data) slot.chat = !!data.chat;
  saveConfig();
  return config;
});
ipcMain.handle('set-option', (_e, key, value) => {
  if (!(key in DEFAULT_CONFIG) || key === 'slots' || key === 'window') return config;
  if (key === 'volume') value = Math.min(1, Math.max(0, Number(value) || 0));
  if (key === 'chatWidth') value = Math.min(500, Math.max(200, parseInt(value, 10) || 260));
  if (key === 'autoReloadMin') value = Math.max(0, Math.min(1440, parseInt(value, 10) || 0));
  if (key === 'quality' && !['160p30', '360p30', '480p30', '720p30', '720p60', 'chunked'].includes(value)) return config;
  if (key === 'layout' && !['centro', '3-2', '2-3'].includes(value)) return config;
  config[key] = value;
  saveConfig();
  return config;
});
ipcMain.handle('login', (_e, platform) => { openLogin(platform === 'kick' ? 'kick' : 'twitch'); return true; });
ipcMain.handle('logout', async () => {
  await session.fromPartition(PARTITION).clearStorageData();
  send('login', { twitch: null, kick: false });
  send('reload-all');
  return true;
});
ipcMain.handle('toggle-fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); return true; });
ipcMain.handle('open-external', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return true; });

// ---------- Inicialização ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

  app.whenReady().then(() => {
    config = loadConfig();
    // Bloqueia câmera, microfone, localização, notificações etc.
    session.fromPartition(PARTITION).setPermissionRequestHandler((_wc, perm, cb) =>
      cb(['fullscreen', 'clipboard-sanitized-write'].includes(perm)));
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
