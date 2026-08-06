(function () {
  const INFO = {
    events: {
      title: 'Events',
      desc: 'Find and book event services in Zambia — catering, DJs, tents, décor, and vendors near you.',
    },
    market: {
      title: 'Market',
      desc: 'Buy and sell items on ZedMarket. Opens the live Market app in a new page.',
    },
    games: {
      title: 'Games',
      desc: 'Fun games will live here. Nothing to open yet — check back later.',
    },
  };

  const list = document.getElementById('appList');
  const introTitle = document.getElementById('introTitle');
  const introDesc = document.getElementById('introDesc');
  const buttons = Array.from(document.querySelectorAll('.cat'));

  function show(cat) {
    const info = INFO[cat];
    const tpl = document.getElementById('tpl-' + cat);
    if (!list || !tpl || !info) return;

    introTitle.textContent = info.title;
    introDesc.textContent = info.desc;

    list.innerHTML = '';
    list.appendChild(tpl.content.cloneNode(true));

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
