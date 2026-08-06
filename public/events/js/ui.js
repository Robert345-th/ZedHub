(function () {
  const STYLE_ID = "ze-ui-styles";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ze-toast-wrap {
        position: fixed; left: 12px; right: 12px; top: 12px; z-index: 9999;
        display: flex; flex-direction: column; gap: 8px; pointer-events: none;
      }
      .ze-toast {
        pointer-events: auto; border-radius: 12px; padding: 12px 14px;
        font-size: 13px; font-weight: 600; line-height: 1.4;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18); animation: zeToastIn .18s ease;
      }
      .ze-toast.error { background: #FBE7E8; color: #A3131C; border: 1px solid #F0C1C4; }
      .ze-toast.success { background: #E7F5EC; color: #1F7A43; border: 1px solid #BFE5CE; }
      .ze-toast.info { background: #FFF3E0; color: #7A3E00; border: 1px solid #F0D2A8; }
      @keyframes zeToastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
      .ze-modal-overlay {
        display: none; position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.45); align-items: flex-end; justify-content: center;
      }
      .ze-modal-overlay.open { display: flex; }
      .ze-modal-box {
        width: 100%; max-width: 480px; background: #F4F1EC;
        border-radius: 20px 20px 0 0; padding: 20px 18px calc(18px + env(safe-area-inset-bottom, 0px));
      }
      .ze-modal-title { font-size: 16px; font-weight: 700; color: #211D1A; margin-bottom: 6px; }
      .ze-modal-text { font-size: 13px; color: #5C5955; line-height: 1.45; margin-bottom: 16px; }
      .ze-modal-actions { display: flex; gap: 10px; }
      .ze-modal-btn {
        flex: 1; border: none; border-radius: 12px; padding: 14px;
        font-size: 14px; font-weight: 700; cursor: pointer;
      }
      .ze-modal-btn.cancel { background: #fff; border: 1px solid #E2E0DC; color: #211D1A; }
      .ze-modal-btn.ok { background: #C2410C; color: #fff; }
      .ze-modal-btn.danger { background: #A3131C; color: #fff; }
    `;
    document.head.appendChild(style);
  }

  function toastWrap() {
    ensureStyles();
    let wrap = document.getElementById("zeToastWrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "zeToastWrap";
      wrap.className = "ze-toast-wrap";
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function toast(message, type) {
    const wrap = toastWrap();
    const el = document.createElement("div");
    el.className = `ze-toast ${type || "error"}`;
    el.textContent = message || "Something went wrong.";
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .2s";
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  function confirmDialog(opts) {
    ensureStyles();
    const options = typeof opts === "string" ? { message: opts } : (opts || {});
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "ze-modal-overlay open";
      overlay.innerHTML = `
        <div class="ze-modal-box" role="dialog" aria-modal="true">
          <div class="ze-modal-title"></div>
          <div class="ze-modal-text"></div>
          <div class="ze-modal-actions">
            <button type="button" class="ze-modal-btn cancel" data-act="cancel"></button>
            <button type="button" class="ze-modal-btn ${options.danger ? "danger" : "ok"}" data-act="ok"></button>
          </div>
        </div>`;
      overlay.querySelector(".ze-modal-title").textContent = options.title || "Please confirm";
      overlay.querySelector(".ze-modal-text").textContent = options.message || "Are you sure?";
      overlay.querySelector('[data-act="cancel"]').textContent = options.cancelText || "Cancel";
      overlay.querySelector('[data-act="ok"]').textContent = options.okText || "OK";
      const finish = (value) => {
        overlay.remove();
        resolve(value);
      };
      overlay.querySelector('[data-act="cancel"]').onclick = () => finish(false);
      overlay.querySelector('[data-act="ok"]').onclick = () => finish(true);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) finish(false);
      });
      document.body.appendChild(overlay);
    });
  }

  window.ZEUI = { toast, confirm: confirmDialog, error: (msg) => toast(msg, "error") };
})();
