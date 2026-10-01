// Scroll-driven effects of the EPM page: blocks that slide in the first time they scroll into view,
// and the overview numbers that count up once their card is revealed.

// Adds "in-view" to el the first time 15% of it is on screen (its epm-reveal dir-* classes in
// epm.css pick the direction it arrives from), then stops watching. onReveal runs at that moment.
export function observeReveal(el, onReveal) {
  if (!el) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('in-view');
        observer.disconnect();
        if (onReveal) onReveal();
      }
    },
    { threshold: 0.15 },
  );
  observer.observe(el);
}

// Shows `target` (plus suffix) in el. The first time activate() is called it counts up from 0 to
// the target - fast at the start, easing to a stop exactly on the real number - and from then on
// any new target is shown directly. Before activation it just mirrors the target, so the stat
// never flashes 0 while still loading or off-screen.
export function createCountUp(el, { target = 0, suffix = '', duration = 1100 } = {}) {
  const state = { target, active: false, started: false };
  let rafId = 0;

  const show = (value) => {
    if (el) el.textContent = `${value}${suffix}`;
  };

  // Re-run whenever the target or the active flag changes.
  const run = () => {
    cancelAnimationFrame(rafId);
    if (!state.active || state.started) {
      // Not revealed yet, or the one-time animation already ran - track the target directly.
      show(state.target);
      return;
    }
    state.started = true;
    const { target: goal } = state;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      show(Math.round(goal * eased));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
  };

  return {
    setTarget(value) {
      if (value === state.target) return;
      state.target = value;
      run();
    },
    activate() {
      if (state.active) return;
      state.active = true;
      run();
    },
  };
}
