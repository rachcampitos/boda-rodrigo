/* ======================================================
   TAROT — Card flip animations + .ics calendar generation
   ====================================================== */
const Tarot = (() => {
  const cards = document.querySelectorAll('.tarot-card');
  if (!cards.length) return { init() {} };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Calendar event data
  const events = {
    ceremony: {
      title: 'Frankie & Rodrigo — Ceremony',
      start: '20261015T170000',
      end: '20261015T180000',
      location: 'Westbury Manor, 1100 Jericho Tpke, Westbury, NY 11590',
      description: 'The wedding ceremony of Frankie England & Rodrigo Campos Huambachano.',
    },
    cocktail: {
      title: 'Frankie & Rodrigo — Cocktail Hour',
      start: '20261015T180000',
      end: '20261015T190000',
      location: 'Westbury Manor, 1100 Jericho Tpke, Westbury, NY 11590',
      description: 'Cocktail hour — drinks and hors d\'oeuvres.',
    },
    reception: {
      title: 'Frankie & Rodrigo — Reception',
      start: '20261015T190000',
      end: '20261015T230000',
      location: 'Westbury Manor, 1100 Jericho Tpke, Westbury, NY 11590',
      description: 'Reception — dinner, dancing, and celebration!',
    },
  };

  function generateICS(eventKey) {
    const e = events[eventKey];
    if (!e) return;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FrankieAndRodrigo//Wedding//EN',
      'BEGIN:VEVENT',
      `DTSTART;TZID=America/New_York:${e.start}`,
      `DTEND;TZID=America/New_York:${e.end}`,
      `SUMMARY:${e.title}`,
      `LOCATION:${e.location}`,
      `DESCRIPTION:${e.description}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frankie-rodrigo-${eventKey}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function init() {
    // If reduced motion, cards start flipped (via CSS)
    if (reducedMotion) {
      cards.forEach(c => c.classList.add('flipped'));
    }

    // Make cards keyboard-accessible
    cards.forEach(card => {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Card ${card.dataset.card}: click to reveal schedule details`);
    });

    // Click/tap to flip
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't flip if clicking a button/link inside
        if (e.target.closest('a, button')) return;
        card.classList.toggle('flipped');
        card.setAttribute('aria-label', card.classList.contains('flipped')
          ? `Card ${card.dataset.card}: showing details. Click to flip back.`
          : `Card ${card.dataset.card}: click to reveal schedule details`);
      });

      // Keyboard: Enter/Space to flip
      card.addEventListener('keydown', (e) => {
        if (e.target.closest('a, button')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.classList.toggle('flipped');
          card.setAttribute('aria-label', card.classList.contains('flipped')
            ? `Card ${card.dataset.card}: showing details. Click to flip back.`
            : `Card ${card.dataset.card}: click to reveal schedule details`);
        }
      });
    });

    // Auto-flip on scroll into view (IntersectionObserver)
    if (!reducedMotion) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !entry.target.classList.contains('flipped')) {
            const delay = parseInt(entry.target.dataset.card, 10) * 200;
            setTimeout(() => {
              entry.target.classList.add('flipped');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });

      cards.forEach(card => observer.observe(card));
    }

    // Calendar download buttons
    document.querySelectorAll('.btn-ics').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const eventKey = btn.dataset.event;
        generateICS(eventKey);
      });
    });
  }

  return { init };
})();
