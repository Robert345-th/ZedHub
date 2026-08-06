(function () {
  const INFO = {
    events: 'Find and book event services — catering, DJs, tents, décor and more.',
    market: 'Buy and sell on ZedMarket. Opens the live Market app.',
    online: 'Play ZedLudo live with friends — create or join a room.',
    offline: 'Play ZedLudo on this phone against bots — no room needed.',
  };

  const grid = document.getElementById('appGrid');
  const intro = document.getElementById('introDesc');
  const buttons = Array.from(document.querySelectorAll('.cat'));

  function show(cat) {
    const tpl = document.getElementById('tpl-' + cat);
    if (!grid || !tpl) return;

    if (intro) intro.textContent = INFO[cat] || '';

    grid.innerHTML = '';
    grid.appendChild(tpl.content.cloneNode(true));

    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });

    try {
      localStorage.setItem('zedhub_cat', cat);
    } catch (_) {}
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => show(btn.dataset.cat));
  });

  let start = 'events';
  try {
    const saved = localStorage.getItem('zedhub_cat');
    if (INFO[saved]) start = saved;
  } catch (_) {}

  show(start);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }
})();
