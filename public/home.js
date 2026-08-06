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

  // Installing / opening Nexus downloads all apps into cache.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }

  // —— Download Nexus (install whole home + all apps) ——
  const nexusBtn = document.getElementById('nexusDownloadBtn');
  let nexusPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  if (nexusBtn) {
    if (isStandalone()) {
      nexusBtn.textContent = 'Installed';
      nexusBtn.disabled = true;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      nexusPrompt = e;
      if (!isStandalone()) {
        nexusBtn.textContent = 'Download';
        nexusBtn.disabled = false;
      }
    });

    window.addEventListener('appinstalled', () => {
      nexusPrompt = null;
      nexusBtn.textContent = 'Installed';
      nexusBtn.disabled = true;
    });

    nexusBtn.addEventListener('click', async () => {
      if (isStandalone() || nexusBtn.disabled) return;

      if (nexusPrompt) {
        nexusPrompt.prompt();
        const choice = await nexusPrompt.userChoice;
        nexusPrompt = null;
        if (choice && choice.outcome === 'accepted') {
          nexusBtn.textContent = 'Installed';
          nexusBtn.disabled = true;
        }
        return;
      }

      if (isIos()) {
        alert('Install Nexus:\n1) Tap Share\n2) Add to Home Screen\n3) Add');
        return;
      }

      alert('Tap the browser menu ⋮ → Install app / Add to Home screen');
    });
  }
})();
