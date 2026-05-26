/* ======================================================
   I18N — Bilingual EN/ES support for Frankie & Rodrigo wedding site
   ====================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'wedding-lang';

  const translations = {
    en: {
      // Navigation
      'nav.home':         'Home',
      'nav.schedule':     'Schedule',
      'nav.travel':       'Travel',
      'nav.weddingParty': 'Wedding Party',
      'nav.gallery':      'Gallery',
      'nav.moments':      'Moments',
      'nav.faqs':         'FAQs',
      'nav.rsvp':         'RSVP',

      // Schedule section
      'schedule.title':    'The Schedule',
      'schedule.subtitle': 'October 15, 2026 • Westbury Manor',

      'schedule.card1.title':   'The Ceremony',
      'schedule.card1.time':    '5:00 PM – 6:00 PM',
      'schedule.card1.quote':   '“Some love stories are written in the stars — ours was pulled from the deck. Please join us as we choose each other till’ death do us part.”',

      'schedule.card2.title':   'The Cocktail Hour',
      'schedule.card2.time':    '6:00 PM – 7:00 PM',
      'schedule.card2.quote':   '“Before the night’s magic unfolds, join us for drinks and hors d’oeuvres.”',

      'schedule.card3.title':   'The Reception',
      'schedule.card3.time':    '7:00 PM – 11:00 PM',
      'schedule.card3.quote':   '“Dancing, dinner, (and more drinks) are in your future. It’s sure to be a bewitching good night.”',

      'schedule.card4.title':   'The After Party',
      'schedule.card4.time':    '11:30 PM',
      'schedule.card4.quote':   '“Couldn’t get enough of us? Join us at The Borderline Tavern for drinks, music and even more fun.”',

      'schedule.btn.map':         'Map',
      'schedule.btn.addCalendar': 'Add to Calendar',

      // Travel section
      'travel.title':          'Travel',
      'travel.hotel.label':    'Hotel',
      'travel.details.p1':     'Staying the night? We’ve got you covered!',
      'travel.details.p2':     'We blocked rooms at Hilton Long Island/Huntington so everyone can celebrate stress-free (and safely get back to bed after the party).',
      'travel.details.p3.pre': 'Use code ',
      'travel.details.p3.mid': ' or the “View” button to grab our discounted rate before midnight on ',
      'travel.details.p3.end': '.',
      'travel.details.p3.code': '919',
      'travel.details.p3.date': 'September 14th',
      'travel.details.p4':     'It’s only about 20 minutes from the venue. Book early — once the block fills, it’s gone!',
      'travel.details.closing': 'Can’t wait for a magical night with our favorite people!',
      'travel.btn.book':       'Book Room',
      'travel.btn.map':        'Map',

      // FAQs section
      'faqs.title': 'FAQs',

      'faqs.q1': 'When? Where? What Time?',
      'faqs.a1': 'October 15th 2026 / Westbury Manor / Please arrive by 5:00 PM',

      'faqs.q2': 'What’s the schedule for the day?',
      'faqs.a2': 'The full schedule, including detailed times, is available on the',
      'faqs.a2.link': 'Schedule',
      'faqs.a2.end': 'section of our wedding website.',

      'faqs.q3': 'What is the RSVP deadline?',
      'faqs.a3': 'September 1st, 2026',

      'faqs.q4': 'How can I RSVP?',
      'faqs.a4.pre':  'You can RSVP right here on this page — just scroll down to the ',
      'faqs.a4.link': 'RSVP section',
      'faqs.a4.end':  ' below! You can also scan the QR code on your wedding invitation, which will bring you to this same page.',

      'faqs.q5': 'Can I bring a plus one?',
      'faqs.a5': 'Unless otherwise stated on your invitation, we kindly request that you do not bring a guest.',

      'faqs.q6': 'Are kids allowed?',
      'faqs.a6': 'We kindly request that children not attend the wedding unless they are specifically mentioned on the invitation.',

      'faqs.q7': 'Where are you registered for wedding gifts?',
      'faqs.a7': 'We kindly request monetary gifts to help us start our new life together. While traditional registries can be wonderful, we’ve chosen to prioritize building our future over accumulating household items.',

      'faqs.q8': 'What is the dress code?',
      'faqs.a8': 'Formal Attire',

      'faqs.q9': 'Where is the after party?',

      'faqs.q10': 'Any other questions?',
      'faqs.a10.intro':   'We’re happy to help! Feel free to contact us directly:',
      'faqs.a10.frankie': 'Frankie:',
      'faqs.a10.rodrigo': 'Rodrigo:',

      // RSVP section
      'rsvp.title':    'RSVP',
      'rsvp.subtitle': 'The cards await your answer • Please RSVP by September 1, 2026',

      'rsvp.search.label':   'Enter Your Invitation Code',
      'rsvp.search.hint':    'You’ll find it on your invitation card',

      'rsvp.invite.header':  'You are cordially invited',
      'rsvp.invite.msg':     'to the wedding celebration of',
      'rsvp.invite.date':    'October 15, 2026',
      'rsvp.invite.hint':    'Tap each name to mark who shall attend',
      'rsvp.invite.guest':   'Guest',
      'rsvp.invite.guestPlaceholder': "Guest's name...",

      'rsvp.btn.confirm':  'Confirm Response',
      'rsvp.btn.decline':  'Send Regrets',
      'rsvp.btn.reshuffle': 'Reshuffle Your Path',
      'rsvp.btn.diffCode': 'Enter a different code',
      'rsvp.btn.resubmit': 'Changed your mind? Resubmit',

      'rsvp.already.titleAccept':  'The Cards Remember You',
      'rsvp.already.titleDecline': 'The Stars Await Your Return',
      'rsvp.already.changeHeart':  'Had a change of heart?',
      'rsvp.already.regretsNoted': 'Your regrets have been noted by the cosmos.',
      'rsvp.already.placeHeld':    'The stars still hold a place for you.',
      'rsvp.already.isAligned':    'is',
      'rsvp.already.areAligned':   'are',
      'rsvp.already.aligned':      'aligned with the stars.',

      'rsvp.success.titleAccept':  'The Stars Have Spoken',
      'rsvp.success.titleDecline': 'The Universe Understands',
      'rsvp.success.msgAccept':    'Thank you! We can’t wait to celebrate with you.',
      'rsvp.success.subAccept':    'We can’t wait to celebrate with you!',
      'rsvp.success.msgDecline':   'Thank you for letting us know.',
      'rsvp.success.subDecline':   'We’ll miss you, but we appreciate the response.',

      'rsvp.loading.msg':    'Consulting the stars...',

      'rsvp.error.notFound': 'Code not recognized. Please check your invitation and try again.',
      'rsvp.error.timeout':  'Request timed out. Please try again.',
      'rsvp.error.noServer': 'Could not connect to server. Please try again.',
      'rsvp.error.failed':   'Failed to submit. Please try again.',

      // Countdown labels
      'countdown.days':    'Days',
      'countdown.hours':   'Hours',
      'countdown.minutes': 'Minutes',
      'countdown.seconds': 'Seconds',

      // Footer
      'footer.credit.pre':   'Made with',
      'footer.credit.by':    'by',

      // Gallery
      'gallery.hint': 'Each card holds a story — tap to unveil',

      // Constellation panel label (mobile)
      'rsvp.constellation.label': 'Each star is a guest who answered the call',
    },

    es: {
      // Navegación
      'nav.home':         'Inicio',
      'nav.schedule':     'Programa',
      'nav.travel':       'Cómo llegar',
      'nav.weddingParty': 'Wedding Party',
      'nav.gallery':      'Galería',
      'nav.moments':      'Momentos',
      'nav.faqs':         'Preguntas',
      'nav.rsvp':         'RSVP',

      // Sección Programa
      'schedule.title':    'El Programa',
      'schedule.subtitle': '15 de octubre de 2026 • Westbury Manor',

      'schedule.card1.title':   'La Ceremonia',
      'schedule.card1.time':    '5:00 PM – 6:00 PM',
      'schedule.card1.quote':   '“Algunas historias de amor están escritas en las estrellas — la nuestra fue extraída de la baraja. Acompañenos mientras elegimos estar juntos hasta que la muerte nos separe.”',

      'schedule.card2.title':   'El Cóctel',
      'schedule.card2.time':    '6:00 PM – 7:00 PM',
      'schedule.card2.quote':   '“Antes de que se despliegue la magia de la noche, únase a nosotros para tomar unas copas.”',

      'schedule.card3.title':   'La Recepción',
      'schedule.card3.time':    '7:00 PM – 11:00 PM',
      'schedule.card3.quote':   '“Baile, cena (y más copas) están en su futuro. Sin duda será una noche hechizante.”',

      'schedule.card4.title':   'El After Party',
      'schedule.card4.time':    '11:30 PM',
      'schedule.card4.quote':   '“¿Quería más de nosotros? Únase en The Borderline Tavern para más bebidas, música y diversión.”',

      'schedule.btn.map':         'Mapa',
      'schedule.btn.addCalendar': 'Añadir al calendario',

      // Sección Viaje
      'travel.title':          'Cómo llegar',
      'travel.hotel.label':    'Hotel',
      'travel.details.p1':     '¿Se queda a dormir? ¡Lo tenemos cubierto!',
      'travel.details.p2':     'Reservamos habitaciones en el Hilton Long Island/Huntington para que todos puedan celebrar sin preocupaciones (y regresar a la cama tranquilamente después de la fiesta).',
      'travel.details.p3.pre': 'Use el código ',
      'travel.details.p3.mid': ' o el botón “Ver” para obtener nuestra tarifa con descuento antes de la medianoche del ',
      'travel.details.p3.end': '.',
      'travel.details.p3.code': '919',
      'travel.details.p3.date': '14 de septiembre',
      'travel.details.p4':     'Está a solo unos 20 minutos del lugar. ¡Reserve pronto, una vez que se llene el bloque no habrá más!',
      'travel.details.closing': '¡No podemos esperar para vivir una noche mágica con nuestra gente favorita!',
      'travel.btn.book':       'Reservar habitación',
      'travel.btn.map':        'Mapa',

      // Sección FAQs
      'faqs.title': 'Preguntas frecuentes',

      'faqs.q1': '¿Cuándo, dónde y a qué hora?',
      'faqs.a1': '15 de octubre de 2026 / Westbury Manor / Por favor llegue antes de las 5:00 PM',

      'faqs.q2': '¿Cuál es el programa del día?',
      'faqs.a2': 'El programa completo, con horarios detallados, está disponible en la sección',
      'faqs.a2.link': 'Programa',
      'faqs.a2.end': 'de nuestro sitio de boda.',

      'faqs.q3': '¿Cuál es la fecha límite para el RSVP?',
      'faqs.a3': '1 de septiembre de 2026',

      'faqs.q4': '¿Cómo puedo confirmar mi asistencia?',
      'faqs.a4.pre':  'Puede confirmar su asistencia aquí mismo en esta página — simplemente desplácese hacia abajo hasta la ',
      'faqs.a4.link': 'sección RSVP',
      'faqs.a4.end':  ' más abajo. También puede escanear el código QR de su invitación, que lo llevará a esta misma página.',

      'faqs.q5': '¿Puedo traer acompañante?',
      'faqs.a5': 'Salvo que su invitación indique lo contrario, le pedimos amablemente que no traiga invitados adicionales.',

      'faqs.q6': '¿Se permiten niños?',
      'faqs.a6': 'Le pedimos amablemente que los niños no asistan a la boda a menos que estén mencionados específicamente en la invitación.',

      'faqs.q7': '¿Dónde están registrados para regalos de boda?',
      'faqs.a7': 'Agradecemos los regalos en efectivo para ayudarnos a comenzar nuestra nueva vida juntos. Si bien los registros tradicionales pueden ser maravillosos, hemos optado por priorizar la construcción de nuestro futuro.',

      'faqs.q8': '¿Cuál es el código de vestimenta?',
      'faqs.a8': 'Ropa formal',

      'faqs.q9': '¿Dónde es el after party?',

      'faqs.q10': '¿Alguna otra pregunta?',
      'faqs.a10.intro':   '¡Con gusto ayudamos! No dude en contactarnos directamente:',
      'faqs.a10.frankie': 'Frankie:',
      'faqs.a10.rodrigo': 'Rodrigo:',

      // Sección RSVP
      'rsvp.title':    'RSVP',
      'rsvp.subtitle': 'Las cartas esperan su respuesta • Por favor confirme antes del 1 de septiembre de 2026',

      'rsvp.search.label':   'Ingrese su código de invitación',
      'rsvp.search.hint':    'Lo encontrará en su tarjeta de invitación',

      'rsvp.invite.header':  'Está cordialmente invitado',
      'rsvp.invite.msg':     'a la celebración de boda de',
      'rsvp.invite.date':    '15 de octubre de 2026',
      'rsvp.invite.hint':    'Toque cada nombre para indicar quién asistirá',
      'rsvp.invite.guest':   'Invitado',
      'rsvp.invite.guestPlaceholder': 'Nombre del invitado...',

      'rsvp.btn.confirm':  'Confirmar respuesta',
      'rsvp.btn.decline':  'Enviar disculpas',
      'rsvp.btn.reshuffle': 'Cambiar mi respuesta',
      'rsvp.btn.diffCode': 'Ingresar un código diferente',
      'rsvp.btn.resubmit': '¿Cambió de opinión? Reenviar',

      'rsvp.already.titleAccept':  'Las Cartas Te Recuerdan',
      'rsvp.already.titleDecline': 'Las Estrellas Esperan Tu Regreso',
      'rsvp.already.changeHeart':  '¿Cambió de opinión?',
      'rsvp.already.regretsNoted': 'Sus disculpas han sido registradas por el cosmos.',
      'rsvp.already.placeHeld':    'Las estrellas aún guardan un lugar para usted.',
      'rsvp.already.isAligned':    'está',
      'rsvp.already.areAligned':   'están',
      'rsvp.already.aligned':      'alineados con las estrellas.',

      'rsvp.success.titleAccept':  'Las Estrellas Han Hablado',
      'rsvp.success.titleDecline': 'El Universo Comprende',
      'rsvp.success.msgAccept':    '¡Gracias! No podemos esperar para celebrar con usted.',
      'rsvp.success.subAccept':    '¡No podemos esperar para celebrar con ustedes!',
      'rsvp.success.msgDecline':   'Gracias por avisarnos.',
      'rsvp.success.subDecline':   'Los extraaremos, pero apreciamos la respuesta.',

      'rsvp.loading.msg':    'Consultando las estrellas...',

      'rsvp.error.notFound': 'Código no reconocido. Por favor verifique su invitación e intente de nuevo.',
      'rsvp.error.timeout':  'La solicitud expiró. Por favor intente de nuevo.',
      'rsvp.error.noServer': 'No se pudo conectar al servidor. Por favor intente de nuevo.',
      'rsvp.error.failed':   'Error al enviar. Por favor intente de nuevo.',

      // Etiquetas del contador
      'countdown.days':    'Días',
      'countdown.hours':   'Horas',
      'countdown.minutes': 'Minutos',
      'countdown.seconds': 'Segundos',

      // Pie de página
      'footer.credit.pre':   'Hecho con',
      'footer.credit.by':    'por',

      // Galería
      'gallery.hint': 'Cada carta guarda una historia — toque para revelar',

      // Panel de constellación (móvil)
      'rsvp.constellation.label': 'Cada estrella es un invitado que respondió el llamado',
    },
  };

  // ── Detect language ───────────────────────────────────────
  function detectLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
    const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return nav.startsWith('es') ? 'es' : 'en';
  }

  // ── Get a translation string ──────────────────────────────
  function t(key) {
    const lang = window.currentLang || 'en';
    return (translations[lang] && translations[lang][key]) ||
           (translations['en'] && translations['en'][key]) ||
           key;
  }

  // ── Apply all data-i18n attributes ───────────────────────
  function applyTranslations(lang) {
    window.currentLang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = translations[lang][key] || translations['en'][key];
      if (val !== undefined) el.textContent = val;
    });

    // data-i18n-placeholder: for input placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      const val = translations[lang][key] || translations['en'][key];
      if (val !== undefined) el.placeholder = val;
    });

    // data-i18n-aria: for aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.dataset.i18nAria;
      const val = translations[lang][key] || translations['en'][key];
      if (val !== undefined) el.setAttribute('aria-label', val);
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update toggle button appearance
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = lang === 'en' ? 'ES' : 'EN';
      toggleBtn.setAttribute('aria-label',
        lang === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés');
      toggleBtn.dataset.currentLang = lang;
    }

    // Update FAQ answer 2 (has inline link)
    const faq2answer = document.getElementById('faq-a2');
    if (faq2answer) {
      faq2answer.innerHTML =
        (translations[lang]['faqs.a2'] || translations['en']['faqs.a2']) +
        ' <a href="#schedule">' +
        (translations[lang]['faqs.a2.link'] || translations['en']['faqs.a2.link']) +
        '</a> ' +
        (translations[lang]['faqs.a2.end'] || translations['en']['faqs.a2.end']);
    }

    // Update FAQ answer 4 (has inline link)
    const faq4answer = document.getElementById('faq-a4');
    if (faq4answer) {
      faq4answer.innerHTML =
        (translations[lang]['faqs.a4.pre'] || translations['en']['faqs.a4.pre']) +
        '<a href="#rsvp">' +
        (translations[lang]['faqs.a4.link'] || translations['en']['faqs.a4.link']) +
        '</a>' +
        (translations[lang]['faqs.a4.end'] || translations['en']['faqs.a4.end']);
    }

    // Update travel block p3 (has bold code + date)
    const travelP3 = document.getElementById('travel-p3');
    if (travelP3) {
      travelP3.innerHTML =
        (translations[lang]['travel.details.p3.pre'] || translations['en']['travel.details.p3.pre']) +
        '<strong>' + (translations[lang]['travel.details.p3.code'] || '919') + '</strong>' +
        (translations[lang]['travel.details.p3.mid'] || translations['en']['travel.details.p3.mid']) +
        '<strong>' + (translations[lang]['travel.details.p3.date'] || translations['en']['travel.details.p3.date']) + '</strong>' +
        (translations[lang]['travel.details.p3.end'] || translations['en']['travel.details.p3.end']);
    }

    // Dynamically created elements in RSVP need a repaint hook
    // (hint text in buildMemberToggles, plus-one placeholder)
    document.querySelectorAll('.rsvp-star-hint').forEach(el => {
      el.textContent = translations[lang]['rsvp.invite.hint'] || translations['en']['rsvp.invite.hint'];
    });
    document.querySelectorAll('.rsvp-member-name').forEach(el => {
      if (el.textContent === 'Guest' || el.textContent === 'Invitado') {
        el.textContent = translations[lang]['rsvp.invite.guest'] || 'Guest';
      }
    });
    document.querySelectorAll('.rsvp-plusone-name').forEach(el => {
      el.placeholder = translations[lang]['rsvp.invite.guestPlaceholder'] || "Guest's name...";
    });

    // Dispatch event so rsvp.js / other modules can react
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  // ── Toggle language ───────────────────────────────────────
  function toggleLang() {
    const current = window.currentLang || 'en';
    const next = current === 'en' ? 'es' : 'en';
    localStorage.setItem(STORAGE_KEY, next);
    applyTranslations(next);
  }

  // ── Inject toggle button into nav ─────────────────────────
  function injectToggleButton() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const li = document.createElement('li');
    li.className = 'nav-lang-item';

    const btn = document.createElement('button');
    btn.id = 'lang-toggle';
    btn.type = 'button';
    btn.className = 'lang-toggle';
    btn.textContent = 'ES';  // will be updated by applyTranslations
    btn.setAttribute('aria-label', 'Switch to Spanish');

    // Inline styles for minimal footprint — uses CSS vars already in the site
    btn.style.cssText = [
      'font-family: inherit',
      'font-size: 0.7rem',
      'font-weight: 600',
      'letter-spacing: 0.18em',
      'text-transform: uppercase',
      'color: var(--copper)',
      'background: transparent',
      'border: 1px solid var(--copper)',
      'border-radius: 3px',
      'padding: 3px 8px',
      'cursor: pointer',
      'transition: color 0.3s, border-color 0.3s, background 0.3s',
      'line-height: 1.4',
      'vertical-align: middle',
    ].join(';');

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(196,149,106,0.15)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleLang();
      // Close mobile menu if open
      const hamburger = document.querySelector('.hamburger');
      const links = document.querySelector('.nav-links');
      if (hamburger && hamburger.classList.contains('open')) {
        hamburger.classList.remove('open');
        links.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    li.appendChild(btn);
    navLinks.appendChild(li);
  }

  // ── Public init ───────────────────────────────────────────
  function init() {
    const lang = detectLang();
    injectToggleButton();
    applyTranslations(lang);
  }

  // Expose globally
  window.I18n = { init, t, applyTranslations, toggleLang };
})();
