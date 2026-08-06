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

  // —— Add to Home Screen / Download ——
  const downloadBtn = document.getElementById('downloadBtn');
  const sheet = document.getElementById('installSheet');
  const installClose = document.getElementById('installClose');
  const installBody = document.getElementById('installBody');
  const installSteps = document.getElementById('installSteps');
  const installAction = document.getElementById('installAction');
  let deferredPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function openSheet() {
    if (!sheet) return;
    sheet.hidden = false;
  }

  function closeSheet() {
    if (!sheet) return;
    sheet.hidden = true;
  }

  function markInstalled() {
    if (!downloadBtn) return;
    downloadBtn.textContent = 'Installed';
    downloadBtn.classList.add('installed');
    downloadBtn.disabled = true;
  }

  if (isStandalone()) {
    markInstalled();
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (downloadBtn && !isStandalone()) {
      downloadBtn.textContent = 'Download';
      downloadBtn.classList.remove('installed');
      downloadBtn.disabled = false;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    markInstalled();
    closeSheet();
  });

  async function runInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') {
        markInstalled();
        closeSheet();
      }
      return;
    }

    // Fallback instructions
    installSteps.hidden = false;
    if (isIos()) {
      installBody.textContent = 'On iPhone / iPad, install Nexus like this:';
      installSteps.innerHTML =
        '<li>Tap the <strong>Share</strong> button in Safari</li>' +
        '<li>Scroll and tap <strong>Add to Home Screen</strong></li>' +
        '<li>Tap <strong>Add</strong></li>';
      installAction.textContent = 'Got it';
    } else {
      installBody.textContent =
        'Use your browser menu to install Nexus, or try Chrome / Edge for one-tap Download.';
      installSteps.innerHTML =
        '<li>Open the browser menu (⋮)</li>' +
        '<li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></li>' +
        '<li>Confirm install</li>';
      installAction.textContent = 'Got it';
    }
    openSheet();
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (isStandalone()) return;
      if (deferredPrompt) {
        installSteps.hidden = true;
        installBody.textContent = 'Install Nexus on your phone like an app.';
        installAction.textContent = 'Download';
        openSheet();
        return;
      }
      runInstall();
    });
  }

  if (installAction) {
    installAction.addEventListener('click', async () => {
      if (deferredPrompt) {
        await runInstall();
        return;
      }
      closeSheet();
    });
  }

  if (installClose) installClose.addEventListener('click', closeSheet);
  if (sheet) {
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) closeSheet();
    });
  }
})();
