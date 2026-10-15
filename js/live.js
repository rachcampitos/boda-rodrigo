/* Watch Live — Cloudflare Stream embed */
(function () {
  'use strict';

  // Cloudflare Stream config
  // CUSTOMER_CODE: the "xxxx" in customer-xxxx.cloudflarestream.com
  // LIVE_INPUT_ID: plays the live broadcast while it is on air
  // Once the broadcast ends, the backend (/api/live) lists the wedding recordings and the player switches to them
  const CUSTOMER_CODE = '0plszfdakt07dwjq';
  const LIVE_INPUT_ID = 'c7c1bf587282e31d584691b2973bca7d';

  const API_BASE = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
    ? 'http://localhost:3001/api'
    : 'https://boda-rodrigo-production.up.railway.app/api';

  // Section is hidden by default — activate via ?preview=live (persists in localStorage)
  const PREVIEW_KEY = 'live_preview';
  try {
    if (new URLSearchParams(window.location.search).get('preview') === 'live') {
      localStorage.setItem(PREVIEW_KEY, '1');
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
    if (!localStorage.getItem(PREVIEW_KEY)) return;
  } catch (e) {
    return;
  }

  const section = document.getElementById('live');
  const navItem = document.getElementById('nav-live');
  const player  = document.getElementById('live-player');
  const parts   = document.getElementById('live-parts');
  if (!section || !player) return;

  section.style.display = '';
  if (navItem) navItem.style.display = '';

  let currentVideo = null;
  let recordings = [];

  function show(videoId) {
    if (videoId !== currentVideo) {
      currentVideo = videoId;
      const iframe = document.createElement('iframe');
      iframe.src = `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${videoId}/iframe?letterboxColor=transparent`;
      iframe.title = 'Frankie & Rodrigo Live';
      iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;';
      iframe.allowFullscreen = true;
      player.replaceChildren(iframe);
    }
    renderParts();
  }

  // If the broadcast was interrupted there are several recordings: let guests pick each part
  function renderParts() {
    if (!parts) return;
    parts.replaceChildren();
    if (currentVideo === LIVE_INPUT_ID || recordings.length < 2) return;
    const label = window.currentLang === 'es' ? 'Parte' : 'Part';
    recordings.forEach((rec, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'live-part' + (rec.id === currentVideo ? ' active' : '');
      btn.textContent = `${label} ${i + 1}`;
      btn.addEventListener('click', () => show(rec.id));
      parts.appendChild(btn);
    });
  }

  async function refresh() {
    try {
      const res = await fetch(`${API_BASE}/live`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      recordings = data.recordings || [];
      if (data.live || !recordings.length) {
        show(LIVE_INPUT_ID);
      } else {
        // Keep the part the guest is watching; otherwise start from the first one
        const watching = recordings.some(r => r.id === currentVideo);
        show(watching ? currentVideo : recordings[0].id);
      }
    } catch (e) {
      if (!currentVideo) show(LIVE_INPUT_ID);
    }
  }

  refresh();
  setInterval(refresh, 30000);

  // ── Chat: guests leave messages for the couple while they watch ──
  const chatList = document.getElementById('live-chat-list');
  const chatForm = document.getElementById('live-chat-form');
  const chatName = document.getElementById('live-chat-name');
  const chatText = document.getElementById('live-chat-text');
  const NAME_KEY = 'live_chat_name';
  let chatSignature = '';

  try { chatName.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) {}

  // Same name always gets the same color, from tones that match the site
  const NAME_COLORS = ['#C4956A', '#a99ad4', '#D4A853', '#7fb7a4', '#e0a3b5', '#8fb3e0', '#d9b38c', '#b9a3e8', '#e3c06f', '#9fcfbf'];
  function nameColor(name) {
    let h = 0;
    for (const ch of name.toLowerCase()) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return NAME_COLORS[h % NAME_COLORS.length];
  }

  function renderChat(messages) {
    const signature = messages.map(m => m.id).join(',');
    if (signature === chatSignature) return renderOverlay(messages);
    chatSignature = signature;
    if (!messages.length) {
      const empty = document.createElement('p');
      empty.className = 'live-chat-empty';
      empty.dataset.i18n = 'live.chat.empty';
      empty.textContent = window.currentLang === 'es' ? 'Sea el primero en dejar un mensaje' : 'Be the first to leave a message';
      chatList.replaceChildren(empty);
      return renderOverlay(messages);
    }
    const nearBottom = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 60;
    chatList.replaceChildren(...messages.map(m => {
      const row = document.createElement('p');
      row.className = 'live-chat-msg';
      const name = document.createElement('strong');
      name.textContent = m.name;
      name.style.color = nameColor(m.name);
      const time = document.createElement('time');
      time.textContent = new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      row.append(name, document.createTextNode(m.text), time);
      return row;
    }));
    if (nearBottom || !chatList.dataset.loaded) chatList.scrollTop = chatList.scrollHeight;
    chatList.dataset.loaded = '1';
    renderOverlay(messages);
  }

  // ── TV mode: video full screen with the newest messages on top, like streamers do ──
  const frame = document.querySelector('#live .live-frame');
  const overlay = document.createElement('div');
  overlay.className = 'live-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const OVERLAY_MAX = 4;
  const OVERLAY_SECONDS = 60;
  const firstSeen = new Map();
  let firstLoad = true;

  // Messages fade out a minute after they show up on this screen; older ones never appear
  function renderOverlay(messages) {
    const now = Date.now();
    messages.forEach(m => {
      if (!firstSeen.has(m.id)) firstSeen.set(m.id, firstLoad ? 0 : now);
    });
    firstLoad = false;
    const fresh = messages
      .filter(m => now - firstSeen.get(m.id) < OVERLAY_SECONDS * 1000)
      .slice(-OVERLAY_MAX);
    // Reuse each message's node so the fade-out transition can play
    const nodes = new Map([...overlay.children].map(n => [n.dataset.id, n]));
    overlay.replaceChildren(...fresh.map(m => {
      let row = nodes.get(String(m.id));
      if (!row) {
        row = document.createElement('p');
        row.className = 'live-overlay-msg';
        row.dataset.id = m.id;
        const name = document.createElement('strong');
        name.textContent = m.name;
        name.style.color = nameColor(m.name);
        row.append(name, document.createTextNode(m.text));
      }
      // Fade out smoothly over the last seconds instead of vanishing at once
      row.classList.toggle('fading', now - firstSeen.get(m.id) > (OVERLAY_SECONDS - 5) * 1000);
      return row;
    }));
  }

  if (frame) {
    frame.appendChild(overlay);

    const tvBtn = document.createElement('button');
    tvBtn.type = 'button';
    tvBtn.className = 'live-tv-btn';
    const tvClose = document.createElement('button');
    tvClose.type = 'button';
    tvClose.className = 'live-tv-close';
    tvClose.innerHTML = '&#10005;';
    frame.appendChild(tvClose);
    const tvToggle = document.createElement('button');
    tvToggle.type = 'button';
    tvToggle.className = 'live-tv-toggle';
    frame.appendChild(tvToggle);
    const tvHint = document.createElement('p');
    tvHint.className = 'live-tv-hint';
    frame.insertAdjacentElement('afterend', tvHint);
    frame.insertAdjacentElement('afterend', tvBtn);

    // Some people will want only the video during the vows: remember their choice
    const QUIET_KEY = 'live_tv_quiet';
    try { if (localStorage.getItem(QUIET_KEY)) frame.classList.add('live-tv-quiet'); } catch (e) {}
    tvToggle.addEventListener('click', () => {
      const quiet = frame.classList.toggle('live-tv-quiet');
      try { quiet ? localStorage.setItem(QUIET_KEY, '1') : localStorage.removeItem(QUIET_KEY); } catch (e) {}
      labelTvBtn();
    });

    function labelTvBtn() {
      tvBtn.textContent = window.currentLang === 'es'
        ? 'Pantalla completa con mensajes'
        : 'Full screen with messages';
      tvClose.setAttribute('aria-label', window.currentLang === 'es' ? 'Salir de pantalla completa' : 'Exit full screen');
      const quiet = frame.classList.contains('live-tv-quiet');
      tvToggle.textContent = window.currentLang === 'es'
        ? (quiet ? 'Mostrar mensajes' : 'Ocultar mensajes')
        : (quiet ? 'Show messages' : 'Hide messages');
      tvHint.textContent = window.currentLang === 'es'
        ? 'Para verlo en la TV con los mensajes, use Duplicar pantalla, no el ícono de AirPlay del video.'
        : 'To watch on TV with the messages, use Screen Mirroring, not the AirPlay icon on the video.';
    }
    labelTvBtn();
    document.addEventListener('langchange', labelTvBtn);

    const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

    function exitTv() {
      frame.classList.remove('live-tv');
      document.body.classList.remove('live-tv-open');
      if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }

    // Real full screen where the browser allows it; on iPhone, a fixed layer that fills the screen
    tvBtn.addEventListener('click', () => {
      frame.classList.add('live-tv');
      document.body.classList.add('live-tv-open');
      const request = frame.requestFullscreen || frame.webkitRequestFullscreen;
      if (request) {
        try {
          const p = request.call(frame);
          if (p && p.catch) p.catch(() => {});
        } catch (e) {}
      }
      loadChat();
    });
    tvClose.addEventListener('click', exitTv);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && frame.classList.contains('live-tv')) exitTv();
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev =>
      document.addEventListener(ev, () => {
        if (!fsElement() && frame.classList.contains('live-tv')) exitTv();
      })
    );
  }

  async function loadChat() {
    try {
      const res = await fetch(`${API_BASE}/chat`);
      if (res.ok) renderChat(await res.json());
    } catch (e) {}
  }

  if (chatList && chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = chatName.value.trim();
      const text = chatText.value.trim();
      if (!name || !text) return;
      const btn = chatForm.querySelector('button');
      const oldError = chatForm.querySelector('.live-chat-error');
      if (oldError) oldError.remove();
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, text }),
        });
        if (!res.ok) throw new Error();
        try { localStorage.setItem(NAME_KEY, name); } catch (err) {}
        chatText.value = '';
        chatList.dataset.loaded = '';
        await loadChat();
      } catch (err) {
        const msg = document.createElement('p');
        msg.className = 'live-chat-error';
        msg.textContent = window.currentLang === 'es'
          ? 'No se pudo enviar, intente de nuevo'
          : 'Could not send, please try again';
        chatForm.appendChild(msg);
      } finally {
        btn.disabled = false;
      }
    });

    loadChat();
    setInterval(loadChat, 5000);
  }
})();
