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
    return 'nexus_home_added_' + id;
  }

  function wasAdded(id) {
    try {
      return localStorage.getItem(storageKey(id)) === '1';
    } catch (_) {
      return false;
    }
  }

  function markAdded(id) {
    try {
      localStorage.setItem(storageKey(id), '1');
    } catch (_) {}
  }

  /**
   * Apps are already downloaded with Nexus.
   * This button only helps add the current app icon to the phone home screen.
   * opts: { btn, name, id }
   */
  function wireAppInstall(opts) {
    const btn = typeof opts.btn === 'string' ? document.querySelector(opts.btn) : opts.btn;
    if (!btn) return;

    const name = opts.name || 'App';
    const id = opts.id || name.toLowerCase().replace(/\s+/g, '-');
    let deferred = null;

    function setAddedUi() {
      btn.textContent = 'On Home';
      btn.disabled = true;
    }

    function setReadyUi() {
      btn.textContent = 'Add to Home';
      btn.disabled = false;
    }

    if (wasAdded(id)) setAddedUi();
    else setReadyUi();

    // If browser offers a native install/shortcut for this page, use it directly.
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      if (!wasAdded(id)) setReadyUi();
    });

    window.addEventListener('appinstalled', () => {
      deferred = null;
      markAdded(id);
      setAddedUi();
    });

    btn.addEventListener('click', async () => {
      if (wasAdded(id)) return;

      // Direct native add/install when browser supports it
      if (deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice;
        deferred = null;
        if (choice && choice.outcome === 'accepted') {
          markAdded(id);
          setAddedUi();
        }
        return;
      }

      if (isIos()) {
        const ok = confirm(
          name +
            ' is already in Nexus.\n\nAdd its icon to Home Screen:\n1) Tap Share\n2) Add to Home Screen\n3) Add\n\nTap OK when done.'
        );
        if (ok) {
          markAdded(id);
          setAddedUi();
        }
        return;
      }

      if (isAndroid()) {
        const ok = confirm(
          name +
            ' is already downloaded with Nexus.\n\nAdd icon to Home:\n1) Tap the browser menu ⋮\n2) Add to Home screen / Install\n3) Add\n\nTap OK when done.'
        );
        if (ok) {
          markAdded(id);
          setAddedUi();
        }
        return;
      }

      alert('Use your browser menu → Add to Home screen to put ' + name + ' on your home screen.');
    });
  }

  global.NexusInstall = { wireAppInstall, wasAdded, markAdded, isIos, isStandalone };
})(window);
