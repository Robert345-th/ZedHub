(function () {
  /** Keep Zambian 0… local form for existing accounts; otherwise E.164 with +. */
  function normalizePhone(raw) {
    let phone = String(raw || "").trim().replace(/[\s-]/g, "");
    if (!phone) return "";
    if (phone.startsWith("00")) phone = "+" + phone.slice(2);
    if (phone.startsWith("+")) {
      const digits = phone.slice(1).replace(/\D/g, "");
      if (digits.startsWith("260") && digits.length === 12) {
        return "0" + digits.slice(3);
      }
      return digits ? "+" + digits : "";
    }
    // Digits only
    phone = phone.replace(/\D/g, "");
    if (phone.startsWith("260") && phone.length === 12) {
      return "0" + phone.slice(3);
    }
    if (phone.length === 9 && /^(573\d{6}|574\d{6}|75\d{7}|77\d{7}|97\d{7}|95\d{7})$/.test(phone)) {
      return "0" + phone;
    }
    if (/^(0573\d{6}|0574\d{6}|075\d{7}|077\d{7}|095\d{7}|097\d{7})$/.test(phone)) {
      return phone;
    }
    // International without +: assume full country code already included
    if (phone.length >= 8 && phone.length <= 15) {
      return "+" + phone;
    }
    return phone;
  }

  function isValidPhone(raw) {
    const phone = normalizePhone(raw);
    if (!phone) return false;
    if (/^(0573\d{6}|0574\d{6}|075\d{7}|077\d{7}|095\d{7}|097\d{7})$/.test(phone)) return true;
    if (/^\+\d{8,15}$/.test(phone)) return true;
    return false;
  }

  // Back-compat aliases used by older pages
  function normalizeZambianPhone(raw) {
    return normalizePhone(raw);
  }
  function isValidZambianPhone(raw) {
    return isValidPhone(raw);
  }

  window.normalizePhone = normalizePhone;
  window.isValidPhone = isValidPhone;
  window.normalizeZambianPhone = normalizeZambianPhone;
  window.isValidZambianPhone = isValidZambianPhone;
})();
