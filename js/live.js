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
    if (signature === chatSignature) return;
    chatSignature = signature;
    if (!messages.length) return;
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
