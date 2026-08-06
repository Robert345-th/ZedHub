(function () {
  function getUser() {
    try {
      const raw = localStorage.getItem("ze_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem("ze_token") || "";
  }

  function setSession(token, user) {
    if (token) localStorage.setItem("ze_token", token);
    if (user) localStorage.setItem("ze_user", JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem("ze_token");
    localStorage.removeItem("ze_user");
  }

  /** Keep Events links inside /events/ even if callers pass bare paths. */
  function eventsPath(path) {
    if (!path) return "/events/";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/events/") || path === "/events") return path;
    if (path.startsWith("/")) return "/events" + path;
    return "/events/" + path;
  }

  function requireLogin(redirectTo) {
    if (!getToken()) {
      const next = encodeURIComponent(eventsPath(redirectTo || location.pathname + location.search));
      location.href = `/events/login.html?next=${next}`;
      return false;
    }
    return true;
  }

  function isLoggedIn() {
    return !!getToken();
  }

  window.ZEAuth = { getUser, getToken, setSession, clearSession, requireLogin, isLoggedIn, eventsPath };
})();
