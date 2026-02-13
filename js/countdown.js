/* ======================================================
   COUNTDOWN — Timer to October 15, 2026 at 5:00 PM ET
   ====================================================== */
const Countdown = (() => {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');

  if (!daysEl) return { init() {} };

  // Oct 15, 2026 5:00 PM Eastern Time
  // Using UTC offset: EDT is UTC-4
  const weddingDate = new Date('2026-10-15T17:00:00-04:00');
  let intervalId = null;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function updateEl(el, value) {
    const str = typeof value === 'number' && value < 100 ? pad(value) : String(value);
    if (el.textContent !== str) {
      el.textContent = str;
      // Pulse animation on change
      el.classList.remove('tick');
      // Force reflow
      void el.offsetWidth;
      el.classList.add('tick');
    }
  }

  function update() {
    const now = new Date();
    const diff = weddingDate - now;

    if (diff <= 0) {
      updateEl(daysEl, '0');
      updateEl(hoursEl, '00');
      updateEl(minutesEl, '00');
      updateEl(secondsEl, '00');
      if (intervalId) clearInterval(intervalId);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    updateEl(daysEl, days);
    updateEl(hoursEl, hours);
    updateEl(minutesEl, minutes);
    updateEl(secondsEl, seconds);
  }

  function init() {
    update();
    intervalId = setInterval(update, 1000);
  }

  return { init };
})();
