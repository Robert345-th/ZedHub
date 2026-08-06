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

  function requireLogin(redirectTo) {
    if (!getToken()) {
      const next = encodeURIComponent(redirectTo || location.pathname + location.search);
      location.href = `/events/login.html?next=${next}`;
      return false;
    }
    return true;
  }

  function isLoggedIn() {
    return !!getToken();
  }

  window.ZEAuth = { getUser, getToken, setSession, clearSession, requireLogin, isLoggedIn };
})();
