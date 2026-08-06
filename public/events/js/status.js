(function () {
  const COLOR_KEY = "ze_status_colors_v1";
  const DEFAULTS = { bgColor: "#C2410C", textColor: "#FFFFFF" };

  function safeColor(value, fallback) {
    const raw = String(value || "").trim();
    return /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw.toUpperCase() : (fallback || DEFAULTS.bgColor);
  }

  function getColorPrefs() {
    try {
      const raw = JSON.parse(localStorage.getItem(COLOR_KEY) || "{}");
      return {
        bgColor: safeColor(raw.bgColor, DEFAULTS.bgColor),
        textColor: safeColor(raw.textColor, DEFAULTS.textColor),
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function setColorPrefs({ bgColor, textColor }) {
    const next = {
      bgColor: safeColor(bgColor, DEFAULTS.bgColor),
      textColor: safeColor(textColor, DEFAULTS.textColor),
    };
    localStorage.setItem(COLOR_KEY, JSON.stringify(next));
    return next;
  }

  async function list() {
    const res = await fetch("/api/statuses");
    if (!res.ok) throw new Error("Could not load statuses");
    return res.json();
  }

  async function create({ userId, name, shop, text, photo, bgColor, textColor }) {
    const prefs = getColorPrefs();
    const res = await fetch("/api/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name,
        shop,
        text,
        photo,
        bgColor: safeColor(bgColor, prefs.bgColor),
        textColor: safeColor(textColor, prefs.textColor),
      }),
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

  window.ZEStatus = {
    list,
    create,
    remove,
    hoursLeft,
    safeColor,
    getColorPrefs,
    setColorPrefs,
    DEFAULTS,
  };
})();
