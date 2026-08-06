(function () {
  const INFO = {
    events: 'Find and book event services — catering, DJs, tents, décor and more.',
    market: 'Buy and sell on ZedMarket. Opens the live Market app.',
    online: 'Play Ludo live with friends — create or join a room.',
    offline: 'Ludo vs bots + Fruits campaign (100 levels, gets harder).',
  };

  const grid = document.getElementById('appGrid');
  const intro = document.getElementById('introDesc');
  const subcats = document.getElementById('gameSubcats');
  const topButtons = Array.from(document.querySelectorAll('.cats > .cat'));
  const gameButtons = Array.from(document.querySelectorAll('#gameSubcats .cat'));

  const sheet = document.getElementById('installSheet');
  const installClose = document.getElementById('installClose');
  const installTitle = document.getElementById('installTitle');
  const installBody = document.getElementById('installBody');
  const installSteps = document.getElementById('installSteps');
  const installAction = document.getElementById('installAction');
  const installIcon = document.getElementById('installIcon');

  let gameMode = 'online';
  let pendingHref = null;
  let pendingExternal = false;

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function fill(tplId, text) {
    const tpl = document.getElementById(tplId);
    if (!grid || !tpl) return;
    if (intro) intro.textContent = text || '';
    grid.innerHTML = '';
    grid.appendChild(tpl.content.cloneNode(true));
    bindDownloadButtons();
  }

  function show(cat) {
    topButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });

    if (cat === 'games') {
      if (subcats) subcats.hidden = false;
      gameButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.game === gameMode);
      });
      fill('tpl-' + gameMode, INFO[gameMode]);
    } else {
      if (subcats) subcats.hidden = true;
      fill('tpl-' + cat, INFO[cat]);
    }

    try {
      localStorage.setItem('nexus_cat', cat);
      if (cat === 'games') localStorage.setItem('nexus_game_mode', gameMode);
    } catch (_) {}
  }

  function openSheet(name, icon, href, external) {
    pendingHref = href;
    pendingExternal = !!external;
    installTitle.textContent = 'Download ' + name;
    installIcon.src = icon || '';
    installIcon.hidden = !icon;
    installSteps.hidden = true;
    installSteps.innerHTML = '';

    if (external) {
      installBody.textContent =
        'Market has its own app site. Open it, then use Install / Add to Home Screen there.';
      installAction.textContent = 'Open Market';
    } else if (isIos()) {
      installBody.textContent = 'Open ' + name + ', then add it to your Home Screen:';
      installSteps.hidden = false;
      installSteps.innerHTML =
        '<li>Tap <strong>Download</strong> below to open the app</li>' +
        '<li>Tap the <strong>Share</strong> button</li>' +
        '<li>Tap <strong>Add to Home Screen</strong></li>';
      installAction.textContent = 'Open ' + name;
    } else {
      installBody.textContent =
        'Open ' + name + ' and tap Download there to add it to your home screen like an app.';
      installAction.textContent = 'Open & download ' + name;
    }

    sheet.hidden = false;
  }

  function closeSheet() {
    sheet.hidden = true;
    pendingHref = null;
  }

  function bindDownloadButtons() {
    grid.querySelectorAll('.app-download').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSheet(btn.dataset.name, btn.dataset.icon, btn.dataset.href, btn.dataset.external === '1');
      });
    });
  }

  topButtons.forEach((btn) => {
    btn.addEventListener('click', () => show(btn.dataset.cat));
  });

  gameButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      gameMode = btn.dataset.game;
      show('games');
    });
  });

  let start = 'events';
  try {
    const saved = localStorage.getItem('nexus_cat') || localStorage.getItem('zedhub_cat');
    if (saved === 'events' || saved === 'market' || saved === 'games') start = saved;
    if (saved === 'online' || saved === 'offline') {
      start = 'games';
      gameMode = saved;
    }
    const savedMode = localStorage.getItem('nexus_game_mode') || localStorage.getItem('zedhub_game_mode');
    if (savedMode === 'online' || savedMode === 'offline') gameMode = savedMode;
  } catch (_) {}

  show(start);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }

  if (installClose) installClose.addEventListener('click', closeSheet);
  if (sheet) {
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) closeSheet();
    });
  }
  if (installAction) {
    installAction.addEventListener('click', () => {
      if (!pendingHref) return closeSheet();
      if (pendingExternal) {
        window.open(pendingHref, '_blank', 'noopener,noreferrer');
        closeSheet();
        return;
      }
      location.href = pendingHref;
    });
  }
})();
