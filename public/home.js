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

  let gameMode = 'online';

  function fill(tplId, text) {
    const tpl = document.getElementById(tplId);
    if (!grid || !tpl) return;
    if (intro) intro.textContent = text || '';
    grid.innerHTML = '';
    grid.appendChild(tpl.content.cloneNode(true));
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

  // Bottom Download button (Chrome install / fallback hint — no fake alerts)
  const downloadBar = document.getElementById('downloadBar');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadHint = document.getElementById('downloadHint');
  let deferredPrompt = null;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone && downloadBar) {
    downloadBar.hidden = true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (downloadHint) downloadHint.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (downloadBar) downloadBar.hidden = true;
  });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try {
          await deferredPrompt.userChoice;
        } catch (_) {}
        deferredPrompt = null;
        return;
      }
      if (!downloadHint) return;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      downloadHint.hidden = false;
      downloadHint.textContent = ios
        ? 'Tap Share, then Add to Home Screen.'
        : 'In Chrome tap ⋮ then Install app / Add to Home screen.';
    });
  }
})();
