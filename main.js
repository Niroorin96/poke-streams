// PokeStreams — uma janela só com até 5 lives da Twitch em grade (estilo PokeGrid).
// Cada quadro = <webview> do player + <webview> do chat, todos na MESMA sessão
// (persist:twitch), para você entrar na Twitch uma vez só.
const { app, BrowserWindow, ipcMain, screen, shell, session, powerSaveBlocker, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const SLOTS = 5;
const PARTITION = 'persist:twitch';
const STREAM_HOSTS = [
  'twitch.tv', 'twitchcdn.net', 'ttvnw.net', 'jtvnw.net', 'twitchsvc.net', // Twitch
  'kick.com'                                                               // Kick
];
const PLATFORMS = ['twitch', 'kick'];
// Quadro oculto que só checa se uma live guardada está no ar: partição só em memória
// (sem "persist:"), então não usa a sua conta nem mexe nas preferências dos quadros.
const PROBE_PARTITION = 'probe';
const MAX_SAVED = 60;

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
  layout: 'centro',     // 'centro' (1 no meio + 4 nos cantos) | '3-2' | '2-3' | 'auto' (16:9, sem tarjas)
  quality: '160p30',
  volume: 0.05,         // volume baixo em vez de mudo
  chatWidth: 260,
  autoReloadMin: 0,
  keepAwake: true,      // impede o PC de suspender (a tela pode apagar)
  probeSaved: true,     // checa sozinho as lives guardadas quando algum quadro cai
  saved: [],            // lives guardadas: { platform, channel, fav, added, lastSeenLive, lastStatus, lastChecked }
  window: null          // { bounds, maximized, fullscreen }
};

function loadConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8'));
       const merged = { ...DEFAULT_CONFIG, ...c };
   merged.slots = DEFAULT_CONFIG.slots.map((d, i) => ({ ...d, ...(c.slots && c.slots[i]) }));
   merged.slots = merged.slots.map(s => ({ ...s, ...parseChannel(s.channel, s.platform) }));
   merged.saved = cleanSaved(merged.saved);
   merged.keepAwake = merged.keepAwake !== false;
   merged.probeSaved = merged.probeSaved !== false;
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

// ---------- Lives guardadas ----------
function cleanSaved(list) {
  const out = [], seen = new Set();
  (Array.isArray(list) ? list : []).forEach(e => {
    if (!e || typeof e !== 'object') return;
    const r = parseChannel(e.channel, e.platform);
    const key = r.platform + ':' + r.channel;
    if (!r.channel || seen.has(key)) return;
    seen.add(key);
    out.push({
      platform: r.platform, channel: r.channel,
      fav: !!e.fav,
      added: Number(e.added) || Date.now(),
      lastSeenLive: Number(e.lastSeenLive) || 0,
      lastStatus: e.lastStatus === 'live' || e.lastStatus === 'offline' ? e.lastStatus : null,
      lastChecked: Number(e.lastChecked) || 0
    });
  });
  return out;
}
function findSaved(platform, channel) {
  return config.saved.find(e => e.platform === platform && e.channel === channel);
}
// Toda live que entra num quadro vai para a lista. Passou de MAX_SAVED, sai a mais antiga que não é favorita.
function upsertSaved(platform, channel) {
  if (!channel) return;
  if (findSaved(platform, channel)) return;
  config.saved.push({ platform, channel, fav: false, added: Date.now(), lastSeenLive: 0, lastStatus: null, lastChecked: 0 });
  while (config.saved.length > MAX_SAVED) {
    let idx = -1, oldest = Infinity;
    config.saved.forEach((e, i) => {
      const t = Math.max(e.lastSeenLive, e.added);
      if (!e.fav && t < oldest) { oldest = t; idx = i; }
    });
    if (idx < 0) break;
    config.saved.splice(idx, 1);
  }
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
    const probe = params.partition === PROBE_PARTITION;   // só o quadro oculto de checagem usa a partição própria
    webPreferences.partition = probe ? PROBE_PARTITION : PARTITION;
    params.partition = probe ? PROBE_PARTITION : PARTITION;
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
  if (slot.channel) upsertSaved(slot.platform, slot.channel);
  saveConfig();
  return config;
});
ipcMain.handle('set-option', (_e, key, value) => {
  if (!(key in DEFAULT_CONFIG) || key === 'slots' || key === 'window' || key === 'saved') return config;
  if (key === 'volume') value = Math.min(1, Math.max(0, Number(value) || 0));
  if (key === 'chatWidth') value = Math.min(500, Math.max(200, parseInt(value, 10) || 260));
  if (key === 'autoReloadMin') value = Math.max(0, Math.min(1440, parseInt(value, 10) || 0));
  if (key === 'quality' && !['160p30', '360p30', '480p30', '720p30', '720p60', 'chunked'].includes(value)) return config;
  if (key === 'layout' && !['centro', '3-2', '2-3', 'auto'].includes(value)) return config;
  if (key === 'keepAwake' || key === 'probeSaved') value = !!value;
  config[key] = value;
  if (key === 'keepAwake') applyKeepAwake();
  saveConfig();
  return config;
});

