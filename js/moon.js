/* ======================================================
   MOON — Lunar Phase Clock
   8 phase icons arranged like a clock with progress dots.
   Shows the real astronomical lunar phase for today.
   ====================================================== */
const Moon = (() => {
  const container = document.getElementById('moon-container');
  if (!container) return { init() {} };

  function init() {
    // ---- Layout constants ----
    const CX = 130, CY = 130;        // SVG centre
    const ORBIT = 92;                 // radius of the phase ring
    const PR = 18;                    // phase-icon radius
    const DR = 3;                     // dot radius
    const DOTS = 3;                   // dots between each phase pair
    const PAD_DEG = 15;               // degrees to skip near each phase icon

    // ---- Phase metadata ----
    const PHASES = [
      'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
      'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
    ];

    // ---- Real astronomical lunar phase (0–1) ----
    const REF = new Date(Date.UTC(2000, 0, 6, 18, 14));
    const days = (new Date() - REF) / 86400000;
    const raw = (((days % 29.53059) + 29.53059) % 29.53059) / 29.53059;

    const activeIdx  = Math.floor(raw * 8) % 8;          // 0-7
    const sub        = (raw * 8) - Math.floor(raw * 8);   // 0-1 progress to next
    const litDots    = Math.floor(sub * (DOTS + 1));       // 0-3

    // ---- Position helpers ----
    function angle(idx8) { return ((idx8 * 45 - 90) * Math.PI) / 180; }

    function pos(a) {
      return { x: CX + ORBIT * Math.cos(a), y: CY + ORBIT * Math.sin(a) };
    }

    function phasePos(i) { return pos(angle(i)); }

    function dotPos(phaseI, dotI) {
      // Place dots in the safe zone between phase icons (skip PAD_DEG near each icon)
      const span = 45 - 2 * PAD_DEG;               // usable arc degrees
      const t = (dotI + 0.5) / DOTS;                // centre each dot in its slot
      const deg = phaseI * 45 + PAD_DEG + t * span; // absolute degrees
      return pos((deg - 90) * Math.PI / 180);
    }

    // ---- Phase shadow path (dark overlay for unlit portion) ----
    function shadowPath(idx, cx, cy, r) {
      const tr = r * 0.55;
      switch (idx) {
        case 0: return `M${cx},${cy-r}a${r},${r},0,1,1,0,${2*r}a${r},${r},0,1,1,0,${-2*r}Z`;
        case 1: return `M${cx},${cy-r}A${r},${r},0,0,0,${cx},${cy+r}A${tr},${r},0,0,1,${cx},${cy-r}Z`;
        case 2: return `M${cx},${cy-r}A${r},${r},0,0,0,${cx},${cy+r}L${cx},${cy-r}Z`;
        case 3: return `M${cx},${cy-r}A${r},${r},0,0,0,${cx},${cy+r}A${tr},${r},0,0,0,${cx},${cy-r}Z`;
        case 4: return '';
        case 5: return `M${cx},${cy-r}A${r},${r},0,0,1,${cx},${cy+r}A${tr},${r},0,0,1,${cx},${cy-r}Z`;
        case 6: return `M${cx},${cy-r}A${r},${r},0,0,1,${cx},${cy+r}L${cx},${cy-r}Z`;
        case 7: return `M${cx},${cy-r}A${r},${r},0,0,1,${cx},${cy+r}A${tr},${r},0,0,0,${cx},${cy-r}Z`;
        default: return '';
      }
    }

    // ---- Build SVG ----
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 260 260');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.overflow = 'visible';

    // ---- Dots ----
    let dotsHTML = '';
    for (let i = 0; i < 8; i++) {
      for (let d = 0; d < DOTS; d++) {
        const { x, y } = dotPos(i, d);
        const lit = (i === activeIdx && d < litDots);
        const xf = x.toFixed(1), yf = y.toFixed(1);

        if (lit) {
          const op = 0.5 + d * 0.15;
          // Glow halo behind the dot
          dotsHTML += `<circle cx="${xf}" cy="${yf}" r="${DR * 2.5}"
            fill="rgba(212,168,83,${op * 0.35})" filter="url(#dotGlow)"/>`;
          // Bright dot
          dotsHTML += `<circle cx="${xf}" cy="${yf}" r="${DR}" fill="#D4A853" opacity="${op}"/>`;
        } else {
          dotsHTML += `<circle cx="${xf}" cy="${yf}" r="${DR * 0.6}" fill="rgba(139,123,184,0.25)" opacity="0.15"/>`;
        }
      }
    }

    // ---- Phase icons ----
    let phasesHTML = '';
    for (let i = 0; i < 8; i++) {
      const { x, y } = phasePos(i);
      const on = i === activeIdx;
      const sp = shadowPath(i, x, y, PR);

      // Active glow (behind icon)
      if (on) {
        // Soft halo
        phasesHTML += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${PR+4}"
          fill="rgba(212,168,83,0.12)" filter="url(#phGlow)" class="ph-glow-halo"/>`;
        // Glow rings
        phasesHTML += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${PR+6}"
          fill="none" stroke="rgba(212,168,83,0.1)" stroke-width="4"
          filter="url(#phGlow)" class="ph-glow-outer"/>`;
        phasesHTML += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${PR+3}"
          fill="none" stroke="rgba(212,168,83,0.3)" stroke-width="1.5" class="ph-glow"/>`;
      }

      // Lit surface
      const fillOp = on ? 1 : 0.18;
      phasesHTML += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${PR}"
        fill="url(#phGrad)" opacity="${fillOp}"/>`;

      // Shadow overlay
      if (sp) {
        phasesHTML += `<path d="${sp}" fill="rgba(5,5,10,${on ? 0.88 : 0.92})"/>`;
      }

      // Border
      const bc = on ? '212,168,83' : '139,123,184';
      const bo = on ? 0.55 : 0.12;
      const bw = on ? 1.5 : 0.7;
      phasesHTML += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${PR}"
        fill="none" stroke="rgba(${bc},${bo})" stroke-width="${bw}"/>`;

      // Invisible hit zone for hover tooltip on active phase
      if (on) {
        phasesHTML += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${PR + 4}"
          fill="transparent" style="cursor:pointer;pointer-events:auto" class="ph-hit"/>`;
      }
    }

    // ---- Sparkle stars ----
    const sparkPositions = [
      [28, 22], [232, 28], [240, 232], [22, 238], [130, 8], [252, 130],
    ];
    let sparkHTML = '';
    sparkPositions.forEach(([sx, sy]) => {
      const s = 2 + Math.random() * 2.5;
      const o = 0.12 + Math.random() * 0.14;
      sparkHTML += `<g transform="translate(${sx},${sy})" opacity="${o}" class="sp">
        <line x1="${-s}" y1="0" x2="${s}" y2="0" stroke="#D4A853" stroke-width="0.6"/>
        <line x1="0" y1="${-s}" x2="0" y2="${s}" stroke="#D4A853" stroke-width="0.6"/>
      </g>`;
    });

    svg.innerHTML = `
      <defs>
        <radialGradient id="phGrad" cx="38%" cy="35%">
          <stop offset="0%"   stop-color="#f5e6a0"/>
          <stop offset="35%"  stop-color="#e8cc6e"/>
          <stop offset="65%"  stop-color="#d4a853"/>
          <stop offset="100%" stop-color="#b8863a"/>
        </radialGradient>
        <filter id="phGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
        </filter>
        <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
        </filter>
      </defs>

      <!-- Orbit ring -->
      <circle cx="${CX}" cy="${CY}" r="${ORBIT}" fill="none"
        stroke="rgba(139,123,184,0.06)" stroke-width="0.7"
        stroke-dasharray="3 5"/>

      <!-- Sparkles -->${sparkHTML}

      <!-- Progress dots -->${dotsHTML}

      <!-- Phase icons -->${phasesHTML}
    `;

    container.appendChild(svg);

    // ---- Hover tooltip for active phase ----
    const tooltip = document.createElement('div');
    tooltip.className = 'moon-tooltip';
    tooltip.textContent = PHASES[activeIdx];
    container.appendChild(tooltip);

    const hitZone = svg.querySelector('.ph-hit');
    if (hitZone) {
      hitZone.addEventListener('mouseenter', () => tooltip.classList.add('visible'));
      hitZone.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
      hitZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        tooltip.classList.toggle('visible');
      }, { passive: false });
    }

    // ======== Animation ========
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const sparkEls   = Array.from(svg.querySelectorAll('.sp'));
    const glowEls    = Array.from(svg.querySelectorAll('.ph-glow'));
    const glowOuter  = Array.from(svg.querySelectorAll('.ph-glow-outer'));
    const glowHalo   = Array.from(svg.querySelectorAll('.ph-glow-halo'));

    const sparkData = sparkEls.map(g => ({
      el: g,
      base: parseFloat(g.getAttribute('opacity')),
      speed: 0.015 + Math.random() * 0.02,
      ph: Math.random() * Math.PI * 2,
    }));

    let frame = 0, animId = null;

    function animate() {
      frame++;

      // Sparkle twinkle (~20 fps)
      if (frame % 3 === 0) {
        for (const s of sparkData) {
          s.ph += s.speed * 3;
          s.el.setAttribute('opacity', s.base * (0.4 + (Math.sin(s.ph) + 1) / 2 * 0.6));
        }
      }

      // Active phase glow pulse (~30 fps)
      if (frame % 2 === 0) {
        const v = Math.sin(frame * 0.008);
        const go = 0.22 + v * 0.12;
        const oo = 0.08 + v * 0.05;
        const ho = 0.10 + v * 0.06;
        glowEls.forEach(el => el.setAttribute('stroke', `rgba(212,168,83,${go})`));
        glowOuter.forEach(el => el.setAttribute('stroke', `rgba(212,168,83,${oo})`));
        glowHalo.forEach(el => el.setAttribute('fill', `rgba(212,168,83,${ho})`));
      }

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animId) { cancelAnimationFrame(animId); animId = null; }
      } else if (!animId) {
        animId = requestAnimationFrame(animate);
      }
    });

    // Pause when hero not visible
    const hero = document.getElementById('home');
    if (hero) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { if (!animId) animId = requestAnimationFrame(animate); }
        else { if (animId) { cancelAnimationFrame(animId); animId = null; } }
      }, { threshold: 0 }).observe(hero);
    }
  }

  return { init };
})();
