/* Watch Live — Cloudflare Stream embed */
(function () {
  'use strict';

  // Cloudflare Stream config
  // CUSTOMER_CODE: the "xxxx" in customer-xxxx.cloudflarestream.com
  // LIVE_INPUT_ID: plays the live broadcast while it is on air
  // RECORDING_ID:  set after the wedding to the recording's video ID so it plays on demand
  const CUSTOMER_CODE = '0plszfdakt07dwjq';
  const LIVE_INPUT_ID = 'c7c1bf587282e31d584691b2973bca7d';
  const RECORDING_ID  = '';

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
  if (!section || !player || !CUSTOMER_CODE) return;

  section.style.display = '';
  if (navItem) navItem.style.display = '';

  const videoId = RECORDING_ID || LIVE_INPUT_ID;
  const iframe = document.createElement('iframe');
  iframe.src = `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${videoId}/iframe?letterboxColor=transparent`;
  iframe.title = 'Frankie & Rodrigo Live';
  iframe.loading = 'lazy';
  iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;';
  iframe.allowFullscreen = true;
  player.appendChild(iframe);
})();
