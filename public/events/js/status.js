(function () {
  async function list() {
    const res = await fetch("/api/statuses");
    if (!res.ok) throw new Error("Could not load statuses");
    return res.json();
  }

  async function create({ userId, name, shop, text, photo }) {
    const res = await fetch("/api/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, shop, text, photo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not post status");
    return data;
  }

  async function remove(id, userId) {
    const res = await fetch(`/api/statuses/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId || "")}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error("Could not delete status");
    return res.json();
  }

  function hoursLeft(expiresAt) {
    const ms = Math.max(0, expiresAt - Date.now());
    return Math.ceil(ms / 3600000);
  }

  window.ZEStatus = { list, create, remove, hoursLeft };
})();
