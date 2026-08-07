(function () {
  const grid = document.getElementById('appGrid');
  const topButtons = Array.from(document.querySelectorAll('.cats > .cat'));

  function fill(tplId) {
    const tpl = document.getElementById(tplId);
    if (!grid || !tpl) return;
    grid.innerHTML = '';
    grid.appendChild(tpl.content.cloneNode(true));
  }

  function show(cat) {
    topButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    fill('tpl-' + cat);
    try {
      localStorage.setItem('nexus_cat', cat);
    } catch (_) {}
    const coinEl = document.getElementById('homeCoins');
    if (coinEl) {
      if (cat === 'games' && window.NexusWallet) {
        coinEl.hidden = false;
        coinEl.querySelector('strong').textContent = String(NexusWallet.getCoins());
      } else {
        coinEl.hidden = true;
      }
    }
  }

  topButtons.forEach((btn) => {
    btn.addEventListener('click', () => show(btn.dataset.cat));
  });

  let start = 'events';
  try {
    const saved = localStorage.getItem('nexus_cat') || localStorage.getItem('zedhub_cat');
    if (saved === 'events' || saved === 'games') start = saved;
    if (saved === 'market') start = 'events';
    if (saved === 'online' || saved === 'offline') start = 'games';
  } catch (_) {}

  show(start);

  // Savanna splash only when entering the app (once per session), not on every home visit
  (function runSplash() {
    const splash = document.getElementById('splash');
    const nexus = document.getElementById('splashNexus');
    const savanna = document.getElementById('splashSavanna');
    if (!splash || !savanna) return;

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem('nexus_savanna_splash') === '1';
    } catch (_) {}

    if (alreadyShown) {
      splash.remove();
      return;
    }

    try {
      sessionStorage.setItem('nexus_savanna_splash', '1');
    } catch (_) {}

    // Skip NX phase — OS already shows the app icon; go straight to Savanna
    if (nexus) nexus.hidden = true;
    savanna.hidden = false;

    setTimeout(() => {
      splash.classList.add('hide');
      splash.setAttribute('aria-hidden', 'true');
      setTimeout(() => splash.remove(), 400);
    }, 2000);
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
