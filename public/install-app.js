(function (global) {
  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  /**
   * Wire a Download button on an app page.
   * opts: { btn, name, appleIcon }
   */
  function wireAppInstall(opts) {
    const btn = typeof opts.btn === 'string' ? document.querySelector(opts.btn) : opts.btn;
    if (!btn) return;

    let deferred = null;
    const name = opts.name || 'App';

    if (isStandalone()) {
      btn.textContent = 'Installed';
      btn.disabled = true;
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      btn.textContent = 'Download';
      btn.disabled = false;
    });

    window.addEventListener('appinstalled', () => {
      deferred = null;
      btn.textContent = 'Installed';
      btn.disabled = true;
    });

    btn.addEventListener('click', async () => {
      if (deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice;
        deferred = null;
        if (choice && choice.outcome === 'accepted') {
          btn.textContent = 'Installed';
          btn.disabled = true;
        }
        return;
      }

      if (isIos()) {
        alert(
          'Add ' +
            name +
            ' to Home Screen:\n1) Tap Share\n2) Add to Home Screen\n3) Add'
        );
      } else {
        alert(
          'To download ' +
            name +
            ':\nOpen the browser menu (⋮) → Install app / Add to Home screen'
        );
      }
    });

    // Auto-prompt sheet when opened with ?install=1
    if (new URLSearchParams(location.search).get('install') === '1') {
      setTimeout(() => btn.click(), 400);
    }
  }

  global.NexusInstall = { wireAppInstall, isStandalone, isIos };
})(window);
