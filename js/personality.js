// PERSONALITY — swap this file's `speak` to change the app's voice.
// Receives a weather context and returns { headline, sub }.
//
// ctx = {
//   w:      normalized weather (see weather.js) — w.now, w.today, w.hourly, w.daily
//   theme:  'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog'
//   isDay:  boolean
//   hot / cold: booleans (relative to units)
//   rainSoon: first hour in the next 12 with >=50% chance of rain, or null
// }
//
// Placeholder voice is deliberately plain; replace it once we pick a personality.

export function speak(ctx) {
  const { w } = ctx;
  const headline = w.now.label;
  let sub = `High ${w.today.hi}°, low ${w.today.lo}°.`;
  if (ctx.rainSoon) sub += ` Rain likely around ${formatHour(ctx.rainSoon.time)}.`;
  return { headline, sub };
}

function formatHour(iso) {
  const h = Number(iso.slice(11, 13));
  return `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
}
