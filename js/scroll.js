/* ======================================================
   SCROLL — Parallax, reveal animations, nav highlighting
   ====================================================== */
const Scroll = (() => {
  const nav = document.getElementById('main-nav');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const reveals = document.querySelectorAll('.reveal');
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ticking = false;
  let navClickLock = false; // skip scroll-based highlighting during nav click scroll

  // Reveal elements on scroll
  function initReveals() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    });

    reveals.forEach(el => {
      if (reducedMotion) {
        el.classList.add('visible');
      } else {
        observer.observe(el);
      }
    });
  }

  // Highlight active nav section
  function updateActiveNav() {
    if (navClickLock) return;

    const scrollY = window.scrollY + 100;
    let currentId = 'home';

    sections.forEach(section => {
      const top = section.offsetTop - 80;
      const bottom = top + section.offsetHeight;
      if (scrollY >= top && scrollY < bottom) {
        currentId = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
    });
  }

  // Immediately activate clicked nav link and lock scroll-tracking
  function setActiveOnClick(clickedLink) {
    navClickLock = true;
    navLinks.forEach(link => link.classList.remove('active'));
    clickedLink.classList.add('active');

    // Re-enable scroll tracking after smooth scroll finishes
    setTimeout(() => { navClickLock = false; }, 1000);
  }

  // Nav background on scroll
  function updateNavBg() {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  // Parallax effect
  function updateParallax() {
    if (reducedMotion) return;
    const scrollY = window.scrollY;

    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const viewCenter = window.innerHeight / 2;
      const offset = (elCenter - viewCenter) * speed;
      el.style.transform = `translateY(${offset}px)`;
    });
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateNavBg();
        updateActiveNav();
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  }

  function init() {
    initReveals();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Nav link clicks: activate immediately, skip intermediate highlights
    navLinks.forEach(link => {
      link.addEventListener('click', () => setActiveOnClick(link));
    });

    // Initial state
    updateNavBg();
    updateActiveNav();
  }

  return { init };
})();