// ---------- Lives guardadas: status, favoritos, remover ----------
// status: 'live' | 'offline' | 'unknown' (a checagem não conseguiu decidir). Só atualiza o que já está guardado.
ipcMain.handle('report-status', (_e, platform, channel, status) => {
  if (!['live', 'offline', 'unknown'].includes(status)) return config;
  const r = parseChannel(channel, platform);
  const e = r.channel && findSaved(r.platform, r.channel);
  if (!e) return config;
  const now = Date.now();
  e.lastChecked = now;
  if (status === 'live') { e.lastStatus = 'live'; e.lastSeenLive = now; }
  else if (status === 'offline') e.lastStatus = 'offline';
  saveConfig();
  return config;
});
ipcMain.handle('saved-fav', (_e, platform, channel, fav) => {
  const r = parseChannel(channel, platform);
  const e = r.channel && findSaved(r.platform, r.channel);
  if (e) { e.fav = !!fav; saveConfig(); }
  return config;
});
ipcMain.handle('saved-remove', (_e, platform, channel) => {
  const r = parseChannel(channel, platform);
  config.saved = config.saved.filter(x => !(x.platform === r.platform && x.channel === r.channel));
  saveConfig();
  return config;
});

// ---------- Selo vermelho quando uma live cai ----------
let offlineCount = 0;
let dotImage = null;
// Bolinha vermelha com borda branca, desenhada aqui mesmo (BGRA), sem arquivo de imagem.
function redDot() {
  if (dotImage) return dotImage;
  const S = 32, buf = Buffer.alloc(S * S * 4), c = (S - 1) / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - c, y - c), o = (y * S + x) * 4;
    const a = Math.max(0, Math.min(1, 14.5 - d));        // contorno externo (borda branca)
    const red = Math.max(0, Math.min(1, 11.5 - d));      // miolo vermelho
    const mix = (white, col) => Math.round((white * (1 - red) + col * red) * a);
    buf[o] = mix(255, 0x1c); buf[o + 1] = mix(255, 0x26); buf[o + 2] = mix(255, 0xe5); buf[o + 3] = Math.round(255 * a);
  }
  dotImage = nativeImage.createFromBitmap(buf, { width: S, height: S, scaleFactor: 2 });
  return dotImage;
}
function applyBadge() {
  if (!win || win.isDestroyed()) return;
  try {
    if (process.platform === 'win32') win.setOverlayIcon(offlineCount > 0 ? redDot() : null, offlineCount > 0 ? offlineCount + ' live(s) offline' : '');
    else if (process.platform === 'darwin') app.dock.setBadge(offlineCount > 0 ? String(offlineCount) : '');
    else app.setBadgeCount(offlineCount);
  } catch (e) { console.error(e); }
}
ipcMain.handle('set-badge', (_e, n) => {
  n = Math.max(0, Math.min(99, parseInt(n, 10) || 0));
  if (n > offlineCount && win && !win.isDestroyed() && !win.isFocused()) win.flashFrame(true); // pisca na barra de tarefas até você voltar
  offlineCount = n;
  applyBadge();
  return true;
});

// ---------- Manter o PC acordado ----------
// 'prevent-app-suspension' impede o PC de suspender, mas deixa a tela apagar.
let awakeId = null;
function applyKeepAwake() {
  const want = config.keepAwake !== false;
  if (want && awakeId === null) awakeId = powerSaveBlocker.start('prevent-app-suspension');
  if (!want && awakeId !== null) { powerSaveBlocker.stop(awakeId); awakeId = null; }
}
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
    config.slots.forEach(s => upsertSaved(s.platform, s.channel));
    // Bloqueia câmera, microfone, localização, notificações etc.
    session.fromPartition(PARTITION).setPermissionRequestHandler((_wc, perm, cb) =>
      cb(['fullscreen', 'clipboard-sanitized-write'].includes(perm)));
    session.fromPartition(PROBE_PARTITION).setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    applyKeepAwake();
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
