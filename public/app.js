async function checkEvents() {
  const el = document.getElementById('events-status');
  if (!el) return;
  try {
    const res = await fetch('/api/events/status');
    const data = await res.json();
    if (data.connected) {
      el.textContent = 'Events API reachable';
      el.classList.add('ok');
    } else {
      el.textContent = 'Events API not reachable yet';
      el.classList.add('bad');
    }
  } catch {
    el.textContent = 'Could not check Events';
    el.classList.add('bad');
  }
}

checkEvents();
