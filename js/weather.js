// Data layer: Open-Meteo (free, no API key).
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';

// WMO weather code -> label, emoji (day/night), theme key (drives colors + scene)
const CODES = {
  0: ['Clear', '☀️', '🌙', 'clear'],
  1: ['Mostly clear', '🌤️', '🌙', 'clear'],
  2: ['Partly cloudy', '⛅', '☁️', 'cloudy'],
  3: ['Overcast', '☁️', '☁️', 'cloudy'],
  45: ['Fog', '🌫️', '🌫️', 'fog'],
  48: ['Rime fog', '🌫️', '🌫️', 'fog'],
  51: ['Light drizzle', '🌦️', '🌧️', 'rain'],
  53: ['Drizzle', '🌦️', '🌧️', 'rain'],
  55: ['Heavy drizzle', '🌧️', '🌧️', 'rain'],
  56: ['Freezing drizzle', '🌧️', '🌧️', 'rain'],
  57: ['Freezing drizzle', '🌧️', '🌧️', 'rain'],
  61: ['Light rain', '🌦️', '🌧️', 'rain'],
  63: ['Rain', '🌧️', '🌧️', 'rain'],
  65: ['Heavy rain', '🌧️', '🌧️', 'rain'],
  66: ['Freezing rain', '🌧️', '🌧️', 'rain'],
  67: ['Freezing rain', '🌧️', '🌧️', 'rain'],
  71: ['Light snow', '🌨️', '🌨️', 'snow'],
  73: ['Snow', '❄️', '❄️', 'snow'],
  75: ['Heavy snow', '❄️', '❄️', 'snow'],
  77: ['Snow grains', '❄️', '❄️', 'snow'],
  80: ['Showers', '🌦️', '🌧️', 'rain'],
  81: ['Showers', '🌧️', '🌧️', 'rain'],
  82: ['Violent showers', '🌧️', '🌧️', 'rain'],
  85: ['Snow showers', '🌨️', '🌨️', 'snow'],
  86: ['Heavy snow showers', '❄️', '❄️', 'snow'],
  95: ['Thunderstorm', '⛈️', '⛈️', 'storm'],
  96: ['Thunderstorm, hail', '⛈️', '⛈️', 'storm'],
  99: ['Thunderstorm, hail', '⛈️', '⛈️', 'storm'],
};

export function describeCode(code, isDay = true) {
  const [label, day, night, theme] = CODES[code] ?? ['Unknown', '❓', '❓', 'cloudy'];
  return { label, icon: isDay ? day : night, theme };
}

export async function searchPlaces(name) {
  const r = await fetch(`${GEOCODE}?name=${encodeURIComponent(name)}&count=6&language=en`);
  if (!r.ok) throw new Error('Search failed');
  const j = await r.json();
  return (j.results ?? []).map(p => ({
    name: p.name,
    region: [p.admin1, p.country_code].filter(Boolean).join(', '),
    lat: p.latitude,
    lon: p.longitude,
  }));
}

export async function fetchWeather({ lat, lon }, units = 'imperial') {
  const imperial = units === 'imperial';
  const q = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max',
    temperature_unit: imperial ? 'fahrenheit' : 'celsius',
    wind_speed_unit: imperial ? 'mph' : 'kmh',
    timezone: 'auto',
    forecast_days: 7,
  });
  const r = await fetch(`${FORECAST}?${q}`);
  if (!r.ok) throw new Error('Forecast failed');
  return normalize(await r.json(), units);
}

function normalize(j, units) {
  const c = j.current;
  const isDay = !!c.is_day;
  const now = describeCode(c.weather_code, isDay);
  // Local "now" in the place's timezone, as the same string format the API uses for hourly times.
  const startIdx = Math.max(0, j.hourly.time.findIndex(t => t >= c.time.slice(0, 13) + ':00'));
  const hourly = j.hourly.time.slice(startIdx, startIdx + 24).map((t, i) => {
    const k = startIdx + i;
    return {
      time: t,
      temp: Math.round(j.hourly.temperature_2m[k]),
      pop: j.hourly.precipitation_probability[k],
      ...describeCode(j.hourly.weather_code[k], !!j.hourly.is_day[k]),
    };
  });
  const daily = j.daily.time.map((d, i) => ({
    date: d,
    hi: Math.round(j.daily.temperature_2m_max[i]),
    lo: Math.round(j.daily.temperature_2m_min[i]),
    pop: j.daily.precipitation_probability_max[i],
    uv: j.daily.uv_index_max[i],
    sunrise: j.daily.sunrise[i],
    sunset: j.daily.sunset[i],
    ...describeCode(j.daily.weather_code[i], true),
  }));
  return {
    units,
    isDay,
    now: {
      temp: Math.round(c.temperature_2m),
      feels: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      wind: Math.round(c.wind_speed_10m),
      windDir: c.wind_direction_10m,
      pressure: Math.round(c.surface_pressure),
      precip: c.precipitation,
      code: c.weather_code,
      ...now,
    },
    hourly,
    daily,
    today: daily[0],
  };
}
