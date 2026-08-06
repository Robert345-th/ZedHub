/**
 * Local service reminders for ZedEvents (device-only).
 * Key: ze_reminders_v1 = [{ id, title, at, created }]
 */
(function (global) {
  const KEY = 'ze_reminders_v1';

  function load() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)));
    } catch (_) {}
  }

  const API = {
    list() {
      return load().sort((a, b) => a.at - b.at);
    },
    get(serviceId) {
      return load().find((r) => String(r.id) === String(serviceId)) || null;
    },
    set(serviceId, title, atMs) {
      const list = load().filter((r) => String(r.id) !== String(serviceId));
      list.push({
        id: String(serviceId),
        title: title || 'Service',
        at: atMs,
        created: Date.now(),
      });
      save(list);
      return API.get(serviceId);
    },
    remove(serviceId) {
      save(load().filter((r) => String(r.id) !== String(serviceId)));
    },
    due(now) {
      const t = now || Date.now();
      return load().filter((r) => r.at <= t);
    },
    upcoming(hours) {
      const t = Date.now();
      const end = t + (hours || 24) * 3600 * 1000;
      return load().filter((r) => r.at > t && r.at <= end);
    },
  };

  global.ZEReminders = API;
})(typeof window !== 'undefined' ? window : globalThis);
