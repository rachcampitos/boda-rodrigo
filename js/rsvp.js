/* ======================================================
   RSVP — Form logic, validation, API submission, celebrations
   ====================================================== */
const RSVP = (() => {
  const form = document.getElementById('rsvp-form');
  if (!form) return { init() {} };

  // API URL — change this to your Railway backend URL in production
  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api/rsvp'
    : '/api/rsvp'; // Update this with your Railway URL

  const submitBtn = document.getElementById('rsvp-submit');
  const submitText = form.querySelector('.rsvp-submit-text');
  const submitLoading = form.querySelector('.rsvp-submit-loading');
  const successDiv = document.getElementById('rsvp-success');
  const successMsg = document.getElementById('rsvp-success-msg');
  const celebration = document.getElementById('rsvp-celebration');

  function init() {
    initAttendanceSparkle();
    initInputSparkles();
    initFormSubmit();
  }

  // Sparkle burst when selecting "Joyfully Accept"
  function initAttendanceSparkle() {
    const radios = form.querySelectorAll('input[name="attendance"]');
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'accept' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const card = radio.closest('.rsvp-choice').querySelector('.rsvp-choice-card');
          burstSparkles(card);
        }
      });
    });
  }

  // Sparkles while typing in inputs
  function initInputSparkles() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const inputs = form.querySelectorAll('input[type="text"]');
    let lastSparkle = 0;

    inputs.forEach(input => {
      input.addEventListener('input', () => {
        const now = Date.now();
        if (now - lastSparkle < 80) return; // throttle
        lastSparkle = now;

        // Estimate cursor position using a hidden measurer
        const rect = input.getBoundingClientRect();
        const style = window.getComputedStyle(input);
        const measurer = document.createElement('span');
        measurer.style.cssText = `
          position:absolute; visibility:hidden; white-space:pre;
          font:${style.font}; letter-spacing:${style.letterSpacing};
          padding-left:${style.paddingLeft};
        `;
        measurer.textContent = input.value.substring(0, input.selectionEnd || input.value.length);
        document.body.appendChild(measurer);
        const textWidth = Math.min(measurer.offsetWidth, rect.width - 20);
        measurer.remove();

        const cx = rect.left + textWidth + 2;
        const cy = rect.top + rect.height / 2;

        // Spawn 2-3 tiny sparkles
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const s = document.createElement('div');
          const size = 2 + Math.random() * 2.5;
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
          const dist = 10 + Math.random() * 18;
          const dur = 400 + Math.random() * 300;

          s.style.cssText = `
            position:fixed; left:${cx}px; top:${cy}px;
            width:${size}px; height:${size}px;
            background:radial-gradient(circle, rgba(212,168,83,0.9), transparent);
            border-radius:50%; pointer-events:none; z-index:200;
            transition: transform ${dur}ms ease-out, opacity ${dur}ms ease-out;
          `;
          document.body.appendChild(s);

          requestAnimationFrame(() => {
            s.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`;
            s.style.opacity = '0';
          });

          setTimeout(() => s.remove(), dur + 50);
        }
      });
    });
  }

  // Form submission
  function initFormSubmit() {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const name = form.querySelector('#rsvp-name').value.trim();
      const attendance = form.querySelector('input[name="attendance"]:checked');

      let valid = true;

      if (!name) {
        showError('rsvp-name', 'Please enter your name');
        valid = false;
      }

      if (!attendance) {
        showAttendanceError('Please select your attendance');
        valid = false;
      }

      if (!valid) return;

      const data = {
        name,
        attendance: attendance.value,
      };

      // Show loading
      submitText.style.display = 'none';
      submitLoading.style.display = '';
      submitBtn.disabled = true;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Something went wrong');
        }

        // Success!
        form.style.display = 'none';
        successDiv.style.display = '';

        if (data.attendance === 'accept') {
          successMsg.textContent = `Thank you, ${name}! We can't wait to celebrate with you.`;
          launchCelebration();
        } else {
          successMsg.textContent = `Thank you, ${name}. We'll miss you, but we appreciate you letting us know.`;
        }

      } catch (err) {
        submitText.style.display = '';
        submitLoading.style.display = 'none';
        submitBtn.disabled = false;
        const msg = err.name === 'AbortError'
          ? 'Request timed out. Please check your connection and try again.'
          : (err.message || 'Failed to submit. Please try again.');
        showError('rsvp-name', msg);
      }
    });
  }

  // Validation helpers
  function showError(fieldId, msg) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const wrapper = field.closest('.rsvp-field');
    wrapper.classList.add('rsvp-field-error');
    const errEl = document.createElement('p');
    errEl.className = 'rsvp-error-msg';
    errEl.textContent = msg;
    wrapper.appendChild(errEl);
  }

  function showAttendanceError(msg) {
    const attendance = form.querySelector('.rsvp-attendance');
    if (!attendance) return;
    const wrapper = attendance.closest('.rsvp-field');
    wrapper.classList.add('rsvp-field-error');
    const errEl = document.createElement('p');
    errEl.className = 'rsvp-error-msg';
    errEl.textContent = msg;
    wrapper.appendChild(errEl);
  }

  function clearErrors() {
    form.querySelectorAll('.rsvp-field-error').forEach(f => f.classList.remove('rsvp-field-error'));
    form.querySelectorAll('.rsvp-error-msg').forEach(e => e.remove());
  }

  // Mini sparkle burst on the accept card
  function burstSparkles(el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('div');
      const angle = (i / 8) * Math.PI * 2;
      const dist = 30 + Math.random() * 30;
      const size = 3 + Math.random() * 3;

      spark.style.cssText = `
        position: fixed;
        left: ${cx}px;
        top: ${cy}px;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, #D4A853, transparent);
        border-radius: 50%;
        pointer-events: none;
        z-index: 200;
        transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      `;
      document.body.appendChild(spark);

      requestAnimationFrame(() => {
        spark.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`;
        spark.style.opacity = '0';
      });

      setTimeout(() => spark.remove(), 700);
    }
  }

  // Full-screen celebration on successful accept
  function launchCelebration() {
    if (!celebration || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colors = ['#D4A853', '#C4956A', '#8B7BB8', '#a99ad4', '#d4ad85', '#fff'];
    const count = 60;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'celebration-particle';
      const size = 4 + Math.random() * 8;
      const x = Math.random() * window.innerWidth;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = Math.random() * 800;
      const duration = 1500 + Math.random() * 2000;
      const drift = -100 + Math.random() * 200;
      const spin = Math.random() * 720 - 360;
      const isStar = Math.random() > 0.6;

      p.style.cssText = `
        left: ${x}px;
        top: -${size}px;
        width: ${size}px;
        height: ${size}px;
        background: ${isStar ? 'transparent' : color};
        ${isStar ? `
          background: transparent;
          width: 0; height: 0;
          border-left: ${size/2}px solid transparent;
          border-right: ${size/2}px solid transparent;
          border-bottom: ${size}px solid ${color};
          border-radius: 0;
        ` : ''}
        opacity: 1;
        transition: transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                    opacity ${duration * 0.4}ms ease ${duration * 0.6}ms;
      `;

      celebration.appendChild(p);

      setTimeout(() => {
        p.style.transform = `translateY(${window.innerHeight + 100}px) translateX(${drift}px) rotate(${spin}deg)`;
        p.style.opacity = '0';
      }, delay);

      setTimeout(() => p.remove(), delay + duration + 200);
    }
  }

  return { init };
})();
