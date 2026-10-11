// Roda dentro de cada player/chat ANTES dos scripts da Twitch.
// Não automatiza nada: só ajusta preferências (qualidade, volume, tema escuro)
// e avisa o app se a live está no ar.
const { ipcRenderer } = require('electron');

const qs = new URLSearchParams(location.search);
const QUALITY = qs.get('ps_q');
const VOLUME = qs.get('ps_v');

try {
  if (QUALITY) localStorage.setItem('video-quality', JSON.stringify({ default: QUALITY }));
  if (VOLUME != null) {
    localStorage.setItem('volume', String(VOLUME));
    localStorage.setItem('video-muted', JSON.stringify({ default: false })); // mudo pode não contar
  }
  localStorage.setItem('mature', 'true');            // pula o aviso de conteúdo adulto
  localStorage.setItem('twilight.theme', '1');       // chat no tema escuro
} catch (e) { /* sem storage: segue o padrão da Twitch */ }

// Kick: o player não lê volume do localStorage e restaura o volume dele logo depois
// de começar. Então o app segura o volume escolhido nos primeiros 30 s de cada vídeo.
if (location.hostname === 'player.kick.com') {
  let last = '';
  const firstSeen = new WeakMap();
  const target = VOLUME != null ? Math.min(1, Math.max(0, Number(VOLUME))) : null;
  setInterval(() => {
    const v = document.querySelector('video');
    if (v && target != null) {
      if (!firstSeen.has(v)) firstSeen.set(v, Date.now());
      if (Date.now() - firstSeen.get(v) < 30000) {
        try {
          if (v.muted) v.muted = false;
          if (Math.abs(v.volume - target) > 0.005) v.volume = target;
        } catch (e) {}
      }
    }
    const txt = document.body ? document.body.innerText.slice(0, 400) : '';
    const offline = /offline|não está ao vivo|not live/i.test(txt);
    const state = v && !v.paused && v.readyState >= 2 ? 'live' : (offline ? 'offline' : 'loading');
    if (state !== last) { last = state; ipcRenderer.sendToHost('status', state); }
  }, 1000);
}
if (location.hostname === 'player.twitch.tv') {
  let last = '';
  setInterval(() => {
    const v = document.querySelector('video');
    const offline = !!document.querySelector('.offline-embeds, [data-a-target="player-state-offline"]') ||
      /is offline|está offline/i.test(document.body ? document.body.innerText.slice(0, 400) : '');
    const state = v && !v.paused && v.readyState >= 2 ? 'live' : (offline ? 'offline' : 'loading');
    if (state !== last) { last = state; ipcRenderer.sendToHost('status', state); }
  }, 3000);
}
