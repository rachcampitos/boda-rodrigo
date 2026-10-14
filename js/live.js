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
})();
