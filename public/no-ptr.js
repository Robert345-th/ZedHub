/* Blocks Chrome/Android pull-to-refresh spinner on Nexus screens. */
(function () {
  try {
    document.documentElement.style.overscrollBehavior = 'none';
    if (document.body) document.body.style.overscrollBehavior = 'none';
  } catch (_) {}

  var startY = 0;

  function scrollTopOf(el) {
    if (!el) return 0;
    if (el === document.body || el === document.documentElement) {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }
    return el.scrollTop || 0;
  }

  function canScrollUp(el) {
    while (el && el !== document.documentElement) {
      if (el === document.body) break;
      var style = window.getComputedStyle(el);
      var oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight + 1) {
        if (scrollTopOf(el) > 0) return true;
        return false;
      }
      el = el.parentElement;
    }
    return scrollTopOf(document.scrollingElement || document.documentElement) > 0;
  }

  document.addEventListener(
    'touchstart',
    function (e) {
      if (e.touches && e.touches.length === 1) startY = e.touches[0].clientY;
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    'touchmove',
    function (e) {
      if (!e.cancelable || !e.touches || e.touches.length !== 1) return;
      var dy = e.touches[0].clientY - startY;
      if (dy <= 0) return; // not pulling down
      var target = e.target;
      if (canScrollUp(target)) return;
      e.preventDefault();
    },
    { passive: false, capture: true }
  );
})();
