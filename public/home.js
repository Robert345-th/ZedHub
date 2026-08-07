(function () {
  // Gate: Nexus requires an email account
  function needsRegister() {
    try {
      const token = localStorage.getItem('ze_token');
      if (!token) return true;
      const raw = localStorage.getItem('ze_user');
      const user = raw ? JSON.parse(raw) : null;
      return !user || !user.email;
    } catch (_) {
      return true;
    }
  }

  if (needsRegister()) {
    location.replace('/login.html?v=58');
    return;
  }

  // Top bar: name + logout
  (function setupAccountBar() {
    const nameEl = document.getElementById('accountName');
    const loginEl = document.getElementById('accountLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    const user = (window.ZEAuth && ZEAuth.getUser()) || null;

    if (nameEl) {
      nameEl.textContent = (user && (user.name || user.email)) || 'Guest';
    }
    if (loginEl) loginEl.hidden = true;
    if (logoutBtn) {
      logoutBtn.hidden = false;
      logoutBtn.addEventListener('click', () => {
        if (window.ZEAuth) ZEAuth.clearSession();
        else {
          try {
            localStorage.removeItem('ze_token');
            localStorage.removeItem('ze_user');
          } catch (_) {}
        }
        location.replace('/login.html?v=58');
      });
    }
  })();

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

    if (nexus) nexus.hidden = true;
    savanna.hidden = false;

    setTimeout(() => {
      splash.classList.add('hide');
      splash.setAttribute('aria-hidden', 'true');
      setTimeout(() => splash.remove(), 400);
    }, 2000);
  })();

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
