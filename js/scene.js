// SCENE — animation hook. The app calls `renderScene(el, ctx)` whenever the weather changes.
// `el` is the full-screen #scene layer behind the UI. Default: just stamps data attributes
// (body[data-weather], body[data-time]) which CSS can key off. Replace with canvas/Lottie/
// CSS particles/whatever later; return a cleanup function if you start timers.

let cleanup = null;

export function renderScene(el, ctx) {
  cleanup?.();
  cleanup = null;
  el.dataset.weather = ctx.theme;
  el.dataset.time = ctx.isDay ? 'day' : 'night';
  el.replaceChildren();
  // TODO: animations
}
