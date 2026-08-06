(function () {
  function isValidCoords(coords) {
    return coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng);
  }

  function getDeviceCoords(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000, ...(options || {}) }
      );
    });
  }

  function getSavedCoords() {
    try {
      const raw = localStorage.getItem("ze_home_location");
      const parsed = raw ? JSON.parse(raw) : null;
      return isValidCoords(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveCoords(coords, label) {
    if (!isValidCoords(coords)) return;
    localStorage.setItem("ze_home_location", JSON.stringify(coords));
    if (label) localStorage.setItem("ze_user_location_label", label);
  }

  function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  window.ZELocation = { getDeviceCoords, getSavedCoords, saveCoords, getDistanceKm, isValidCoords };
})();
