(function () {
  const API_URL = "https://zedevents-production.up.railway.app";

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const token = localStorage.getItem("ze_token");
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && (data.error || data.message)) || "Request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function firstPhoto(photos) {
    if (!photos) return "";
    if (Array.isArray(photos)) return photos[0] || "";
    if (typeof photos === "string") {
      try {
        const parsed = JSON.parse(photos);
        if (Array.isArray(parsed)) return parsed[0] || "";
      } catch {
        return photos;
      }
    }
    return "";
  }

  /** Smaller Cloudinary thumbs for lists (falls back to original URL). */
  function thumbUrl(url, width) {
    const w = width || 400;
    if (!url || typeof url !== "string") return "";
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
      return url.replace("/upload/", `/upload/w_${w},c_fill,q_auto,f_auto/`);
    }
    return url;
  }

  function formatPrice(price) {
    if (price == null || price === "") return "Ask for price";
    const n = Number(price);
    if (Number.isNaN(n)) return String(price);
    return n.toLocaleString();
  }

  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/kstg72vx/image/upload";
  const UPLOAD_PRESET = "online_shops_uploads";

  async function uploadImage(file) {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: form });
    const data = await res.json();
    if (!data.secure_url) throw new Error("Photo upload failed");
    return data.secure_url;
  }

  window.ZE = { API_URL, api, firstPhoto, thumbUrl, formatPrice, uploadImage };

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }
})();
