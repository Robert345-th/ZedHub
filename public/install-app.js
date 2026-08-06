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

  function ensureSheet() {
    let sheet = document.getElementById('nexusHomeSheet');
    if (sheet) return sheet;

    sheet = document.createElement('div');
    sheet.id = 'nexusHomeSheet';
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="nhs-backdrop" data-close="1"></div>' +
      '<div class="nhs-card" role="dialog" aria-modal="true">' +
      '<button type="button" class="nhs-x" data-close="1" aria-label="Close">×</button>' +
      '<div class="nhs-title" id="nhsTitle">Add to Home</div>' +
      '<p class="nhs-body" id="nhsBody"></p>' +
      '<button type="button" class="nhs-btn" id="nhsAction">Continue</button>' +
      '</div>';

    const style = document.createElement('style');
    style.textContent =
      '#nexusHomeSheet{position:fixed;inset:0;z-index:9999;display:grid;align-items:end}' +
      '#nexusHomeSheet[hidden]{display:none}' +
      '.nhs-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55)}' +
      '.nhs-card{position:relative;margin:0;background:#123528;color:#f4fff8;border-radius:22px 22px 0 0;' +
      'padding:22px 18px 28px;border:1px solid rgba(255,255,255,.14);z-index:1}' +
      '.nhs-x{position:absolute;top:10px;right:12px;border:0;background:transparent;color:#fff;font-size:1.6rem}' +
      '.nhs-title{font-family:Syne,system-ui,sans-serif;font-weight:800;font-size:1.2rem;padding-right:28px}' +
      '.nhs-body{margin-top:10px;color:rgba(244,255,248,.78);line-height:1.45;font-size:.92rem}' +
      '.nhs-btn{width:100%;margin-top:16px;border:0;border-radius:14px;padding:13px 16px;font-weight:800;' +
      'font-size:1rem;background:linear-gradient(135deg,#4ade80,#16a34a);color:#042f1a}';
    document.head.appendChild(style);
    document.body.appendChild(sheet);

    sheet.addEventListener('click', (e) => {
      if (e.target && e.target.getAttribute('data-close')) sheet.hidden = true;
    });
    return sheet;
  }

  function showSheet(title, body, actionLabel, onAction) {
    const sheet = ensureSheet();
    sheet.querySelector('#nhsTitle').textContent = title;
    sheet.querySelector('#nhsBody').innerHTML = body;
    const action = sheet.querySelector('#nhsAction');
    action.textContent = actionLabel;
    action.onclick = () => {
      sheet.hidden = true;
      if (onAction) onAction();
    };
    sheet.hidden = false;
  }

  function openInChrome() {
    const hostPath = location.host + location.pathname + location.search;
    const url = location.href.split('#')[0];
    if (isAndroid()) {
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
   * Apps are already cached with Nexus.
   * Button tries native Add/Install first; only then shows a clean sheet.
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

      // 1) Direct native prompt — no instructions popup
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

      // 2) Inside Nexus app: open Chrome so the real Add/Install UI can appear
      if (isStandalone() && isAndroid()) {
        showSheet(
          'Add ' + name + ' to Home',
          name +
            ' is already in Nexus. To put an icon on your phone home screen, continue in Chrome — then tap <strong>Install</strong> / <strong>Add to Home screen</strong>.',
          'Open in Chrome',
          () => openInChrome()
        );
        return;
      }

      // 3) iPhone — Apple has no install API
      if (isIos()) {
        showSheet(
          'Add ' + name + ' to Home',
          'Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> → <strong>Add</strong>.',
          'Done',
          () => {
            markAdded(id);
            setAddedUi();
          }
        );
        return;
      }

      // 4) Desktop / other — short sheet, no browser alert()
      showSheet(
        'Add ' + name + ' to Home',
        'Use your browser menu → <strong>Install app</strong> or <strong>Add to Home screen</strong>.',
        'Got it',
        null
      );
    });
  }

  global.NexusInstall = { wireAppInstall, wasAdded, markAdded, isIos, isStandalone };
})(window);
