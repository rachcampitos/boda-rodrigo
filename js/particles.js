/* ======================================================
   PARTICLES — Golden floating dust via DOM + CSS
   ====================================================== */
const Particles = (() => {
  const container = document.getElementById('particles');
  if (!container) return { init() {}, destroy() {} };

  let intervalId = null;
  const MAX = 40;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function spawn() {
    if (container.children.length >= MAX) return;

    const p = document.createElement('div');
    const size = 2 + Math.random() * 3;
    const x = Math.random() * 100;
    const drift = -30 + Math.random() * 60;
    const duration = 8 + Math.random() * 12;
    const delay = Math.random() * 2;

    p.style.cssText = `
      position: absolute;
      bottom: -10px;
      left: ${x}%;
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, rgba(212,168,83,0.9), rgba(212,168,83,0));
      border-radius: 50%;
      pointer-events: none;
      --drift: ${drift}px;
      animation: floatUp ${duration}s ${delay}s ease-out forwards;
    `;

    container.appendChild(p);

    // Remove after animation completes
    setTimeout(() => {
      if (p.parentNode) p.remove();
    }, (duration + delay) * 1000);
  }

  function init() {
    if (reducedMotion) return;

    const isMobile = window.innerWidth < 768;
    const interval = isMobile ? 600 : 300;
    intervalId = setInterval(spawn, interval);

    // Pause spawning when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
      } else {
        if (!intervalId) intervalId = setInterval(spawn, interval);
      }
    });
  }

  function destroy() {
    if (intervalId) clearInterval(intervalId);
  }

  return { init, destroy };
})();
