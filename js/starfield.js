/* ======================================================
   STARFIELD — Twinkling stars + shooting stars on canvas
   Stars brighten as you scroll near them (scroll glow effect)
   ====================================================== */
const Starfield = (() => {
  const canvas = document.getElementById('starfield');
  if (!canvas) return { init() {}, destroy() {} };

  const ctx = canvas.getContext('2d');
  let animId = null;
  let stars = [];
  let shootingStars = [];
  let w, h;
  let lastShoot = 0;
  let scrollY = 0;
  let lastScrollY = 0;
  let scrollSpeed = 0;
  const SHOOT_INTERVAL = 8000;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createStars() {
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 120 : 250;
    stars = [];
    for (let i = 0; i < count; i++) {
      const layer = Math.random() < 0.15 ? 2 : Math.random() < 0.5 ? 1 : 0;
      const isBright = Math.random() < 0.08;
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        // Store absolute Y position in document for scroll glow
        absY: Math.random() * (document.documentElement.scrollHeight || h * 5),
        baseR: layer === 2 ? 1.8 : layer === 1 ? 1.2 : 0.6,
        r: 0,
        layer,
        bright: isBright,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.8,
        baseAlpha: isBright ? 0.7 : 0.15 + Math.random() * 0.45,
        alpha: 0,
        // Scroll glow boost (0 to 1)
        scrollBoost: 0,
      });
    }
  }

  function spawnShootingStar() {
    const startX = Math.random() * w * 0.8;
    const startY = Math.random() * h * 0.4;
    const angle = (Math.PI / 6) + Math.random() * (Math.PI / 6);
    const speed = 6 + Math.random() * 4;
    shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.012 + Math.random() * 0.008,
      len: 40 + Math.random() * 60,
    });
  }

  function drawStar(s) {
    // Combine base twinkle with scroll boost
    const totalAlpha = Math.min(s.alpha + s.scrollBoost * 0.5, 1);
    const totalR = s.r + s.scrollBoost * s.baseR * 0.6;
    const boosted = s.scrollBoost > 0.15;

    // 4-point sparkle for bright stars or scroll-boosted stars
    if ((s.bright && totalAlpha > 0.5) || (boosted && totalAlpha > 0.4)) {
      const sparkleSize = totalR * (boosted ? 5 : 4);
      ctx.save();
      ctx.globalAlpha = totalAlpha * (boosted ? 0.5 : 0.4);
      ctx.strokeStyle = '#D4A853';
      ctx.lineWidth = boosted ? 0.7 : 0.5;
      ctx.beginPath();
      ctx.moveTo(s.x - sparkleSize, s.y);
      ctx.lineTo(s.x + sparkleSize, s.y);
      ctx.moveTo(s.x, s.y - sparkleSize);
      ctx.lineTo(s.x, s.y + sparkleSize);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(s.x, s.y, totalR, 0, Math.PI * 2);
    ctx.fillStyle = (s.bright || boosted)
      ? `rgba(212, 168, 83, ${totalAlpha})`
      : `rgba(200, 200, 220, ${totalAlpha})`;
    ctx.fill();

    // Extra soft glow for highly boosted stars
    if (s.scrollBoost > 0.3) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, totalR * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 168, 83, ${s.scrollBoost * 0.08})`;
      ctx.fill();
    }
  }

  function drawShootingStar(ss) {
    const tailX = ss.x - ss.vx * (ss.len / 8);
    const tailY = ss.y - ss.vy * (ss.len / 8);
    const gradient = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
    gradient.addColorStop(0, `rgba(212, 168, 83, 0)`);
    gradient.addColorStop(1, `rgba(212, 168, 83, ${ss.life})`);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(ss.x, ss.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 240, ${ss.life})`;
    ctx.fill();
  }

  function animate(time) {
    ctx.clearRect(0, 0, w, h);

    // Track scroll speed for intensity
    scrollSpeed = Math.abs(scrollY - lastScrollY);
    lastScrollY = scrollY;
    const scrollIntensity = Math.min(scrollSpeed / 15, 1);

    // The "glow band" — a region in the document that's currently
    // near the viewport center where stars brighten
    const viewCenter = scrollY + h / 2;

    for (const s of stars) {
      s.phase += s.speed * 0.01;
      const twinkle = (Math.sin(s.phase) + 1) / 2;
      s.alpha = s.baseAlpha * (0.3 + twinkle * 0.7);
      s.r = s.baseR * (0.8 + twinkle * 0.2);

      // Scroll glow: stars whose absY is near the viewport center glow brighter
      // Intensity depends on how fast user is scrolling
      const dist = Math.abs(s.absY - viewCenter);
      const proximity = Math.max(0, 1 - dist / (h * 0.8));
      const targetBoost = proximity * scrollIntensity;
      // Smooth lerp — glows up fast, fades slowly
      s.scrollBoost += (targetBoost - s.scrollBoost) * (targetBoost > s.scrollBoost ? 0.15 : 0.03);

      drawStar(s);
    }

    // Shooting stars
    if (time - lastShoot > SHOOT_INTERVAL) {
      spawnShootingStar();
      lastShoot = time;
    }
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= ss.decay;
      if (ss.life <= 0) {
        shootingStars.splice(i, 1);
        continue;
      }
      drawShootingStar(ss);
    }

    animId = requestAnimationFrame(animate);
  }

  function init() {
    if (reducedMotion) {
      resize();
      createStars();
      for (const s of stars) {
        s.alpha = s.baseAlpha;
        s.r = s.baseR;
        drawStar(s);
      }
      return;
    }
    resize();
    createStars();
    window.addEventListener('resize', () => {
      resize();
      createStars();
    });
    window.addEventListener('scroll', () => {
      scrollY = window.scrollY;
    }, { passive: true });

    // Pause animation when tab is hidden to save resources
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animId) cancelAnimationFrame(animId);
        animId = null;
      } else {
        if (!animId) animId = requestAnimationFrame(animate);
      }
    });

    animId = requestAnimationFrame(animate);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
  }

  return { init, destroy };
})();
