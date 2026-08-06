(function (global) {
  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
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

  /**
   * Wire a Download button on an app page.
   * opts: { btn, name, id }  — id must be unique per app (ludo, fruits, events)
   *
   * Important: do NOT treat Nexus standalone mode as this app being installed.
   * Only mark Installed after a real install for THIS app (or saved flag).
   */
  function wireAppInstall(opts) {
    const btn = typeof opts.btn === 'string' ? document.querySelector(opts.btn) : opts.btn;
    if (!btn) return;

    const name = opts.name || 'App';
    const id = opts.id || name.toLowerCase().replace(/\s+/g, '-');
    let deferred = null;

    function setInstalledUi() {
      btn.textContent = 'Installed';
      btn.disabled = true;
    }

    function setDownloadUi() {
      btn.textContent = 'Download';
      btn.disabled = false;
    }

    if (wasInstalled(id)) {
      setInstalledUi();
    } else {
      setDownloadUi();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      // Only capture if this page's install is available
      e.preventDefault();
      deferred = e;
      if (!wasInstalled(id)) setDownloadUi();
    });

    window.addEventListener('appinstalled', () => {
      deferred = null;
      markInstalled(id);
      setInstalledUi();
    });

    btn.addEventListener('click', async () => {
      if (wasInstalled(id)) return;

      if (deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice;
        deferred = null;
        if (choice && choice.outcome === 'accepted') {
          markInstalled(id);
          setInstalledUi();
        }
        return;
      }

      if (isIos()) {
        const ok = confirm(
          'Add ' +
            name +
            ' to your Home Screen:\n\n1) Tap Share\n2) Add to Home Screen\n3) Add\n\nTap OK after you add it.'
        );
        if (ok) {
          markInstalled(id);
          setInstalledUi();
        }
        return;
      }

      alert(
        'To download ' +
          name +
          ' as its own app:\n\n1) Open the browser menu (⋮)\n2) Tap Install app / Add to Home screen\n3) Confirm\n\nIf you only see Nexus, open this page in Chrome (not inside the Nexus app) and try again.'
      );
    });

    if (new URLSearchParams(location.search).get('install') === '1' && !wasInstalled(id)) {
      setTimeout(() => btn.click(), 500);
    }
  }

  global.NexusInstall = { wireAppInstall, wasInstalled, markInstalled, isIos };
})(window);
