(function (global) {
  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function storageKey(id) {
    return 'nexus_app_installed_' + id;
  }

  function wasInstalled(id) {
    try {
      return localStorage.getItem(storageKey(id)) === '1';
    } catch (_) {
      return false;
    }
  }

  function markInstalled(id) {
    try {
      localStorage.setItem(storageKey(id), '1');
    } catch (_) {}
  }

  function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return navigator.serviceWorker.register('/sw.js').catch(function () {});
  }

  /** Open this app URL in the real browser so Chrome can show Install. */
  function openInBrowser() {
    const url = location.href.split('#')[0];
    if (isAndroid()) {
      // Force open in Chrome (not inside Nexus PWA)
      const hostPath = location.host + location.pathname + location.search;
      location.href =
        'intent://' +
        hostPath +
        '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
        encodeURIComponent(url) +
        ';end';
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * opts: { btn, name, id }
   */
  function wireAppInstall(opts) {
    const btn = typeof opts.btn === 'string' ? document.querySelector(opts.btn) : opts.btn;
    if (!btn) return;

    const name = opts.name || 'App';
    const id = opts.id || name.toLowerCase().replace(/\s+/g, '-');
    let deferred = null;
    let readyWaiters = [];

    function setInstalledUi() {
      btn.textContent = 'Installed';
      btn.disabled = true;
    }

    function setDownloadUi() {
      btn.textContent = 'Download';
      btn.disabled = false;
    }

    function notifyPromptReady() {
      readyWaiters.splice(0).forEach((fn) => fn(deferred));
    }

    function waitForPrompt(ms) {
      if (deferred) return Promise.resolve(deferred);
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          readyWaiters = readyWaiters.filter((fn) => fn !== onReady);
          resolve(null);
        }, ms);
        function onReady(p) {
          clearTimeout(t);
          resolve(p);
        }
        readyWaiters.push(onReady);
      });
    }

    if (wasInstalled(id)) setInstalledUi();
    else setDownloadUi();

    ensureServiceWorker();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      if (!wasInstalled(id)) setDownloadUi();
      notifyPromptReady();
    });

    window.addEventListener('appinstalled', () => {
      deferred = null;
      markInstalled(id);
      setInstalledUi();
    });

    async function tryDirectInstall() {
      // Prefer native prompt
      let promptEvent = deferred || (await waitForPrompt(1500));
      if (promptEvent) {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        deferred = null;
        if (choice && choice.outcome === 'accepted') {
          markInstalled(id);
          setInstalledUi();
        }
        return true;
      }
      return false;
    }

    btn.addEventListener('click', async () => {
      if (wasInstalled(id) || btn.disabled) return;

      btn.disabled = true;
      btn.textContent = 'Installing…';

      const ok = await tryDirectInstall();
      if (ok) return;

      // Inside Nexus (or no prompt yet): jump to browser for real Install UI
      if (isStandalone()) {
        btn.textContent = 'Download';
        btn.disabled = false;
        openInBrowser();
        return;
      }

      if (isIos()) {
        btn.textContent = 'Download';
        btn.disabled = false;
        // iOS has no direct install API — must use Share sheet
        alert('On iPhone: tap Share → Add to Home Screen → Add');
        return;
      }

      // Browser but prompt still missing — one more SW wait then browser hint
      await ensureServiceWorker();
      const again = await tryDirectInstall();
      if (again) return;

      btn.textContent = 'Download';
      btn.disabled = false;
      alert('Install is not ready yet. Stay on this page 2 seconds, then tap Download again.');
    });

    if (new URLSearchParams(location.search).get('install') === '1' && !wasInstalled(id)) {
      setTimeout(() => btn.click(), 600);
    }
  }

  global.NexusInstall = { wireAppInstall, wasInstalled, markInstalled, isIos };
})(window);
