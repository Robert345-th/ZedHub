async function checkEvents() {
  const el = document.getElementById('events-status');
  if (!el) return;
  try {
    const res = await fetch('/api/events/status');
    const data = await res.json();
    if (data.connected) {
      el.textContent = 'Live · API connected';
      el.classList.add('ok');
    } else {
      el.textContent = 'Events UI ready · API not reachable';
      el.classList.add('bad');
    }
  } catch {
    el.textContent = 'Could not check Events API';
    el.classList.add('bad');
  }
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  const installRow = document.getElementById('installRow');
  const installBtn = document.getElementById('installBtn');
  const iosHint = document.getElementById('iosHint');
  let deferredPrompt = null;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;

  if (isIos && !isStandalone && iosHint) {
    iosHint.hidden = false;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installRow) installRow.hidden = false;
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (installRow) installRow.hidden = true;
    });
  }
}

checkEvents();
setupPwa();
