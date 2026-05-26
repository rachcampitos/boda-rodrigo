/* Witnesses to Wonder — Guest Moments Gallery */
(function () {
  'use strict';

  const API_BASE = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
    ? 'http://localhost:3001/api'
    : 'https://boda-rodrigo-production.up.railway.app/api';

  // Section is hidden by default — activate via ?preview=moments (persists in localStorage)
  const PREVIEW_KEY = 'moments_preview';
  if (new URLSearchParams(window.location.search).get('preview') === 'moments') {
    localStorage.setItem(PREVIEW_KEY, '1');
    // Clean URL without reloading
    history.replaceState(null, '', window.location.pathname + window.location.hash);
  }
  if (!localStorage.getItem(PREVIEW_KEY)) return;

  const section = document.getElementById('moments');
  const navItem = document.getElementById('nav-moments');
  if (section) section.style.display = '';
  if (navItem) navItem.style.display = '';

  const container  = document.getElementById('moments-container');
  const notify     = document.getElementById('moments-notify');
  const notifyText = document.getElementById('moments-notify-text');

  if (!container) return;

  let knownIds   = new Set();
  let pendingNew = [];

  const CORNER = `<svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 2H14Q2 2 2 14V50" stroke="#C4956A" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M40 2H14Q8 2 8 10V22" stroke="#C4956A" stroke-width="0.75" stroke-linecap="round" opacity="0.5"/>
    <circle cx="2" cy="2" r="2.2" fill="#C4956A"/>
    <path d="M28 2Q28 9.5 21 7Q23 2 28 2Z" fill="#C4956A" opacity="0.55"/>
  </svg>`;

  // Deterministic rotation from last 3 hex chars of Mongo ID
  function rot(id) {
    const val = parseInt(id.slice(-3), 16) || 0;
    return (((val % 7) - 3) * 0.9).toFixed(2) + 'deg';
  }

  function makeCard(photo, animate) {
    const card = document.createElement('div');
    card.className = 'polaroid' + (animate ? ' reveal-in' : '');
    card.style.setProperty('--rot', rot(photo.id));
    card.dataset.id = photo.id;

    // Photo area with corner ornaments
    const wrap = document.createElement('div');
    wrap.className = 'polaroid-img-wrap';

    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
      const c = document.createElement('span');
      c.className = `p-corner p-corner-${pos}`;
      c.innerHTML = CORNER;
      wrap.appendChild(c);
    });

    const img = document.createElement('img');
    img.className = 'polaroid-photo';
    img.src = `${API_BASE}/photos/${photo.id}/image`;
    img.alt = photo.guestName ? `Moment by ${photo.guestName}` : 'A wedding moment';
    img.loading = 'lazy';
    img.decoding = 'async';
    wrap.appendChild(img);

    // Footer strip (white area)
    const footer = document.createElement('div');
    footer.className = 'polaroid-footer';

    const brand = document.createElement('div');
    brand.className = 'polaroid-brand';
    brand.innerHTML = 'Frankie &amp; Rodrigo <span class="polaroid-diamond">&#10022;</span> October 15, 2026';
    footer.appendChild(brand);

    if (photo.guestName) {
      const guest = document.createElement('div');
      guest.className = 'polaroid-guest';
      guest.textContent = photo.guestName;
      footer.appendChild(guest);
    }

    card.appendChild(wrap);
    card.appendChild(footer);
    return card;
  }

  function buildGrid(photos) {
    const grid = document.createElement('div');
    grid.className = 'moments-masonry';
    photos.forEach(p => grid.appendChild(makeCard(p, false)));
    return grid;
  }

  async function loadPhotos() {
    try {
      const res = await fetch(`${API_BASE}/photos/approved`);
      if (!res.ok) return;
      const photos = await res.json();

      if (!photos.length) return;

      const newOnes = photos.filter(p => !knownIds.has(p.id));

      // First load
      if (knownIds.size === 0) {
        container.innerHTML = '';
        container.appendChild(buildGrid(photos));
        photos.forEach(p => knownIds.add(p.id));
        return;
      }

      // Poll: queue new ones and show notification
      if (newOnes.length > 0) {
        pendingNew = newOnes;
        const n = newOnes.length;
        notifyText.textContent = `${n} new moment${n > 1 ? 's' : ''} added — tap to reveal`;
        notify.classList.add('visible');
      }
    } catch { /* silent — no error state during the party */ }
  }

  function flushNew() {
    if (!pendingNew.length) return;
    notify.classList.remove('visible');

    const masonry = container.querySelector('.moments-masonry');
    if (!masonry) {
      container.innerHTML = '';
      container.appendChild(buildGrid(pendingNew));
    } else {
      // Prepend new cards with animation
      pendingNew.forEach(p => {
        masonry.insertBefore(makeCard(p, true), masonry.firstChild);
      });
    }

    pendingNew.forEach(p => knownIds.add(p.id));
    pendingNew = [];
  }

  notify.addEventListener('click', flushNew);

  // Load on init, then poll every 45 seconds
  loadPhotos();
  setInterval(loadPhotos, 45000);
})();
