/* Frame-rate independent wheel easing, without moving the page into a wrapper. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  let frame = 0, target = scrollY, lastTime = 0, anchor = null;
  const limit = () => Math.max(0, document.scrollingElement.scrollHeight - innerHeight);
  const clamp = value => Math.max(0, Math.min(limit(), value));

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    anchor = null;
    target = scrollY;
    root.classList.remove('scroll-easing');
  }
  function tick(time) {
    const dt = Math.min(64, Math.max(1, time - lastTime));
    lastTime = time;
    target = clamp(target);
    let next;
    if (anchor) {
      const progress = Math.min(1, (time - anchor.started) / anchor.duration);
      // Ease in and out so section navigation has a gentle start and landing.
      const ease = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      next = anchor.from + (target - anchor.from) * ease;
      if (progress === 1) anchor = null;
    } else {
      next = scrollY + (target - scrollY) * (1 - Math.exp(-dt / 115));
    }
    window.scrollTo({ top: next, behavior: 'instant' });
    if (!anchor && Math.abs(target - scrollY) < 1) {
      window.scrollTo({ top: target, behavior: 'instant' });
      stop();
    } else frame = requestAnimationFrame(tick);
  }
  function start() {
    if (frame) return;
    root.classList.add('scroll-easing');
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }
  function nestedScroll(event) {
    return event.composedPath().some(element => {
      if (!(element instanceof Element) || element === document.body || element === root) return false;
      if (element.matches('textarea,select,input,[contenteditable],.modal-overlay,.lightbox-overlay')) return true;
      const style = getComputedStyle(element);
      return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    });
  }
  window.addEventListener('wheel', event => {
    if (reducedMotion.matches || event.ctrlKey || event.metaKey || event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY ||
        getComputedStyle(document.body).overflow === 'hidden' || nestedScroll(event)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? innerHeight : 1);
    const previous = frame ? target : scrollY;
    // A direction change responds immediately instead of finishing the old glide.
    target = clamp((Math.sign(delta) !== Math.sign(previous - scrollY) ? scrollY : previous) + delta);
    anchor = null;
    if (target === scrollY && !frame) return;
    event.preventDefault();
    start();
  }, { passive: false });

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.altKey || reducedMotion.matches || link.hasAttribute('download') || link.target) return;
    const hash = link.getAttribute('href');
    if (hash.length < 2) return;
    let section;
    try { section = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
    if (!section || getComputedStyle(document.body).overflow === 'hidden') return;
    event.preventDefault();
    stop();
    const offset = parseFloat(getComputedStyle(root).scrollPaddingTop) || 80;
    target = clamp(scrollY + section.getBoundingClientRect().top - offset);
    anchor = { from: scrollY, started: performance.now(), duration: Math.min(1200, 650 + Math.abs(target - scrollY) * .12) };
    if (location.hash !== hash) history.pushState(null, '', hash);
    start();
  });
  window.addEventListener('keydown', event => {
    if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) stop();
  });
  window.addEventListener('pointerdown', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('popstate', stop);
  window.addEventListener('resize', stop);
  reducedMotion.addEventListener('change', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
})();
