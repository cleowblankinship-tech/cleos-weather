# Cleo's Weather

A bright, maximal weather app (static site, no build step, no API key — data from [Open-Meteo](https://open-meteo.com/)).

Run it: `python3 -m http.server 8000` then open http://localhost:8000.

## Where to plug things in
- `js/personality.js` — `speak(ctx)` returns the headline + subline. Change the voice here.
- `js/scene.js` — `renderScene(el, ctx)` is the animation hook (full-screen layer behind the UI). `body[data-weather]` / `body[data-time]` are also available to CSS.
- `css/style.css` — per-weather color tokens at the top.
- `js/weather.js` — data fetching + weather-code mapping.
