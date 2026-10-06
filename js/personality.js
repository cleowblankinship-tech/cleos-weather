// PERSONALITY: "cozy gremlin" — lowercase, chaotic, snack-obsessed, weirdly wholesome.
// `speak(ctx)` returns { headline, sub }. See the ctx shape below; swap this file to change the voice.
//
// ctx = {
//   w:      normalized weather (see weather.js) — w.now, w.today, w.hourly, w.daily
//   theme:  'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog'
//   isDay:  boolean
//   hot / cold: booleans (relative to units)
//   rainSoon: first hour in the next 12 with >=50% chance of rain, or null
// }

export const lines = {
  loading: ['gathering weather…', 'asking the clouds…', 'one sec, checking outside…'],
  error: ['the clouds ghosted us', 'tap the city up top to try again. snacks while you wait?'],
};

const HEADLINES = {
  clear: {
    day: ['sun is out!! go be a lizard on a rock.', 'big blue sky. suspiciously perfect.', 'sunbeam weather. nap in it.'],
    night: ['clear night!! the stars showed up.', 'no clouds. the moon is just flexing.', 'night sky is open. blanket on the porch?'],
  },
  cloudy: {
    day: ['cloud blanket day. very cozy, very gray.', 'the sky is a big soft pillow.', 'meh sky, great sweater weather.'],
    night: ['cloudy night. the stars are hiding.', 'sky blanket is on. so should yours be.'],
  },
  rain: {
    day: ["it's raining!! soup weather. blanket weather.", 'puddle season!! stomp responsibly.', 'rain on the roof. tea is mandatory.'],
    night: ['rainy night. best sleeping sounds.', 'pitter patter. the cozy has arrived.'],
  },
  storm: {
    day: ['THUNDER!! the sky is yelling.', 'big storm energy. stay inside, eat crackers.'],
    night: ['thunder night. dramatic. cover your ears and your feet.', 'the sky is throwing a tantrum. blanket fort time.'],
  },
  snow: {
    day: ['it is SNOWING. everything is a cake now.', 'snow day!! hot chocolate is law.'],
    night: ['quiet snow night. the world got muted.', 'snowing in the dark. so pretty, so cold, so blanket.'],
  },
  fog: {
    day: ['foggy!! the world is a soft smudge.', 'cloud fell down. walk through it, it is fun.'],
    night: ['spooky fog. very cozy-creepy.', 'fog night. everything is mysterious and damp.'],
  },
};

const FLAVOR = {
  hot: ['hot hot hot. be a puddle. drink water.', 'melting. ice cubes are a food group.'],
  cold: ['brr!! wear two socks. maybe three.', 'freezing. layers and a snack in each pocket.'],
};

export function speak(ctx) {
  const { w, theme, isDay, hot, cold, rainSoon } = ctx;
  const seed = hash(`${w.today.date}${w.now.code}${w.hourly[0]?.time.slice(0, 13)}`);
  const pool = HEADLINES[theme]?.[isDay ? 'day' : 'night'] ?? HEADLINES.cloudy.day;
  const headline = pick(pool, seed);

  const parts = [`${w.now.temp}° outside, high of ${w.today.hi}°.`];
  if (rainSoon && theme !== 'rain' && theme !== 'storm') {
    parts.push(`rain showing up around ${formatHour(rainSoon.time)}, snack accordingly.`);
  } else if (theme === 'rain' || theme === 'storm') {
    parts.push('100% reasons to stay in.');
  } else if (hot) {
    parts.push(pick(FLAVOR.hot, seed));
  } else if (cold) {
    parts.push(pick(FLAVOR.cold, seed));
  }
  return { headline, sub: parts.join(' ') };
}

function pick(list, seed) { return list[seed % list.length]; }

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function formatHour(iso) {
  const h = Number(iso.slice(11, 13));
  return `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
}
