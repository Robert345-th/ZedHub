(function () {
  const INFO = {
    events: 'Find and book event services — catering, DJs, tents, décor and more.',
    market: 'Buy and sell on ZedMarket. Opens the live Market app.',
    online: 'Play ZedLudo live with friends — create or join a room.',
    offline: 'ZedLudo vs bots + ZedFruits campaign (100 levels, gets harder).',
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
})();
