/**
 * Shared Nexus coin wallet used by Fruits + Words.
 * Key: nexus_wallet_v1  { coins: number, migrated?: boolean }
 */
(function (global) {
  const KEY = 'nexus_wallet_v1';
  const FLAG = 'nexus_wallet_migrated_v1';

  function readRaw() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  }

  function write(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {}
    try {
      global.dispatchEvent(new CustomEvent('nexus-wallet', { detail: { coins: state.coins } }));
    } catch (_) {}
  }

  function migrateOnce() {
    try {
      if (localStorage.getItem(FLAG) === '1') return;
    } catch (_) {}

    let coins = 0;
    let found = false;
    try {
      const f = JSON.parse(
        localStorage.getItem('fruits_offline_v2') ||
          localStorage.getItem('fruits_offline') ||
          '{}'
      );
      if (typeof f.coins === 'number') {
        coins += f.coins;
        found = true;
      }
    } catch (_) {}
    try {
      const w = JSON.parse(localStorage.getItem('nexus_words_v1') || '{}');
      if (typeof w.coins === 'number') {
        coins += w.coins;
        found = true;
      }
    } catch (_) {}

    if (!found) {
      const existing = readRaw();
      coins = existing && typeof existing.coins === 'number' ? existing.coins : 150;
    }

    write({ coins: Math.max(0, Math.floor(coins)), migrated: true });
    try {
      localStorage.setItem(FLAG, '1');
    } catch (_) {}

    // Keep game blobs in sync so old UI never shows a stale pile
    syncIntoGames(Math.max(0, Math.floor(coins)));
  }

  function syncIntoGames(coins) {
    try {
      const fRaw =
        localStorage.getItem('fruits_offline_v2') || localStorage.getItem('fruits_offline');
      if (fRaw) {
        const f = JSON.parse(fRaw);
        f.coins = coins;
        localStorage.setItem('fruits_offline_v2', JSON.stringify(f));
      }
    } catch (_) {}
    try {
      const wRaw = localStorage.getItem('nexus_words_v1');
      if (wRaw) {
        const w = JSON.parse(wRaw);
        w.coins = coins;
        localStorage.setItem('nexus_words_v1', JSON.stringify(w));
      }
    } catch (_) {}
  }

  function ensure() {
    migrateOnce();
    const s = readRaw();
    if (s && typeof s.coins === 'number') return s;
    const fresh = { coins: 150, migrated: true };
    write(fresh);
    return fresh;
  }

  const API = {
    getCoins() {
      return ensure().coins;
    },
    setCoins(n) {
      const coins = Math.max(0, Math.floor(Number(n) || 0));
      write({ coins, migrated: true });
      syncIntoGames(coins);
      return coins;
    },
    add(n) {
      return API.setCoins(API.getCoins() + (Number(n) || 0));
    },
    spend(n) {
      const cost = Math.max(0, Math.floor(Number(n) || 0));
      const cur = API.getCoins();
      if (cur < cost) return false;
      API.setCoins(cur - cost);
      return true;
    },
    bindUI(selector) {
      const paint = () => {
        const c = API.getCoins();
        document.querySelectorAll(selector).forEach((el) => {
          el.textContent = String(c);
        });
      };
      paint();
      global.addEventListener('nexus-wallet', paint);
      return paint;
    },
  };

  migrateOnce();
  global.NexusWallet = API;
})(typeof window !== 'undefined' ? window : globalThis);
