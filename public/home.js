(function () {
  const list = document.getElementById('appList');
  const foot = document.getElementById('footHint');
  const buttons = Array.from(document.querySelectorAll('.cat'));

  function show(cat) {
    const tpl = document.getElementById('tpl-' + cat);
    if (!list || !tpl) return;
    list.innerHTML = '';
    list.appendChild(tpl.content.cloneNode(true));

    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });

    if (foot) {
      foot.textContent =
        cat === 'games' ? 'Games will appear in this category later.' : 'Tap an app to open it.';
    }

    try {
      localStorage.setItem('zedhub_cat', cat);
    } catch (_) {}
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => show(btn.dataset.cat));
  });

  let start = 'markets';
  try {
    const saved = localStorage.getItem('zedhub_cat');
    if (saved === 'markets' || saved === 'games') start = saved;
  } catch (_) {}

  show(start);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }
})();
