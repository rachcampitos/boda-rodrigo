/* ======================================================
   RSVP — Autocomplete search, card flip, API submission
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

  const searchInput = document.getElementById('rsvp-search-input');
  const dropdown = document.getElementById('rsvp-dropdown');
  const searchError = document.getElementById('rsvp-search-error');

  const inviteCard = inviteState.querySelector('.rsvp-invite-card');
  const inviteTitle = document.getElementById('rsvp-invite-title');
  const inviteMembers = document.getElementById('rsvp-invite-members');
  const attendBtns = inviteState.querySelectorAll('.rsvp-attend-btn');

  const alreadyMsg = document.getElementById('rsvp-already-msg');
  const changeBtn = document.getElementById('rsvp-change-btn');

  const successMsg = document.getElementById('rsvp-success-msg');
  const successSub = document.getElementById('rsvp-success-sub');
  const starfield = document.getElementById('rsvp-starfield');
  const rsvpSection = document.getElementById('rsvp');

  // State
  let selectedGuest = null;
  let activeIndex = -1;
  let results = [];
  const starMap = {}; // groupId → { container, stars[], lines[], headCount }

  function init() {
    initStarfield();
    initAutocomplete();
    initBackButtons();
    initAttendanceButtons();
    initChangeButton();
    loadAcceptedStars();
  }

  // ── Autocomplete ────────────────────────────────────────

  function initAutocomplete() {
    searchInput.addEventListener('input', onSearchInput);
    searchInput.addEventListener('keydown', onSearchKeydown);

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.rsvp-search-wrap')) {
        closeDropdown();
      }
    });
  }

  function onSearchInput() {
    const query = searchInput.value.trim();
    hideError();

    // Luna Easter egg: check on any input
    if (isLuna(query)) {
      closeDropdown();
      return;
    }

    if (query.length < 2) {
      closeDropdown();
      return;
    }

    results = searchGuests(query);
    activeIndex = -1;

    if (results.length === 0) {
      dropdown.innerHTML = '<li class="rsvp-dropdown-empty">No invitations found for that name</li>';
      dropdown.classList.add('open');
      return;
    }

    dropdown.innerHTML = results.map((r, i) => `
      <li class="rsvp-dropdown-item" role="option" data-index="${i}">
        <div class="rsvp-dropdown-name">${highlightMatch(r.matchedName, query)}</div>
        <div class="rsvp-dropdown-group">${escapeHtml(r.guest.display)}</div>
      </li>
    `).join('');

    dropdown.classList.add('open');

    // Click handlers on results
    dropdown.querySelectorAll('.rsvp-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index, 10);
        selectResult(idx);
      });
    });
  }

  function onSearchKeydown(e) {
    if (!dropdown.classList.contains('open')) {
      // Enter on Luna check
      if (e.key === 'Enter' && isLuna(searchInput.value.trim())) {
        e.preventDefault();
        showLunaMemorial();
        return;
      }
      return;
    }

    const items = dropdown.querySelectorAll('.rsvp-dropdown-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        selectResult(activeIndex);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  }

  function updateActive(items) {
    items.forEach((item, i) => {
      item.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) item.scrollIntoView({ block: 'nearest' });
    });
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    results = [];
    activeIndex = -1;
  }

  function selectResult(index) {
    const match = results[index];
    if (!match) return;
    selectedGuest = match.guest;
    searchInput.value = match.matchedName;
    closeDropdown();
    checkAndShowInvitation(match.matchedName);
  }

  // ── Search Algorithm ────────────────────────────────────

  function searchGuests(query) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = [];

    for (const guest of GUEST_LIST) {
      let matched = false;

      // Match against member names
      for (const member of guest.members) {
        const memberWords = member.toLowerCase().split(/\s+/);
        const allMatch = queryWords.every(qw =>
          memberWords.some(mw => mw.startsWith(qw))
        );
        if (allMatch) {
          matches.push({ guest, matchedName: member });
          matched = true;
          break;
        }
      }

      // Also match against display name (family/group name)
      if (!matched) {
        const displayWords = guest.display.toLowerCase().split(/\s+/);
        const displayMatch = queryWords.every(qw =>
          displayWords.some(dw => dw.startsWith(qw))
        );
        if (displayMatch) {
          matches.push({ guest, matchedName: guest.members[0] });
        }
      }
    }

    return matches.slice(0, 8);
  }

  function highlightMatch(name, query) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const words = name.split(' ');

    return words.map(word => {
      const matchedQ = queryWords.find(qw => word.toLowerCase().startsWith(qw));
      if (matchedQ) {
        const len = matchedQ.length;
        return `<mark>${escapeHtml(word.slice(0, len))}</mark>${escapeHtml(word.slice(len))}`;
      }
      return escapeHtml(word);
    }).join(' ');
  }

  // ── Check & Show Invitation ─────────────────────────────

  async function checkAndShowInvitation(respondedByName) {
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
        showAlreadyState(data, respondedByName);
      } else {
        showInvitationCard(respondedByName);
      }
    } catch (err) {
      showState('search');
      showError(err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : 'Could not connect to server. Please try again.');
    }
  }

  // ── Invitation Card ─────────────────────────────────────

  function showInvitationCard(respondedByName) {
    populateInviteCard();

    // Clear any previous animation classes
    inviteState.classList.remove('dealing', 'dealt', 'flipped');

    showState('invite');
    inviteState.dataset.respondedBy = respondedByName;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      // Skip animation — go straight to flipped
      inviteState.classList.add('dealt', 'flipped');
      return;
    }

    // Phase 1: Deal — card flies from deck to center (0.5s)
    // Double rAF ensures browser paints the base state (opacity:0) first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inviteState.classList.add('dealing');
        spawnDealSparkles();

        // Phase 2: Dealt — card arrived
        setTimeout(() => {
          inviteState.classList.remove('dealing');
          inviteState.classList.add('dealt');

          // Phase 3: Flip — reveal front face (0.8s)
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

    if (guest.members.length > 1) {
      inviteMembers.textContent = guest.members.join(' \u2022 ');
      inviteMembers.style.display = '';
    } else {
      inviteMembers.style.display = 'none';
    }
  }

  // ── Already RSVP'd State ────────────────────────────────

  function showAlreadyState(data, respondedByName) {
    const verb = data.attendance === 'accept' ? 'joyfully accepted' : 'regretfully declined';
    const date = new Date(data.createdAt).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

    alreadyMsg.innerHTML = `
      <strong>${escapeHtml(selectedGuest.display)}</strong> has ${verb} this invitation.<br>
      <span style="font-size:0.8rem;color:var(--silver-muted);">Responded by ${escapeHtml(data.respondedBy)} on ${date}</span>
    `;

    alreadyState.dataset.respondedBy = respondedByName;
    showState('already');
  }

  // ── Attendance Buttons ──────────────────────────────────

  function initAttendanceButtons() {
    attendBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const attendance = btn.dataset.attendance;
        const respondedBy = inviteState.dataset.respondedBy || '';
        submitRsvp(attendance, respondedBy);
      });
    });
  }

  function initChangeButton() {
    changeBtn.addEventListener('click', () => {
      const respondedBy = alreadyState.dataset.respondedBy || '';
      showInvitationCard(respondedBy);
    });
  }

  // ── Submit RSVP ─────────────────────────────────────────

  async function submitRsvp(attendance, respondedBy) {
    if (!selectedGuest) return;

    // Disable buttons
    attendBtns.forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });

    const payload = {
      groupId: selectedGuest.id,
      displayName: selectedGuest.display,
      members: selectedGuest.members,
      headCount: selectedGuest.headCount,
      attendance,
      respondedBy,
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

      // Success — trigger themed animation
      if (attendance === 'accept') {
        launchAcceptAnimation();
      } else {
        launchDeclineAnimation();
      }
    } catch (err) {
      attendBtns.forEach(b => { b.disabled = false; b.style.opacity = ''; });
      showError(err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : (err.message || 'Failed to submit. Please try again.'));
    }
  }

  // ── Back Buttons ────────────────────────────────────────

  function initBackButtons() {
    document.getElementById('rsvp-back-invite')?.addEventListener('click', resetToSearch);
    document.getElementById('rsvp-back-already')?.addEventListener('click', resetToSearch);
    document.getElementById('rsvp-back-success')?.addEventListener('click', resetToSearch);
  }

  function resetToSearch() {
    selectedGuest = null;
    searchInput.value = '';
    inviteState.classList.remove('dealing', 'dealt', 'flipped', 'dissolving', 'dissolving-decline');
    attendBtns.forEach(b => { b.disabled = false; b.style.opacity = ''; });

    // Clear residuals from accept dissolve
    inviteCard.style.visibility = '';
    const frontFace = inviteCard.querySelector('.rsvp-invite-front');
    if (frontFace) { frontFace.style.maskImage = ''; frontFace.style.webkitMaskImage = ''; }

    // Reset success state to default (accept) styling
    const icon = successState.querySelector('.rsvp-success-icon');
    const title = successState.querySelector('.rsvp-success-title');
    if (icon) { icon.innerHTML = '&#10022;'; icon.style.color = ''; icon.style.textShadow = ''; }
    if (title) title.textContent = 'The Stars Have Spoken';

    // Reset any inline transition/opacity on success state
    successState.style.opacity = '';
    successState.style.transform = '';
    successState.style.transition = '';

    showState('search');
    searchInput.focus();
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

    // Capture current height
    const startH = cardInnerEl ? cardInnerEl.offsetHeight : 0;

    // Switch states
    states.forEach(el => { el.style.display = 'none'; });
    target.style.display = '';

    // Animate height transition
    if (cardInnerEl && startH > 0) {
      const endH = cardInnerEl.scrollHeight;
      if (Math.abs(endH - startH) > 5) {
        cardInnerEl.style.height = startH + 'px';
        requestAnimationFrame(() => {
          cardInnerEl.style.height = endH + 'px';
          // Clear fixed height after transition
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

  // Simple deterministic hash from string → 0..1
  function hashStr(str, seed) {
    let h = seed || 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  // Chain-style constellation patterns — px offsets from center
  const CONSTELLATION_PATTERNS = {
    2: { nodes: [[-14, 0], [14, 0]], edges: [[0, 1]] },
    3: { nodes: [[-16, 8], [0, -12], [16, 6]], edges: [[0, 1], [1, 2]] },
    4: { nodes: [[-18, -6], [-2, -14], [14, -4], [6, 12]], edges: [[0, 1], [1, 2], [2, 3]] },
    5: { nodes: [[-20, 4], [-8, -14], [8, -10], [18, 2], [6, 14]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    6: { nodes: [[-22, 0], [-10, -14], [6, -12], [18, -2], [12, 12], [-4, 14]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
  };

  // Generate N-pointed star SVG path in a 24×24 viewBox
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

    // Card zone (center ~25-75% horizontal, ~15-85% vertical) to avoid
    const cardZone = { left: 25, right: 75, top: 15, bottom: 85 };

    function isInsideCard(xPct, yPct) {
      return xPct > cardZone.left && xPct < cardZone.right &&
             yPct > cardZone.top && yPct < cardZone.bottom;
    }

    // Overlap avoidance — track placed positions
    const placed = []; // { x, y, hc }

    function minSep(hc1, hc2) {
      const r1 = hc1 === 1 ? 1 : 2 + hc1 * 0.4;
      const r2 = hc2 === 1 ? 1 : 2 + hc2 * 0.4;
      return r1 + r2;
    }

    function isTooClose(x, y, hc) {
      for (const p of placed) {
        const dx = x - p.x;
        const dy = y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < minSep(hc, p.hc)) return true;
      }
      return false;
    }

    function computeRawPos(id, seed1, seed2) {
      return {
        x: 8 + hashStr(id, seed1) * 84,
        y: 10 + hashStr(id, seed2) * 80,
      };
    }

    function pushToEdge(id, gi, seed) {
      const side = (gi + seed) % 4;
      let x, y;
      if (side === 0)      { x = 8 + hashStr(id, 300 + seed) * 16;  y = 10 + hashStr(id, 400 + seed) * 80; }
      else if (side === 1) { x = 76 + hashStr(id, 300 + seed) * 16; y = 10 + hashStr(id, 400 + seed) * 80; }
      else if (side === 2) { x = 8 + hashStr(id, 300 + seed) * 84;  y = 10 + hashStr(id, 400 + seed) * 4; }
      else                 { x = 8 + hashStr(id, 300 + seed) * 84;  y = 86 + hashStr(id, 400 + seed) * 4; }
      return { x, y };
    }

    function getPosition(guest, gi) {
      const hc = guest.headCount || 1;

      // Primary position
      let { x, y } = computeRawPos(guest.id, 1, 2);
      if (isInsideCard(x, y)) {
        ({ x, y } = pushToEdge(guest.id, gi, 0));
      }

      // Overlap avoidance — try alternate positions
      if (isTooClose(x, y, hc)) {
        for (let t = 1; t <= 40; t++) {
          const alt = computeRawPos(guest.id, 100 + t, 200 + t);
          if (!isInsideCard(alt.x, alt.y) && !isTooClose(alt.x, alt.y, hc)) {
            x = alt.x; y = alt.y; break;
          }
          // Also try edge positions
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
      const size = 7 + hashStr(guest.id, 99) * 5;
      const pos = getPosition(guest, gi);

      // Pick star shape (4, 5, or 6 points) deterministically
      const starPathIdx = Math.floor(hashStr(guest.id, 55) * 3);
      const starPath = STAR_PATHS[starPathIdx];

      if (hc === 1) {
        // Single star — same as before
        const star = createStarEl(size, starPath);
        star.dataset.groupId = guest.id;
        star.style.left = pos.x + '%';
        star.style.top = pos.y + '%';
        starfield.appendChild(star);
        starMap[guest.id] = { container: star, stars: [star], lines: [], headCount: 1 };
      } else {
        // Constellation — wrapper with multiple stars + SVG lines
        const pattern = CONSTELLATION_PATTERNS[hc];
        if (!pattern) continue;

        const wrapper = document.createElement('div');
        wrapper.className = 'rsvp-constellation';
        wrapper.dataset.groupId = guest.id;
        wrapper.style.left = pos.x + '%';
        wrapper.style.top = pos.y + '%';

        // Deterministic rotation from hash
        const angle = hashStr(guest.id, 50) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const starEls = [];
        const nodePositions = []; // store actual rotated positions for line drawing

        for (let ni = 0; ni < pattern.nodes.length; ni++) {
          const [nx, ny] = pattern.nodes[ni];
          // Rotate
          const rx = nx * cosA - ny * sinA;
          const ry = nx * sinA + ny * cosA;
          nodePositions.push([rx, ry]);

          const starSize = size * (0.85 + hashStr(guest.id, 200 + ni) * 0.3);
          // Each star in a constellation can have its own shape
          const niPath = STAR_PATHS[Math.floor(hashStr(guest.id, 55 + ni * 11) * 3)];
          const starEl = createStarEl(starSize, niPath);
          starEl.style.position = 'absolute';
          starEl.style.left = (rx - starSize / 2) + 'px';
          starEl.style.top = (ry - starSize / 2) + 'px';
          wrapper.appendChild(starEl);
          starEls.push(starEl);
        }

        // SVG overlay for lines
        const svgNS = 'http://www.w3.org/2000/svg';
        const linesSvg = document.createElementNS(svgNS, 'svg');
        linesSvg.setAttribute('class', 'rsvp-constellation-lines');
        linesSvg.setAttribute('overflow', 'visible');

        const lineEls = [];
        const inset = 3; // px gap so line endpoints hide behind stars
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
      const acceptedIds = await res.json();
      for (const groupId of acceptedIds) {
        const entry = starMap[groupId];
        if (!entry) continue;

        // Light up all stars + lines instantly (no animation)
        for (let si = 0; si < entry.stars.length; si++) {
          const star = entry.stars[si];
          star.style.setProperty('--twinkle-dur', (2.5 + hashStr(groupId, 77 + si * 13) * 1.5) + 's');
          star.style.setProperty('--twinkle-delay', (hashStr(groupId, 88 + si * 7) * 2) + 's');
          star.classList.add('lit');
        }
        for (const line of entry.lines) {
          line.classList.add('lit');
        }
      }
    } catch (_) {
      // Silently fail — stars just stay dim
    }
  }

  // ── Accept Animation — Dissolve + Star Flight ─────────

  function launchAcceptAnimation() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      lightUpConstellation(selectedGuest.id);
      showAcceptSuccess();
      return;
    }

    const rect = inviteCard.getBoundingClientRect();
    const cardInner = inviteCard.querySelector('.rsvp-invite-card-inner');
    const DISSOLVE_DUR = 1600;
    let start = null;

    // Fade deck out
    inviteState.classList.add('dissolving');

    // Use the card-inner's front face for masking (like the hero does)
    const frontFace = cardInner.querySelector('.rsvp-invite-front');
    const W = inviteCard.offsetWidth;
    const H = inviteCard.offsetHeight;
    const maxR = Math.sqrt(W * W + H * H) / 2; // diagonal radius in px

    function frame(ts) {
      if (!start) start = ts;
      const t = Math.min((ts - start) / DISSOLVE_DUR, 1);

      // Radial mask: dissolve from outside edges → center with soft edge
      const edgePct = (1 - t) * 100;
      const soft = 12;
      const inner = Math.max(0, edgePct - soft);
      const outer = Math.min(100, edgePct + 2);
      const mask = `radial-gradient(circle at 50% 50%, black ${inner}%, transparent ${outer}%)`;
      frontFace.style.maskImage = mask;
      frontFace.style.webkitMaskImage = mask;

      // Spawn golden dust just OUTSIDE the dissolve edge
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
        flyStarToPlaceholder(cx, cy, selectedGuest.id);
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
    // Spawn just OUTSIDE the dissolving edge (edge + 5-15px outward)
    const spawnR = edgeRadiusPx + 5 + Math.random() * 10;
    const startX = cx + Math.cos(angle) * spawnR + (Math.random() - 0.5) * 8;
    const startY = cy + Math.sin(angle) * spawnR + (Math.random() - 0.5) * 8;
    const dur = 400 + Math.random() * 400;
    // Drift outward from center (away from the card)
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

  function flyStarToPlaceholder(fromX, fromY, groupId) {
    const entry = starMap[groupId];
    if (!entry) {
      showAcceptSuccess();
      return;
    }

    const startSize = 24;
    const FLIGHT_DUR = 1000;
    const STAGGER = 200;

    // For each star in the constellation, launch a flying star to its position
    const starTargets = entry.stars.map(s => {
      const r = s.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        size: s.querySelector('svg')?.getAttribute('width') || 8,
      };
    });

    let lightingStarted = false;

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
          flyer.style.transition = `transform ${FLIGHT_DUR}ms cubic-bezier(0.25, 0.1, 0.25, 1), ` +
            `opacity ${FLIGHT_DUR * 0.3}ms ease ${FLIGHT_DUR * 0.7}ms`;
          flyer.style.transform = `translate(${dx}px, ${dy}px) scale(${target.size / startSize})`;
        });

        setTimeout(() => {
          flyer.remove();
          // Start constellation lighting when first star arrives
          if (!lightingStarted) {
            lightingStarted = true;
            lightUpConstellation(groupId, () => {
              setTimeout(showAcceptSuccess, 400);
            });
          }
        }, FLIGHT_DUR);
      }, delay);
    }
  }

  function lightUpConstellation(groupId, onComplete) {
    const entry = starMap[groupId];
    if (!entry) { if (onComplete) onComplete(); return; }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (entry.headCount === 1) {
      // Single star — flash + twinkle
      const star = entry.stars[0];
      if (prefersReduced) {
        star.style.setProperty('--twinkle-dur', (2.5 + Math.random() * 1.5) + 's');
        star.style.setProperty('--twinkle-delay', (Math.random() * 0.5) + 's');
        star.classList.add('lit');
        if (onComplete) onComplete();
        return;
      }
      star.classList.add('lighting-up');
      setTimeout(() => {
        star.classList.remove('lighting-up');
        star.style.setProperty('--twinkle-dur', (2.5 + Math.random() * 1.5) + 's');
        star.style.setProperty('--twinkle-delay', (Math.random() * 0.5) + 's');
        star.classList.add('lit');
        if (onComplete) onComplete();
      }, 500);
      return;
    }

    // Multi-star constellation — sequential: star → line → star → line → star
    if (prefersReduced) {
      for (const s of entry.stars) {
        s.style.setProperty('--twinkle-dur', (2.5 + Math.random() * 1.5) + 's');
        s.style.setProperty('--twinkle-delay', (Math.random() * 0.5) + 's');
        s.classList.add('lit');
      }
      for (const l of entry.lines) l.classList.add('lit');
      if (onComplete) onComplete();
      return;
    }

    // Build sequence: [star0, line0, star1, line1, star2, ...]
    const steps = [];
    for (let i = 0; i < entry.stars.length; i++) {
      steps.push({ type: 'star', el: entry.stars[i] });
      if (i < entry.lines.length) {
        steps.push({ type: 'line', el: entry.lines[i] });
      }
    }

    let idx = 0;
    function nextStep() {
      if (idx >= steps.length) { if (onComplete) onComplete(); return; }
      const step = steps[idx++];
      if (step.type === 'star') {
        step.el.classList.add('lighting-up');
        setTimeout(() => {
          step.el.classList.remove('lighting-up');
          step.el.style.setProperty('--twinkle-dur', (2.5 + Math.random() * 1.5) + 's');
          step.el.style.setProperty('--twinkle-delay', (Math.random() * 0.5) + 's');
          step.el.classList.add('lit');
          setTimeout(nextStep, 150);
        }, 300);
      } else {
        step.el.classList.add('lighting-up');
        setTimeout(() => {
          step.el.classList.remove('lighting-up');
          step.el.classList.add('lit');
          setTimeout(nextStep, 150);
        }, 500);
      }
    }
    nextStep();
  }

  function dimConstellation(groupId) {
    const entry = starMap[groupId];
    if (!entry) return;

    const hasLit = entry.stars.some(s => s.classList.contains('lit'));
    if (!hasLit) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (entry.headCount === 1) {
      const star = entry.stars[0];
      star.classList.remove('lit', 'lighting-up');
      star.style.transition = 'opacity 2.5s ease';
      star.style.opacity = '0.12';
      setTimeout(() => { star.style.transition = ''; star.style.opacity = ''; }, 2600);
      return;
    }

    if (prefersReduced) {
      for (const s of entry.stars) s.classList.remove('lit', 'lighting-up');
      for (const l of entry.lines) l.classList.remove('lit', 'lighting-up');
      return;
    }

    // Reverse order: last star → line → star → line → star[0]
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
        step.el.classList.remove('lit', 'lighting-up');
        step.el.style.transition = 'opacity 2s ease';
        step.el.style.opacity = '0.12';
        setTimeout(() => { step.el.style.transition = ''; step.el.style.opacity = ''; }, 2100);
      } else {
        step.el.classList.remove('lit', 'lighting-up');
      }
      setTimeout(nextDim, 300);
    }
    nextDim();
  }

  function showAcceptSuccess() {
    successMsg.textContent = `Thank you! We can\u2019t wait to celebrate with you.`;
    successSub.textContent = `We can\u2019t wait to celebrate with you!`;

    // Fade in gently
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

    // Dim the star if it was previously lit
    if (selectedGuest) dimConstellation(selectedGuest.id);

    if (prefersReduced) {
      showDeclineSuccess();
      return;
    }

    // Phase 1: Card fades, lifts, blurs
    inviteState.classList.add('dissolving-decline');

    // Phase 2: Floating stars from card edges
    setTimeout(() => {
      const rect = inviteCard.getBoundingClientRect();
      spawnDeclineStars(rect);
    }, 300);

    // Phase 3: Show decline message with slow fade (after card fully dissolves)
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

    // Start invisible, then fade in gently
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
