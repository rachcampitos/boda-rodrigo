/* ======================================================
   MAIN — Orchestrator: initializes all modules, mobile nav, lightbox
   ====================================================== */
(function () {
  'use strict';

  // ---------- Mobile Navigation ----------
  function initMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#main-nav') && navLinks.classList.contains('open')) {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- Oracle Cards — Deck Deal Effect ----------
  function initOracleCards() {
    const grid = document.querySelector('.oracle-grid');
    const cards = Array.from(document.querySelectorAll('.oracle-card'));
    if (!grid || !cards.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Captions for each photo (by index)
    const captions = [
      'The future Mr. & Mr. 💍',
      '\u2018till death do us part. 💍🩵',
      '09.05.23 \u2014 The day we decided on forever. 💜',
      'From the very beginning, we just knew.',
      'Simply Meant To Be.',
      'Our baby, Meet Tigger-Roo. 🐾🧡',
      'Our Oogie. 🐢💚',
      'A baby Frankie \u2014 a heart full of wonder. 🩵',
      'A young Rodrigo \u2014 there\u2019s a whole world to explore. 🌎',
      'And they lived happily ever after. \u2728',
    ];

    // Collect image data for lightbox
    const images = [];
    cards.forEach((card, i) => {
      const img = card.querySelector('.oracle-front img');
      images.push({
        src: img?.src || '',
        alt: img?.alt || '',
        caption: captions[i] || '',
      });
    });

    // --- Calculate offsets so all cards stack at top-left (card 0 position) ---
    function computeDeckPositions() {
      const gridRect = grid.getBoundingClientRect();

      // Deck origin = first card's natural position
      const firstRect = cards[0].getBoundingClientRect();
      const originX = firstRect.left - gridRect.left + firstRect.width / 2;
      const originY = firstRect.top - gridRect.top + firstRect.height / 2;

      cards.forEach((card, i) => {
        const cardRect = card.getBoundingClientRect();
        const cardCX = cardRect.left - gridRect.left + cardRect.width / 2;
        const cardCY = cardRect.top - gridRect.top + cardRect.height / 2;

        const dx = originX - cardCX;
        const dy = originY - cardCY;

        // Small random rotation for a natural stacked deck look
        const rot = (Math.random() - 0.5) * 7;

        card.style.setProperty('--to-center-x', `${dx}px`);
        card.style.setProperty('--to-center-y', `${dy}px`);
        card.style.setProperty('--stack-r', `${rot}deg`);
        // Last card on top of deck (highest z), card 0 at the bottom
        card.style.setProperty('--stack-z', `${i}`);
      });
    }

    if (!reducedMotion) {
      // Compute positions once layout is ready
      computeDeckPositions();

      // Recompute on resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          // Only recompute if not yet dealt
          if (!cards[0].classList.contains('dealt')) {
            computeDeckPositions();
          }
        }, 200);
      });

      // Deal cards when grid scrolls into view
      let hasDealt = false;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hasDealt) {
            hasDealt = true;
            dealCards();
            observer.unobserve(grid);
          }
        });
      }, { threshold: 0.15 });

      observer.observe(grid);
    } else {
      // Reduced motion: show all cards dealt immediately
      cards.forEach(card => card.classList.add('dealt'));
      const hint = document.getElementById('gallery-hint');
      if (hint) hint.classList.add('shown');
    }

    // Deal from top of deck outward: farthest cards first, card 0 last (it stays in place and flips)
    function dealCards() {
      const dealOrder = [...cards].reverse();
      dealOrder.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('dealt');
        }, i * 200);
      });

      // Show hint after all cards finish dealing + flip
      const totalDealTime = dealOrder.length * 200 + 1200;
      const hint = document.getElementById('gallery-hint');
      if (hint) {
        setTimeout(() => hint.classList.add('shown'), totalDealTime);
      }
    }

    // Make dealt cards keyboard-accessible
    cards.forEach(card => {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Photo ${parseInt(card.dataset.index, 10) + 1}: click to view`);
    });

    // Click dealt card → pulse + open lightbox
    cards.forEach(card => {
      card.addEventListener('click', () => {
        if (!card.classList.contains('dealt')) return;
        const idx = parseInt(card.dataset.index, 10);

        // Pulse: shrink + glow
        card.classList.add('oracle-tap');
        setTimeout(() => {
          card.classList.remove('oracle-tap');
          card.classList.add('oracle-tap-out');
        }, 200);
        setTimeout(() => {
          card.classList.remove('oracle-tap-out');
          openLightbox(idx);
        }, 450);
      });

      // Keyboard: Enter/Space to open lightbox
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!card.classList.contains('dealt')) return;
          const idx = parseInt(card.dataset.index, 10);
          openLightbox(idx);
        }
      });
    });

    // ---------- Lightbox ----------
    const lightbox = document.getElementById('lightbox');
    const closeBtn = lightbox?.querySelector('.lightbox-close');
    const prevBtn = lightbox?.querySelector('.lightbox-prev');
    const nextBtn = lightbox?.querySelector('.lightbox-next');
    const lbImg = document.getElementById('lightbox-img');
    const lbCaption = document.getElementById('lightbox-caption');
    if (!lightbox || !lbImg) return;

    let currentIndex = 0;
    let triggerEl = null;  // element that opened the lightbox

    function showImage(index) {
      currentIndex = index;
      const data = images[index];
      lbImg.src = data.src;
      lbImg.alt = data.alt;
      if (lbCaption) {
        lbCaption.textContent = data.caption || '';
        // Re-trigger fade-in animation
        lbCaption.classList.remove('visible');
        void lbCaption.offsetWidth;
        if (data.caption) lbCaption.classList.add('visible');
      }
    }

    function openLightbox(index) {
      triggerEl = document.activeElement;
      showImage(index);
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (triggerEl) triggerEl.focus();
    }

    // Focus trap inside lightbox
    const focusableEls = [closeBtn, prevBtn, nextBtn];
    lightbox.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !lightbox.classList.contains('open')) return;
      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    function navigate(dir) {
      const next = (currentIndex + dir + images.length) % images.length;
      showImage(next);
    }

    closeBtn?.addEventListener('click', closeLightbox);
    prevBtn?.addEventListener('click', () => navigate(-1));
    nextBtn?.addEventListener('click', () => navigate(1));

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    // Swipe support for mobile lightbox
    let touchStartX = 0;
    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) navigate(dx > 0 ? -1 : 1);
    }, { passive: true });
  }

  // ---------- Hero Card Deck — Stacked Flip + Vanish ----------
  function initCardDeck() {
    const cards = Array.from(document.querySelectorAll('.deck-card'));
    if (cards.length < 2) return;

    const N = cards.length;
    let order = cards.map((_, i) => i);
    let busy = false;
    let timeout = null;

    const REVEAL_DUR = 1000;
    const HOLD_DUR   = 3500;
    const VANISH_DUR = 1200;  // dissolve duration
    const SETTLE_DUR = 500;

    function applyOrder() {
      cards.forEach((card, i) => card.setAttribute('data-order', order[i]));
    }

    function getTopCard() {
      return cards[order.indexOf(N - 1)];
    }

    // ---- Golden dust at the dissolve edge ----
    const stack = document.querySelector('.card-deck-stack');

    function spawnDust(edgeY) {
      const p = document.createElement('div');
      p.className = 'vanish-particle';

      const px = Math.random() * stack.offsetWidth;
      const size = 1 + Math.random() * 2;
      const drift = (Math.random() - 0.5) * 50;
      const rise = 30 + Math.random() * 50;
      const dur = 500 + Math.random() * 500;

      p.style.cssText =
        `left:${px}px;top:${edgeY}px;width:${size}px;height:${size}px;` +
        `--drift:${drift}px;--rise:${-rise}px;animation-duration:${dur}ms;`;

      stack.appendChild(p);
      setTimeout(() => p.remove(), dur);
    }

    // ---- Vanish: bottom → top dissolve + dust particles ----
    function vanish(card, onDone) {
      card.classList.add('vanishing');
      const front = card.querySelector('.deck-front');
      const H = card.offsetHeight;
      let start = null;

      function frame(ts) {
        if (!start) start = ts;
        const t = Math.min((ts - start) / VANISH_DUR, 1);

        // Dissolve edge moves from bottom (100%) to top (0%)
        const edge = (1 - t) * 100;
        const soft = 10;
        const mask = `linear-gradient(to bottom, black ${Math.max(0, edge - soft)}%, transparent ${Math.min(100, edge + 2)}%)`;

        front.style.maskImage = mask;
        front.style.webkitMaskImage = mask;

        // Fade glow out gradually on the parent card
        const g1 = (0.4 * (1 - t)).toFixed(2);
        const g2 = (0.15 * (1 - t)).toFixed(2);
        card.style.filter = `drop-shadow(0 0 18px rgba(212,168,83,${g1})) drop-shadow(0 0 36px rgba(212,168,83,${g2}))`;

        // Spawn dust RIGHT at the dissolve edge (in the stack, not the card)
        if (t > 0.01 && t < 0.97) {
          const edgePx = (edge / 100) * H;
          const count = 12 + Math.floor(Math.random() * 6);
          for (let i = 0; i < count; i++) spawnDust(edgePx);
        }

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          front.style.maskImage = '';
          front.style.webkitMaskImage = '';
          card.style.filter = '';
          onDone();
        }
      }
      requestAnimationFrame(frame);
    }

    // ---- Reset card silently (hidden first, then repositioned) ----
    function resetCard(card) {
      const inner = card.querySelector('.deck-card-inner');
      const front = card.querySelector('.deck-front');

      // Hide immediately so nothing flashes
      card.style.opacity = '0';
      card.style.filter = '';
      front.style.maskImage = '';
      front.style.webkitMaskImage = '';

      // Reset flip instantly
      inner.style.transition = 'none';
      card.style.transition = 'none';
      card.classList.remove('revealed', 'revealing', 'vanishing');
      void card.offsetHeight;
      inner.style.transition = '';
      card.style.transition = '';
    }

    // ---- Full cycle ----
    function cycle() {
      if (busy) return;
      busy = true;

      const topCard = getTopCard();

      // Step 1: Flip to reveal photo + gold glow
      topCard.classList.add('revealing', 'revealed');
      setTimeout(() => topCard.classList.remove('revealing'), REVEAL_DUR);

      // Step 2: After hold, vanish the card
      timeout = setTimeout(() => {
        vanish(topCard, () => {
          resetCard(topCard);

          order = order.map(o => (o + 1) % N);
          applyOrder();

          // Remove inline opacity so CSS transition fades card in at back
          requestAnimationFrame(() => { topCard.style.opacity = ''; });

          setTimeout(() => { busy = false; cycle(); }, SETTLE_DUR);
        });
      }, REVEAL_DUR + HOLD_DUR);
    }

    applyOrder();
    setTimeout(cycle, 1200);
  }

  // ---------- Invite Code Gate (disabled — enable when portfolio is public) ----------
  // function checkInviteCode() {
  //   const params = new URLSearchParams(window.location.search);
  //   const code = params.get('invite');
  //   const VALID_CODE = 'starswear-1015';
  //   const form = document.getElementById('rsvp-form');
  //   const locked = document.getElementById('rsvp-locked');
  //   if (!form || !locked) return;
  //   if (code !== VALID_CODE) {
  //     form.style.display = 'none';
  //     locked.style.display = '';
  //   }
  // }

  // ---------- Wedding Party — Cursor/Touch Star Trail ----------
  function initPartyTrail() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const members = document.querySelectorAll('.party-member');
    if (!members.length) return;

    let lastSpawn = 0;

    function spawnTrail(member, cx, cy) {
      const now = Date.now();
      if (now - lastSpawn < 35) return;
      lastSpawn = now;

      const rect = member.getBoundingClientRect();
      const x = cx - rect.left;
      const y = cy - rect.top;

      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'party-trail-star';

        const size = 1.5 + Math.random() * 2;
        const dur = 500 + Math.random() * 400;
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 14;

        star.style.cssText = `
          left:${x}px; top:${y}px;
          width:${size}px; height:${size}px;
          -webkit-transition: transform ${dur}ms ease-out, opacity ${dur}ms ease-out;
          transition: transform ${dur}ms ease-out, opacity ${dur}ms ease-out;
        `;
        member.appendChild(star);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            star.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`;
            star.style.opacity = '0';
          });
        });

        setTimeout(() => star.remove(), dur + 50);
      }
    }

    members.forEach(member => {
      member.addEventListener('mousemove', (e) => {
        spawnTrail(member, e.clientX, e.clientY);
      });

      member.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        spawnTrail(member, touch.clientX, touch.clientY);
      }, { passive: true });
    });
  }

  // ---------- Initialize Everything ----------
  function init() {
    // checkInviteCode();
    initMobileNav();
    initCardDeck();
    initOracleCards();
    initPartyTrail();

    // Initialize modules
    Starfield.init();
    Moon.init();
    Particles.init();
    Tarot.init();
    Scroll.init();
    Countdown.init();
    RSVP.init();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
