(function () {
  const INFO = {
    events: 'Find and book event services — catering, DJs, tents, décor and more.',
    market: 'Buy and sell on ZedMarket. Opens the live Market app.',
    games: 'Fruits match-3 campaign — 100 levels, boosters, offline play.',
  };

  const grid = document.getElementById('appGrid');
  const intro = document.getElementById('introDesc');
  const topButtons = Array.from(document.querySelectorAll('.cats > .cat'));

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
    fill('tpl-' + cat, INFO[cat]);
    try {
      localStorage.setItem('nexus_cat', cat);
    } catch (_) {}
  }

  topButtons.forEach((btn) => {
    btn.addEventListener('click', () => show(btn.dataset.cat));
  });

  let start = 'events';
  try {
    const saved = localStorage.getItem('nexus_cat') || localStorage.getItem('zedhub_cat');
    if (saved === 'events' || saved === 'market' || saved === 'games') start = saved;
    if (saved === 'online' || saved === 'offline') start = 'games';
  } catch (_) {}

  show(start);

  // Opening splash: Nexus logo → powered by SAVANNA (2s) → home
  (function runSplash() {
    const splash = document.getElementById('splash');
    const nexus = document.getElementById('splashNexus');
    const savanna = document.getElementById('splashSavanna');
    if (!splash || !nexus || !savanna) return;

    // Brief Nexus mark, then Savanna for 2 seconds
    setTimeout(() => {
      nexus.hidden = true;
      splash.classList.add('savanna-mode');
      savanna.hidden = false;
      setTimeout(() => {
        splash.classList.add('hide');
        splash.setAttribute('aria-hidden', 'true');
        setTimeout(() => splash.remove(), 400);
      }, 2000);
    }, 700);
  })();

  // Bottom Install button — Chrome always shows its own confirm sheet (required).
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

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (downloadBtn) downloadBtn.textContent = 'Install app';
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
        : 'Open Chrome menu ⋮ → Install app. That confirm sheet is required by Chrome.';
    });
  }
})();
