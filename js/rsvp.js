/* ======================================================
   RSVP — Code entry, member toggles, card flip, API submission
   ====================================================== */
const RSVP = (() => {
  // API URL
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://boda-rodrigo-production.up.railway.app/api';

  // Elements
  const searchState = document.getElementById('rsvp-search');
  const inviteState = document.getElementById('rsvp-invite');
  const alreadyState = document.getElementById('rsvp-already');
  const successState = document.getElementById('rsvp-success');
  const loadingState = document.getElementById('rsvp-loading');

  if (!searchState) return { init() {} };

  const codeInput = document.getElementById('rsvp-code-input');
  const codeSubmitBtn = document.getElementById('rsvp-code-submit');
  const searchError = document.getElementById('rsvp-search-error');

  const inviteCard = inviteState.querySelector('.rsvp-invite-card');
  const inviteTitle = document.getElementById('rsvp-invite-title');
  const inviteMembers = document.getElementById('rsvp-invite-members');
  const attendanceContainer = document.getElementById('rsvp-invite-attendance');
  const confirmBtn = document.getElementById('rsvp-confirm-btn');

  const successMsg = document.getElementById('rsvp-success-msg');
  const successSub = document.getElementById('rsvp-success-sub');
  const starfield = document.getElementById('rsvp-starfield');
  const rsvpSection = document.getElementById('rsvp');

  // State
  let selectedGuest = null;
  let usedCode = null;
  let memberStates = {};    // { memberName: boolean }
  let plusOneAttending = false;
  let plusOneName = '';
  let hintShown = false;
  const starMap = {}; // groupId → { container, stars[], lines[], headCount }

  function init() {
    initStarfield();
    initCodeInput();
    initBackButtons();
    initConfirmButton();
    loadAcceptedStars();
    checkUrlCode();
  }

  // ── Auto-detect code from URL param (?code=XXXX) ──

  function checkUrlCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const raw = code.trim().toUpperCase();
    codeInput.value = raw;

    // Small delay so the page renders first, then auto-submit
    setTimeout(() => {
      handleCodeSubmit();
    }, 600);
  }

  // ── Code Input ─────────────────────────────────────────

  function initCodeInput() {
    codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCodeSubmit();
      }
    });
    codeSubmitBtn.addEventListener('click', handleCodeSubmit);
  }

  function handleCodeSubmit() {
    const raw = codeInput.value.trim().toUpperCase();
    hideError();

    if (!raw) return;

    // Luna Easter egg
    if (raw === 'LUNA') {
      showLunaMemorial();
      return;
    }

    const guest = findGuestByCode(raw);
    if (!guest) {
      showError('Code not recognized. Please check your invitation and try again.');
      return;
    }

    selectedGuest = guest;
    usedCode = raw;
    checkAndShowInvitation(raw);
  }

  // ── Check & Show Invitation ─────────────────────────────

  async function checkAndShowInvitation(code) {
    if (!selectedGuest) return;

    showState('loading');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/rsvp/check/${encodeURIComponent(selectedGuest.id)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Server error');
      const data = await res.json();

      if (data.found) {
        // Pre-populate toggles from previous response
        memberStates = {};
        const attending = data.attendingMembers || [];
        const declining = data.decliningMembers || [];
        for (const m of selectedGuest.members) {
          if (attending.includes(m)) {
            memberStates[m] = true;
          } else if (declining.includes(m)) {
            memberStates[m] = false;
          } else {
            memberStates[m] = true; // default ON
          }
        }
        plusOneAttending = data.plusOneName ? true : false;
        plusOneName = data.plusOneName || '';
      } else {
        initMemberStatesDefault();
      }

      showInvitationCard(code);
    } catch (err) {
      showState('search');
      showError(err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : 'Could not connect to server. Please try again.');
    }
  }

  function initMemberStatesDefault() {
    memberStates = {};
    for (const m of selectedGuest.members) {
      memberStates[m] = true; // all ON by default
    }
    plusOneAttending = false;
    plusOneName = '';
  }

  // ── Invitation Card ─────────────────────────────────────

  function showInvitationCard(code) {
    populateInviteCard();

    // Clear any previous animation classes
    inviteState.classList.remove('dealing', 'dealt', 'flipped');

    showState('invite');
    inviteState.dataset.code = code;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      inviteState.classList.add('dealt', 'flipped');
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inviteState.classList.add('dealing');
        spawnDealSparkles();

        setTimeout(() => {
          inviteState.classList.remove('dealing');
          inviteState.classList.add('dealt');

          setTimeout(() => {
            inviteState.classList.add('flipped');
          }, 200);
        }, 550);
      });
    });
  }

  function spawnDealSparkles() {
    const card = inviteCard;
    const rect = card.getBoundingClientRect();
    const count = 12;
    const colors = ['#D4A853', '#C4956A', '#a99ad4', '#fff'];

    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      const size = 2 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = Math.random() * 300;
      const duration = 400 + Math.random() * 400;
      const startX = rect.left + rect.width / 2 + (Math.random() - 0.5) * 60;
      const startY = rect.top + (Math.random() - 0.5) * 40;
      const driftX = (Math.random() - 0.5) * 80;
      const driftY = -20 + Math.random() * 60;

      spark.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        opacity: 1;
        transition: transform ${duration}ms ease-out, opacity ${duration * 0.6}ms ease ${duration * 0.4}ms;
      `;
      document.body.appendChild(spark);

      setTimeout(() => {
        spark.style.transform = `translate(${driftX}px, ${driftY}px) scale(0)`;
        spark.style.opacity = '0';
      }, delay);

      setTimeout(() => spark.remove(), delay + duration + 100);
    }
  }

  function populateInviteCard() {
    const guest = selectedGuest;
    inviteTitle.textContent = guest.display;
    inviteMembers.style.display = 'none';

    // Adjust card height for large groups
    const cardInner = inviteCard.querySelector('.rsvp-invite-card-inner');
    const memberCount = guest.members.length + (guest.plusOne ? 1 : 0);
    if (memberCount > 3) {
      cardInner.style.paddingTop = (140 + (memberCount - 3) * 15) + '%';
    } else {
      cardInner.style.paddingTop = '';
    }

    buildMemberToggles();
    updateConfirmButton();
  }

  // ── Member Toggles ────────────────────────────────────

  function buildMemberToggles() {
    const guest = selectedGuest;
    attendanceContainer.innerHTML = '';

    // Shimmer hint (first time only)
    const showHint = !hintShown;
    if (showHint) {
      const hint = document.createElement('p');
      hint.className = 'rsvp-star-hint';
      hint.textContent = 'Touch the stars to reveal who shall attend';
      attendanceContainer.appendChild(hint);
      hintShown = true;
      // After fade-out animation (7s), smoothly collapse the space
      setTimeout(() => {
        if (!hint.parentNode) return;
        const h = hint.offsetHeight;
        hint.style.height = h + 'px';
        hint.style.overflow = 'hidden';
        requestAnimationFrame(() => {
          hint.style.transition = 'height 0.6s ease, margin-bottom 0.6s ease';
          hint.style.height = '0';
          hint.style.marginBottom = '0';
        });
        setTimeout(() => { if (hint.parentNode) hint.remove(); }, 700);
      }, 7000);
    }

    const starSVG = '<svg viewBox="0 0 24 24"><path d="M12 2 L14.5 8.5 L21.5 9.5 L16 14.5 L17.5 21.5 L12 18 L6.5 21.5 L8 14.5 L2.5 9.5 L9.5 8.5 Z"/></svg>';

    // Build toggle for each member
    for (const member of guest.members) {
      const isOn = memberStates[member] !== false;
      const row = document.createElement('div');
      row.className = 'rsvp-member-toggle' + (isOn ? ' attending' : ' not-attending');
      row.dataset.member = member;

      const starBtn = document.createElement('button');
      starBtn.type = 'button';
      starBtn.className = 'rsvp-member-star';
      starBtn.innerHTML = starSVG;
      starBtn.setAttribute('aria-label', `Toggle ${member}`);
      starBtn.addEventListener('click', () => toggleMember(member));

      const nameSpan = document.createElement('span');
      nameSpan.className = 'rsvp-member-name';
      nameSpan.textContent = member;

      row.appendChild(starBtn);
      row.appendChild(nameSpan);
      attendanceContainer.appendChild(row);
    }

    // Plus-one toggle
    if (guest.plusOne) {
      const isOn = plusOneAttending;
      const row = document.createElement('div');
      row.className = 'rsvp-member-toggle' + (isOn ? ' attending' : ' not-attending');
      row.dataset.member = '__plusone__';

      const starBtn = document.createElement('button');
      starBtn.type = 'button';
      starBtn.className = 'rsvp-member-star';
      starBtn.innerHTML = starSVG;
      starBtn.setAttribute('aria-label', 'Toggle guest');
      starBtn.addEventListener('click', () => togglePlusOne());

      const nameSpan = document.createElement('span');
      nameSpan.className = 'rsvp-member-name';
      nameSpan.textContent = 'Guest';

      row.appendChild(starBtn);
      row.appendChild(nameSpan);

      // Plus-one name input (shown when ON)
      if (isOn) {
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'rsvp-plusone-name';
        nameInput.placeholder = "Guest's name...";
        nameInput.value = plusOneName;
        nameInput.maxLength = 60;
        nameInput.addEventListener('input', (e) => { plusOneName = e.target.value; });
        row.appendChild(nameInput);
      }

      attendanceContainer.appendChild(row);
    }

    // Synchronized star pulse on first load
    if (showHint) {
      requestAnimationFrame(() => {
        const starBtns = attendanceContainer.querySelectorAll('.rsvp-member-star');
        starBtns.forEach(btn => btn.classList.add('hint-pulse'));
        setTimeout(() => {
          starBtns.forEach(btn => btn.classList.remove('hint-pulse'));
        }, 5500);
      });
    }
  }

  function toggleMember(member) {
    memberStates[member] = !memberStates[member];
    refreshToggles();
    updateConfirmButton();
  }

  function togglePlusOne() {
    plusOneAttending = !plusOneAttending;
    if (!plusOneAttending) plusOneName = '';
    refreshToggles();
    updateConfirmButton();
  }

  function refreshToggles() {
    const rows = attendanceContainer.querySelectorAll('.rsvp-member-toggle');
    rows.forEach(row => {
      const member = row.dataset.member;
      let isOn;
      if (member === '__plusone__') {
        isOn = plusOneAttending;
      } else {
        isOn = memberStates[member] !== false;
      }
      row.classList.toggle('attending', isOn);
      row.classList.toggle('not-attending', !isOn);

      // Handle plus-one name input visibility
      if (member === '__plusone__') {
        const existing = row.querySelector('.rsvp-plusone-name');
        if (isOn && !existing) {
          const nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.className = 'rsvp-plusone-name';
          nameInput.placeholder = "Guest's name...";
          nameInput.value = plusOneName;
          nameInput.maxLength = 60;
          nameInput.addEventListener('input', (e) => { plusOneName = e.target.value; });
          row.appendChild(nameInput);
        } else if (!isOn && existing) {
          existing.remove();
        }
      }
    });
  }

  function updateConfirmButton() {
    const anyAttending = Object.values(memberStates).some(v => v) || plusOneAttending;
    const btnText = confirmBtn.querySelector('span:last-child');
    const btnIcon = confirmBtn.querySelector('.rsvp-confirm-icon');

    if (anyAttending) {
      btnText.textContent = 'Confirm Response';
      btnIcon.innerHTML = '&#10022;';
      confirmBtn.classList.remove('decline-mode');
    } else {
      btnText.textContent = 'Send Regrets';
      btnIcon.innerHTML = '&#9790;';
      confirmBtn.classList.add('decline-mode');
    }
  }

  // ── Confirm Button ────────────────────────────────────

  function initConfirmButton() {
    confirmBtn.addEventListener('click', () => {
      const code = inviteState.dataset.code || usedCode || '';
      submitRsvp(code);
    });
  }

  // ── Submit RSVP ─────────────────────────────────────────

  async function submitRsvp(code) {
    if (!selectedGuest) return;

    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';

    const attendingMembers = selectedGuest.members.filter(m => memberStates[m]);
    const decliningMembers = selectedGuest.members.filter(m => !memberStates[m]);
    let totalAttending = attendingMembers.length;
    if (plusOneAttending) totalAttending++;

    const attendance = totalAttending > 0 ? 'accept' : 'decline';

    const payload = {
      groupId: selectedGuest.id,
      displayName: selectedGuest.display,
      members: selectedGuest.members,
      headCount: selectedGuest.headCount,
      attendance,
      respondedBy: code,
      attendingMembers,
      decliningMembers,
      plusOneName: plusOneAttending ? (plusOneName.trim() || null) : null,
      totalAttending,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Something went wrong');
      }

      if (attendance === 'accept') {
        launchAcceptAnimation(totalAttending, attendingMembers);
      } else {
        launchDeclineAnimation();
      }
    } catch (err) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '';
      showError(err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : (err.message || 'Failed to submit. Please try again.'));
    }
  }

  // ── Back Buttons ────────────────────────────────────────

  function initBackButtons() {
    document.getElementById('rsvp-back-success')?.addEventListener('click', returnToInviteCard);
  }

  function returnToInviteCard() {
    if (!selectedGuest) { resetToSearch(); return; }

    inviteState.classList.remove('dealing', 'dealt', 'flipped', 'dissolving', 'dissolving-decline');
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '';
    inviteCard.style.visibility = '';
    const frontFace = inviteCard.querySelector('.rsvp-invite-front');
    if (frontFace) { frontFace.style.maskImage = ''; frontFace.style.webkitMaskImage = ''; }

    const icon = successState.querySelector('.rsvp-success-icon');
    const title = successState.querySelector('.rsvp-success-title');
    if (icon) { icon.innerHTML = '&#10022;'; icon.style.color = ''; icon.style.textShadow = ''; }
    if (title) title.textContent = 'The Stars Have Spoken';
    successState.style.opacity = '';
    successState.style.transform = '';
    successState.style.transition = '';

    // If we already have toggle states (from user interaction), re-show card directly
    // instead of re-fetching from server (avoids overwrite if backend lacks new fields)
    if (Object.keys(memberStates).length > 0) {
      showInvitationCard(usedCode || '');
    } else {
      checkAndShowInvitation(usedCode || '');
    }
  }

  function resetToSearch() {
    selectedGuest = null;
    usedCode = null;
    memberStates = {};
    plusOneAttending = false;
    plusOneName = '';
    codeInput.value = '';
    inviteState.classList.remove('dealing', 'dealt', 'flipped', 'dissolving', 'dissolving-decline');
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '';

    inviteCard.style.visibility = '';
    const frontFace = inviteCard.querySelector('.rsvp-invite-front');
    if (frontFace) { frontFace.style.maskImage = ''; frontFace.style.webkitMaskImage = ''; }

    const icon = successState.querySelector('.rsvp-success-icon');
    const title = successState.querySelector('.rsvp-success-title');
    if (icon) { icon.innerHTML = '&#10022;'; icon.style.color = ''; icon.style.textShadow = ''; }
    if (title) title.textContent = 'The Stars Have Spoken';
    successState.style.opacity = '';
    successState.style.transform = '';
    successState.style.transition = '';

    showState('search');
    codeInput.focus();
  }

  // ── State Management ────────────────────────────────────

  function showState(name) {
    const cardInnerEl = document.querySelector('.rsvp-card-inner');
    const states = [searchState, inviteState, alreadyState, successState, loadingState];
    const map = {
      search: searchState,
      invite: inviteState,
      already: alreadyState,
      success: successState,
      loading: loadingState,
    };
    const target = map[name];
    if (!target) return;

    const startH = cardInnerEl ? cardInnerEl.offsetHeight : 0;

    states.forEach(el => { el.style.display = 'none'; });
    target.style.display = '';

    if (cardInnerEl && startH > 0) {
      const endH = cardInnerEl.scrollHeight;
      if (Math.abs(endH - startH) > 5) {
        cardInnerEl.style.height = startH + 'px';
        requestAnimationFrame(() => {
          cardInnerEl.style.height = endH + 'px';
          const onEnd = () => {
            cardInnerEl.style.height = '';
            cardInnerEl.removeEventListener('transitionend', onEnd);
          };
          cardInnerEl.addEventListener('transitionend', onEnd);
        });
      }
    }
  }

  // ── Error Display ───────────────────────────────────────

  function showError(msg) {
    searchError.textContent = msg;
    searchError.style.display = '';
  }

  function hideError() {
    searchError.style.display = 'none';
    searchError.textContent = '';
  }

  // ── Luna Memorial Easter Egg ────────────────────────────

  function isLuna(name) {
    return name.toLowerCase().replace(/\s+/g, '') === 'luna';
  }

  function showLunaMemorial() {
    const memorial = document.getElementById('luna-memorial');
    if (!memorial) return;

    memorial.classList.add('open');
    memorial.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const card = memorial.querySelector('.luna-memorial-card');
    if (card && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i < 30; i++) {
        setTimeout(() => spawnPortalStar(card), i * 80);
      }
      memorial._starInterval = setInterval(() => {
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) spawnPortalStar(card);
      }, 120);
    }

    const closeBtn = memorial.querySelector('.luna-memorial-close');
    const backdrop = memorial.querySelector('.luna-memorial-backdrop');

    function closeLuna() {
      memorial.classList.remove('open');
      memorial.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (memorial._starInterval) clearInterval(memorial._starInterval);
    }

    closeBtn?.addEventListener('click', closeLuna);
    backdrop?.addEventListener('click', closeLuna);
    document.addEventListener('keydown', function lunaEsc(e) {
      if (e.key === 'Escape' && memorial.classList.contains('open')) {
        closeLuna();
        document.removeEventListener('keydown', lunaEsc);
      }
    });
  }

  function spawnPortalStar(card) {
    const star = document.createElement('div');
    star.className = 'luna-portal-star';

    const W = card.offsetWidth;
    const H = card.offsetHeight;
    const size = 1.5 + Math.random() * 1.5;
    const dur = 800 + Math.random() * 1000;

    const edge = Math.floor(Math.random() * 4);
    let x, y, dx, dy;

    switch (edge) {
      case 0: x = Math.random() * W; y = 0; dx = (Math.random() - 0.5) * 16; dy = 15 + Math.random() * 25; break;
      case 1: x = W; y = Math.random() * H; dx = -(15 + Math.random() * 25); dy = (Math.random() - 0.5) * 16; break;
      case 2: x = Math.random() * W; y = H; dx = (Math.random() - 0.5) * 16; dy = -(15 + Math.random() * 25); break;
      case 3: x = 0; y = Math.random() * H; dx = 15 + Math.random() * 25; dy = (Math.random() - 0.5) * 16; break;
    }

    star.style.cssText = `
      left: ${x}px; top: ${y}px;
      width: ${size}px; height: ${size}px;
      -webkit-transition: transform ${dur}ms ease-out, opacity ${dur}ms ease-out;
      transition: transform ${dur}ms ease-out, opacity ${dur}ms ease-out;
    `;
    card.appendChild(star);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        star.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
        star.style.opacity = '0';
      });
    });

    setTimeout(() => star.remove(), dur + 50);
  }

  // ── Star Constellation ─────────────────────────────────

  function hashStr(str, seed) {
    let h = seed || 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  const CONSTELLATION_PATTERNS = {
    2: { nodes: [[-14, 0], [14, 0]], edges: [[0, 1]] },
    3: { nodes: [[-16, 8], [0, -12], [16, 6]], edges: [[0, 1], [1, 2]] },
    4: { nodes: [[-18, -6], [-2, -14], [14, -4], [6, 12]], edges: [[0, 1], [1, 2], [2, 3]] },
    5: { nodes: [[-20, 4], [-8, -14], [8, -10], [18, 2], [6, 14]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    6: { nodes: [[-22, 0], [-10, -14], [6, -12], [18, -2], [12, 12], [-4, 14]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
  };

  function makeStarPath(points, outerR, innerR) {
    const cx = 12, cy = 12, step = Math.PI / points;
    let d = '';
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = i * step - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    return d + 'Z';
  }

  const STAR_PATHS = [
    makeStarPath(4, 10, 3.5),
    makeStarPath(5, 10, 4.2),
    makeStarPath(6, 10, 5),
  ];

  function initStarfield() {
    if (!starfield || typeof GUEST_LIST === 'undefined') return;

    const cardZone = { left: 25, right: 75, top: 15, bottom: 85 };

    function isInsideCard(xPct, yPct) {
      return xPct > cardZone.left && xPct < cardZone.right &&
             yPct > cardZone.top && yPct < cardZone.bottom;
    }

    const isMobile = window.innerWidth < 768;
    const cScale = isMobile ? 0.55 : 1.0;
    const sfW = starfield.offsetWidth || 375;
    const sfH = starfield.offsetHeight || 500;

    function boundingRadiusPx(hc) {
      if (hc === 1) {
        const avgStarSize = isMobile ? 5.5 : 9.5;
        return avgStarSize + 2;
      }
      const p = CONSTELLATION_PATTERNS[hc];
      if (!p) return 10;
      let maxR = 0;
      for (const [nx, ny] of p.nodes) {
        maxR = Math.max(maxR, Math.sqrt(nx * nx + ny * ny));
      }
      return maxR * cScale + 4;
    }

    const placed = [];

    function isTooClose(xPct, yPct, hc) {
      const px1 = xPct * sfW / 100;
      const py1 = yPct * sfH / 100;
      const r1 = boundingRadiusPx(hc);
      for (const p of placed) {
        const px2 = p.x * sfW / 100;
        const py2 = p.y * sfH / 100;
        const dx = px1 - px2;
        const dy = py1 - py2;
        const minDist = r1 + boundingRadiusPx(p.hc);
        if (Math.sqrt(dx * dx + dy * dy) < minDist) return true;
      }
      return false;
    }

    const yMin = isMobile ? 12 : 10;
    const yRange = isMobile ? 68 : 80;
    const yBottom = isMobile ? 78 : 86;
    const yBottomRange = isMobile ? 3 : 4;

    function computeRawPos(id, seed1, seed2) {
      return {
        x: 8 + hashStr(id, seed1) * 84,
        y: yMin + hashStr(id, seed2) * yRange,
      };
    }

    function pushToEdge(id, gi, seed) {
      const side = (gi + seed) % 4;
      let x, y;
      if (side === 0)      { x = 4 + hashStr(id, 300 + seed) * 18;  y = yMin + hashStr(id, 400 + seed) * yRange; }
      else if (side === 1) { x = 78 + hashStr(id, 300 + seed) * 18; y = yMin + hashStr(id, 400 + seed) * yRange; }
      else if (side === 2) { x = 4 + hashStr(id, 300 + seed) * 92;  y = yMin + hashStr(id, 400 + seed) * 4; }
      else                 { x = 4 + hashStr(id, 300 + seed) * 92;  y = yBottom + hashStr(id, 400 + seed) * yBottomRange; }
      return { x, y };
    }

    function getPosition(guest, gi) {
      const hc = guest.headCount || 1;
      let { x, y } = computeRawPos(guest.id, 1, 2);
      if (isInsideCard(x, y)) {
        ({ x, y } = pushToEdge(guest.id, gi, 0));
      }
      if (isTooClose(x, y, hc)) {
        for (let t = 1; t <= 80; t++) {
          const alt = computeRawPos(guest.id, 100 + t, 200 + t);
          if (!isInsideCard(alt.x, alt.y) && !isTooClose(alt.x, alt.y, hc)) {
            x = alt.x; y = alt.y; break;
          }
          const edge = pushToEdge(guest.id, gi, t);
          if (!isTooClose(edge.x, edge.y, hc)) {
            x = edge.x; y = edge.y; break;
          }
        }
      }
      placed.push({ x, y, hc });
      return { x, y };
    }

    function createStarEl(size, pathD) {
      const star = document.createElement('div');
      star.className = 'rsvp-starfield-star';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      svg.appendChild(path);
      star.appendChild(svg);
      return star;
    }

    for (let gi = 0; gi < GUEST_LIST.length; gi++) {
      const guest = GUEST_LIST[gi];
      const hc = guest.headCount || 1;
      const size = isMobile
        ? 4 + hashStr(guest.id, 99) * 3
        : 7 + hashStr(guest.id, 99) * 5;
      const pos = getPosition(guest, gi);

      const starPathIdx = Math.floor(hashStr(guest.id, 55) * 3);
      const starPath = STAR_PATHS[starPathIdx];

      if (hc === 1) {
        const star = createStarEl(size, starPath);
        star.dataset.groupId = guest.id;
        star.style.left = pos.x + '%';
        star.style.top = pos.y + '%';
        starfield.appendChild(star);
        starMap[guest.id] = { container: star, stars: [star], lines: [], headCount: 1 };
      } else {
        const pattern = CONSTELLATION_PATTERNS[hc];
        if (!pattern) continue;

        const wrapper = document.createElement('div');
        wrapper.className = 'rsvp-constellation';
        wrapper.dataset.groupId = guest.id;
        wrapper.style.left = pos.x + '%';
        wrapper.style.top = pos.y + '%';

        const angle = hashStr(guest.id, 50) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const starEls = [];
        const nodePositions = [];

        for (let ni = 0; ni < pattern.nodes.length; ni++) {
          const [nx, ny] = pattern.nodes[ni];
          const rx = (nx * cosA - ny * sinA) * cScale;
          const ry = (nx * sinA + ny * cosA) * cScale;
          nodePositions.push([rx, ry]);

          const starSize = size * (0.85 + hashStr(guest.id, 200 + ni) * 0.3);
          const niPath = STAR_PATHS[Math.floor(hashStr(guest.id, 55 + ni * 11) * 3)];
          const starEl = createStarEl(starSize, niPath);
          starEl.style.position = 'absolute';
          starEl.style.left = (rx - starSize / 2) + 'px';
          starEl.style.top = (ry - starSize / 2) + 'px';
          wrapper.appendChild(starEl);
          starEls.push(starEl);
        }

        const svgNS = 'http://www.w3.org/2000/svg';
        const linesSvg = document.createElementNS(svgNS, 'svg');
        linesSvg.setAttribute('class', 'rsvp-constellation-lines');
        linesSvg.setAttribute('overflow', 'visible');

        const lineEls = [];
        const inset = isMobile ? 2 : 3;
        for (const [a, b] of pattern.edges) {
          const [ax, ay] = nodePositions[a];
          const [bx, by] = nodePositions[b];
          const dx = bx - ax;
          const dy = by - ay;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ux = dx / len;
          const uy = dy / len;
          const line = document.createElementNS(svgNS, 'line');
          line.setAttribute('x1', ax + ux * inset);
          line.setAttribute('y1', ay + uy * inset);
          line.setAttribute('x2', bx - ux * inset);
          line.setAttribute('y2', by - uy * inset);
          const trimmedLen = Math.max(0, len - inset * 2);
          line.style.setProperty('--line-len', trimmedLen.toFixed(1));
          linesSvg.appendChild(line);
          lineEls.push(line);
        }

        wrapper.appendChild(linesSvg);
        starfield.appendChild(wrapper);
        starMap[guest.id] = { container: wrapper, stars: starEls, lines: lineEls, headCount: hc };
      }
    }
  }

  // ── Load Previously Accepted Stars ─────────────────────

  async function loadAcceptedStars() {
    try {
      const res = await fetch(`${API_BASE}/rsvp/accepted`);
      if (!res.ok) return;
      const accepted = await res.json(); // array of { groupId, totalAttending, attendingMembers }
      for (const item of accepted) {
        const groupId = item.groupId;
        const entry = starMap[groupId];
        if (!entry) continue;

        // Light up stars for attending members
        const guest = GUEST_LIST.find(g => g.id === groupId);
        const attendingMembers = item.attendingMembers || [];

        if (entry.headCount === 1) {
          // Single star — light if attending
          if (attendingMembers.length > 0 || item.totalAttending > 0) {
            const star = entry.stars[0];
            star.style.setProperty('--twinkle-dur', (2.5 + hashStr(groupId, 77) * 1.5) + 's');
            star.style.setProperty('--twinkle-delay', (hashStr(groupId, 88) * 2) + 's');
            star.classList.add('lit');
          }
        } else if (guest) {
          // Multi-star: light only attending member stars
          for (let si = 0; si < entry.stars.length; si++) {
            const memberName = guest.members[si];
            if (attendingMembers.includes(memberName) || (attendingMembers.length === 0 && item.totalAttending > 0)) {
              const star = entry.stars[si];
              star.style.setProperty('--twinkle-dur', (2.5 + hashStr(groupId, 77 + si * 13) * 1.5) + 's');
              star.style.setProperty('--twinkle-delay', (hashStr(groupId, 88 + si * 7) * 2) + 's');
              star.classList.add('lit');
            }
          }
          // Light lines only if both endpoints are attending
          for (let li = 0; li < entry.lines.length; li++) {
            const pattern = CONSTELLATION_PATTERNS[entry.headCount];
            if (!pattern) continue;
            const [a, b] = pattern.edges[li];
            const mA = guest.members[a];
            const mB = guest.members[b];
            const aLit = attendingMembers.includes(mA) || (attendingMembers.length === 0 && item.totalAttending > 0);
            const bLit = attendingMembers.includes(mB) || (attendingMembers.length === 0 && item.totalAttending > 0);
            if (aLit && bLit) {
              entry.lines[li].classList.add('lit');
            }
          }
        }
      }
    } catch (_) {
      // Silently fail
    }
  }

  // ── Accept Animation — Dissolve + Star Flight ─────────

  function launchAcceptAnimation(totalAttending, attendingMembers) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const groupId = selectedGuest.id;
    const entry = starMap[groupId];
    const guest = GUEST_LIST.find(g => g.id === groupId);

    // Determine which stars are newly attending vs already lit
    let starsToFly = attendingMembers;
    if (entry && guest) {
      const alreadyLit = [];
      if (entry.headCount === 1) {
        if (entry.stars[0].classList.contains('lit')) alreadyLit.push(guest.members[0]);
      } else {
        for (let si = 0; si < entry.stars.length; si++) {
          if (entry.stars[si].classList.contains('lit')) alreadyLit.push(guest.members[si]);
        }
      }
      starsToFly = attendingMembers.filter(m => !alreadyLit.includes(m));

      // Dim stars that were lit but are no longer attending
      const toDim = alreadyLit.filter(m => !attendingMembers.includes(m));
      if (toDim.length > 0) {
        dimSpecificStars(groupId, toDim);
      }
    }

    if (prefersReduced) {
      lightUpConstellation(groupId, attendingMembers);
      showAcceptSuccess();
      return;
    }

    // No new stars to fly — show success immediately
    if (starsToFly.length === 0) {
      showAcceptSuccess();
      return;
    }

    const rect = inviteCard.getBoundingClientRect();
    const cardInner = inviteCard.querySelector('.rsvp-invite-card-inner');
    const DISSOLVE_DUR = 1600;
    let start = null;

    inviteState.classList.add('dissolving');

    const frontFace = cardInner.querySelector('.rsvp-invite-front');
    const W = inviteCard.offsetWidth;
    const H = inviteCard.offsetHeight;
    const maxR = Math.sqrt(W * W + H * H) / 2;

    function frame(ts) {
      if (!start) start = ts;
      const t = Math.min((ts - start) / DISSOLVE_DUR, 1);

      const edgePct = (1 - t) * 100;
      const soft = 12;
      const inner = Math.max(0, edgePct - soft);
      const outer = Math.min(100, edgePct + 2);
      const mask = `radial-gradient(circle at 50% 50%, black ${inner}%, transparent ${outer}%)`;
      frontFace.style.maskImage = mask;
      frontFace.style.webkitMaskImage = mask;

      if (t > 0.02 && t < 0.95) {
        const edgeR = (edgePct / 100) * maxR;
        const count = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          spawnDissolveDust(rect, edgeR);
        }
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        inviteCard.style.visibility = 'hidden';
        frontFace.style.maskImage = '';
        frontFace.style.webkitMaskImage = '';

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        flyStarToPlaceholder(cx, cy, selectedGuest.id, starsToFly, attendingMembers);
      }
    }

    requestAnimationFrame(frame);
  }

  function spawnDissolveDust(cardRect, edgeRadiusPx) {
    const p = document.createElement('div');
    const size = 0.6 + Math.random() * 1.2;
    const colors = ['#f5e6a0', '#d4a853', '#C4956A', '#fff'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const angle = Math.random() * Math.PI * 2;
    const cx = cardRect.left + cardRect.width / 2;
    const cy = cardRect.top + cardRect.height / 2;
    const spawnR = edgeRadiusPx + 5 + Math.random() * 10;
    const startX = cx + Math.cos(angle) * spawnR + (Math.random() - 0.5) * 8;
    const startY = cy + Math.sin(angle) * spawnR + (Math.random() - 0.5) * 8;
    const dur = 400 + Math.random() * 400;
    const drift = Math.cos(angle) * (15 + Math.random() * 30);
    const rise = Math.sin(angle) * (15 + Math.random() * 30) - 10;

    p.style.cssText = `
      position: fixed;
      left: ${startX}px; top: ${startY}px;
      width: ${size}px; height: ${size}px;
      background: radial-gradient(circle, ${color}, rgba(212,168,83,0.5));
      box-shadow: 0 0 ${1 + Math.random() * 2}px rgba(212,168,83,0.5);
      border-radius: 50%;
      pointer-events: none;
      z-index: 200;
      opacity: 1;
      transition: transform ${dur}ms ease-out, opacity ${dur}ms ease;
    `;
    document.body.appendChild(p);

    requestAnimationFrame(() => {
      p.style.transform = `translate(${drift}px, ${rise}px) scale(0)`;
      p.style.opacity = '0';
    });

    setTimeout(() => p.remove(), dur + 50);
  }

  function lightUpOneStar(starEl, cb) {
    starEl.classList.add('lighting-up');
    setTimeout(() => {
      starEl.classList.remove('lighting-up');
      starEl.style.setProperty('--twinkle-dur', (2.5 + Math.random() * 1.5) + 's');
      starEl.style.setProperty('--twinkle-delay', (Math.random() * 0.5) + 's');
      starEl.classList.add('lit');
      if (cb) cb();
    }, 300);
  }

  function drawOneLine(lineEl, cb) {
    lineEl.classList.add('lighting-up');
    setTimeout(() => {
      lineEl.classList.remove('lighting-up');
      lineEl.classList.add('lit');
      if (cb) cb();
    }, 400);
  }

  function flyStarToPlaceholder(fromX, fromY, groupId, starsToFly, allAttending) {
    const entry = starMap[groupId];
    if (!entry) {
      showAcceptSuccess();
      return;
    }

    const guest = GUEST_LIST.find(g => g.id === groupId);
    const startSize = 24;
    const FLIGHT_DUR = 1000;
    const STAGGER = 250;

    // Only fly stars for newly attending members (starsToFly)
    const targetIndices = [];
    if (entry.headCount === 1) {
      targetIndices.push(0);
    } else if (guest) {
      for (let si = 0; si < guest.members.length; si++) {
        if (starsToFly.includes(guest.members[si])) {
          targetIndices.push(si);
        }
      }
    }

    if (targetIndices.length === 0) {
      showAcceptSuccess();
      return;
    }

    const starTargets = targetIndices.map(si => {
      const s = entry.stars[si];
      const r = s.getBoundingClientRect();
      return {
        idx: si,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        size: s.querySelector('svg')?.getAttribute('width') || 8,
      };
    });

    const isLast = (i) => i === starTargets.length - 1;

    for (let i = 0; i < starTargets.length; i++) {
      const delay = i * STAGGER;
      setTimeout(() => {
        const target = starTargets[i];
        const flyer = document.createElement('div');
        flyer.className = 'rsvp-flying-star';
        flyer.innerHTML = '<svg viewBox="0 0 24 24" width="' + startSize + '" height="' + startSize + '"><path d="' + STAR_PATHS[1] + '" fill="#f5e6a0"/></svg>';
        flyer.style.left = (fromX - startSize / 2) + 'px';
        flyer.style.top = (fromY - startSize / 2) + 'px';
        document.body.appendChild(flyer);

        const dx = target.x - fromX;
        const dy = target.y - fromY;

        requestAnimationFrame(() => {
          flyer.style.transition = `transform ${FLIGHT_DUR}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
          flyer.style.transform = `translate(${dx}px, ${dy}px) scale(${target.size / startSize})`;
        });

        setTimeout(() => {
          flyer.remove();
          const si = target.idx;

          // Draw lines connecting to already-lit stars (use allAttending for check)
          if (guest && entry.headCount > 1) {
            const pattern = CONSTELLATION_PATTERNS[entry.headCount];
            if (pattern) {
              for (let li = 0; li < pattern.edges.length; li++) {
                const [a, b] = pattern.edges[li];
                if (a === si || b === si) {
                  const otherIdx = a === si ? b : a;
                  const otherMember = guest.members[otherIdx];
                  if (allAttending.includes(otherMember) && entry.stars[otherIdx].classList.contains('lit')) {
                    drawOneLine(entry.lines[li]);
                  }
                }
              }
            }
          }

          lightUpOneStar(entry.stars[si], () => {
            if (isLast(i)) setTimeout(showAcceptSuccess, 400);
          });
        }, FLIGHT_DUR);
      }, delay);
    }
  }

  function lightUpConstellation(groupId, attendingMembers) {
    const entry = starMap[groupId];
    if (!entry) return;

    const guest = GUEST_LIST.find(g => g.id === groupId);

    if (entry.headCount === 1) {
      const star = entry.stars[0];
      star.style.setProperty('--twinkle-dur', (2.5 + Math.random() * 1.5) + 's');
      star.style.setProperty('--twinkle-delay', (Math.random() * 0.5) + 's');
      star.classList.add('lit');
      return;
    }

    if (!guest) return;

    for (let si = 0; si < entry.stars.length; si++) {
      if (attendingMembers.includes(guest.members[si])) {
        const s = entry.stars[si];
        s.style.setProperty('--twinkle-dur', (2.5 + Math.random() * 1.5) + 's');
        s.style.setProperty('--twinkle-delay', (Math.random() * 0.5) + 's');
        s.classList.add('lit');
      }
    }

    const pattern = CONSTELLATION_PATTERNS[entry.headCount];
    if (pattern) {
      for (let li = 0; li < pattern.edges.length; li++) {
        const [a, b] = pattern.edges[li];
        if (attendingMembers.includes(guest.members[a]) && attendingMembers.includes(guest.members[b])) {
          entry.lines[li].classList.add('lit');
        }
      }
    }
  }

  function dimSpecificStars(groupId, membersToDim) {
    const entry = starMap[groupId];
    if (!entry) return;
    const guest = GUEST_LIST.find(g => g.id === groupId);
    if (!guest) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (let si = 0; si < entry.stars.length; si++) {
      if (membersToDim.includes(guest.members[si])) {
        const star = entry.stars[si];
        star.classList.remove('lighting-up');
        if (prefersReduced) {
          star.classList.remove('lit');
        } else {
          star.style.transition = 'opacity 2s ease, transform 2s ease';
          star.style.opacity = '0.12';
          star.style.transform = 'scale(1)';
          setTimeout(((s) => () => {
            s.classList.remove('lit');
            s.style.transition = '';
            s.style.opacity = '';
            s.style.transform = '';
          })(star), 2100);
        }
      }
    }

    if (entry.headCount > 1) {
      const pattern = CONSTELLATION_PATTERNS[entry.headCount];
      if (pattern) {
        for (let li = 0; li < pattern.edges.length; li++) {
          const [a, b] = pattern.edges[li];
          if (membersToDim.includes(guest.members[a]) || membersToDim.includes(guest.members[b])) {
            const line = entry.lines[li];
            if (prefersReduced) {
              line.classList.remove('lit', 'lighting-up');
            } else {
              line.style.transition = 'stroke 1.5s ease, stroke-opacity 1.5s ease, filter 1.5s ease';
              line.style.stroke = 'rgba(212, 168, 83, 0.25)';
              line.style.strokeOpacity = '1';
              line.style.filter = 'none';
              setTimeout(((l) => () => {
                l.classList.remove('lit', 'lighting-up');
                l.style.transition = '';
                l.style.stroke = '';
                l.style.strokeOpacity = '';
                l.style.filter = '';
              })(line), 1600);
            }
          }
        }
      }
    }
  }

  function dimConstellation(groupId) {
    const entry = starMap[groupId];
    if (!entry) return;

    const hasLit = entry.stars.some(s => s.classList.contains('lit'));
    if (!hasLit) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (entry.headCount === 1) {
      const star = entry.stars[0];
      star.classList.remove('lighting-up');
      if (prefersReduced) {
        star.classList.remove('lit');
        return;
      }
      star.style.transition = 'opacity 2.5s ease, transform 2.5s ease';
      star.style.opacity = '0.12';
      star.style.transform = 'scale(1)';
      setTimeout(() => {
        star.classList.remove('lit');
        star.style.transition = '';
        star.style.opacity = '';
        star.style.transform = '';
      }, 2600);
      return;
    }

    if (prefersReduced) {
      for (const s of entry.stars) s.classList.remove('lit', 'lighting-up');
      for (const l of entry.lines) l.classList.remove('lit', 'lighting-up');
      return;
    }

    const steps = [];
    for (let i = entry.stars.length - 1; i >= 0; i--) {
      steps.push({ type: 'star', el: entry.stars[i] });
      if (i > 0 && entry.lines[i - 1]) {
        steps.push({ type: 'line', el: entry.lines[i - 1] });
      }
    }

    let idx = 0;
    function nextDim() {
      if (idx >= steps.length) return;
      const step = steps[idx++];
      if (step.type === 'star') {
        step.el.classList.remove('lighting-up');
        step.el.style.transition = 'opacity 2s ease, transform 2s ease';
        step.el.style.opacity = '0.12';
        step.el.style.transform = 'scale(1)';
        setTimeout(() => {
          step.el.classList.remove('lit');
          step.el.style.transition = '';
          step.el.style.opacity = '';
          step.el.style.transform = '';
        }, 2100);
      } else {
        step.el.style.transition = 'stroke 1.5s ease, stroke-opacity 1.5s ease, filter 1.5s ease';
        step.el.style.stroke = 'rgba(212, 168, 83, 0.25)';
        step.el.style.strokeOpacity = '1';
        step.el.style.filter = 'none';
        setTimeout(() => {
          step.el.classList.remove('lit', 'lighting-up');
          step.el.style.transition = '';
          step.el.style.stroke = '';
          step.el.style.strokeOpacity = '';
          step.el.style.filter = '';
        }, 1600);
      }
      setTimeout(nextDim, 400);
    }
    nextDim();
  }

  function showAcceptSuccess() {
    successMsg.textContent = `Thank you! We can\u2019t wait to celebrate with you.`;
    successSub.textContent = `We can\u2019t wait to celebrate with you!`;

    successState.style.opacity = '0';
    successState.style.transform = 'translateY(10px)';
    successState.style.transition = 'none';
    showState('success');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        successState.style.transition = 'opacity 1s ease, transform 1s ease';
        successState.style.opacity = '1';
        successState.style.transform = 'translateY(0)';
      });
    });
  }

  // ── Decline Animation — Starlight Dimming ─────────────

  function launchDeclineAnimation() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (selectedGuest) dimConstellation(selectedGuest.id);

    if (prefersReduced) {
      showDeclineSuccess();
      return;
    }

    inviteState.classList.add('dissolving-decline');

    setTimeout(() => {
      const rect = inviteCard.getBoundingClientRect();
      spawnDeclineStars(rect);
    }, 300);

    setTimeout(() => {
      showDeclineSuccess();
    }, 2200);
  }

  function showDeclineSuccess() {
    successMsg.textContent = 'Thank you for letting us know.';
    successSub.textContent = 'We\u2019ll miss you, but we appreciate the response.';

    const icon = successState.querySelector('.rsvp-success-icon');
    const title = successState.querySelector('.rsvp-success-title');
    if (icon) { icon.innerHTML = '&#9790;'; icon.style.color = 'var(--lavender)'; icon.style.textShadow = '0 0 16px rgba(139, 123, 184, 0.5)'; }
    if (title) title.textContent = 'The Universe Understands';

    successState.style.opacity = '0';
    successState.style.transform = 'translateY(10px)';
    successState.style.transition = 'none';
    showState('success');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        successState.style.transition = 'opacity 1.2s ease, transform 1.2s ease';
        successState.style.opacity = '1';
        successState.style.transform = 'translateY(0)';
      });
    });
  }

  function spawnDeclineStars(rect) {
    const count = 7;

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'rsvp-decline-star';
      star.textContent = '\u2726';
      const size = 0.5 + Math.random() * 0.4;
      const x = rect.left + rect.width * 0.1 + Math.random() * rect.width * 0.8;
      const y = rect.top + rect.height * 0.2 + Math.random() * rect.height * 0.6;
      const delay = i * 150;
      const duration = 1000 + Math.random() * 600;
      const driftX = (Math.random() - 0.5) * 30;

      star.style.left = x + 'px';
      star.style.top = y + 'px';
      star.style.fontSize = size + 'rem';
      document.body.appendChild(star);

      setTimeout(() => {
        star.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
        star.style.opacity = '0.6';
        star.style.transform = `translateY(-80px) translateX(${driftX}px)`;

        setTimeout(() => {
          star.style.opacity = '0';
        }, duration * 0.5);
      }, delay);

      setTimeout(() => star.remove(), delay + duration + 100);
    }
  }

  // ── Helpers ─────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();
