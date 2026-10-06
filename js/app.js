import { fetchWeather, searchPlaces } from './weather.js';
import { speak } from './personality.js';
import { renderScene } from './scene.js';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const state = {
  place: store.get('place', null),
  saved: store.get('saved', []),
  units: store.get('units', 'imperial'),
  weather: null,
};

const unitSym = () => (state.units === 'imperial' ? '°F' : '°C');
const windUnit = () => (state.units === 'imperial' ? 'mph' : 'km/h');
const hourLabel = iso => { const h = +iso.slice(11, 13); return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`; };
const dayLabel = (iso, i) => (i === 0 ? 'Today' : new Date(iso + 'T12:00').toLocaleDateString('en-US', { weekday: 'short' }));
const clock = iso => { const h = +iso.slice(11, 13), m = iso.slice(14, 16); return `${h % 12 || 12}:${m}${h < 12 ? 'am' : 'pm'}`; };
const compass = d => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
const uvLabel = u => (u < 3 ? 'Low' : u < 6 ? 'Moderate' : u < 8 ? 'High' : u < 11 ? 'Very high' : 'Extreme');

async function load() {
  if (!state.place) return openDialog();
  $('locName').textContent = state.place.name;
  try {
    state.weather = await fetchWeather(state.place, state.units);
    render();
  } catch (e) {
    $('headline').textContent = 'Couldn’t load weather';
    $('subline').textContent = 'Check your connection and tap the location to retry.';
  }
}

function render() {
  const w = state.weather;
  const theme = w.now.theme;
  document.body.dataset.weather = theme;
  document.body.dataset.time = w.isDay ? 'day' : 'night';

  const rainSoon = w.hourly.slice(0, 12).find(h => h.pop >= 50) ?? null;
  const hot = state.units === 'imperial' ? w.now.temp >= 85 : w.now.temp >= 29;
  const cold = state.units === 'imperial' ? w.now.temp <= 32 : w.now.temp <= 0;
  const ctx = { w, theme, isDay: w.isDay, hot, cold, rainSoon };
  const { headline, sub } = speak(ctx);

  $('heroIcon').textContent = w.now.icon;
  $('temp').textContent = w.now.temp;
  $('headline').textContent = headline;
  $('subline').textContent = sub;
  $('hi').textContent = `H ${w.today.hi}°`;
  $('lo').textContent = `L ${w.today.lo}°`;
  $('feels').textContent = `Feels ${w.now.feels}°`;
  $('unitBtn').textContent = unitSym();

  $('hourly').replaceChildren(...w.hourly.map(h => {
    const d = document.createElement('div');
    d.className = 'hour';
    d.innerHTML = `<span>${hourLabel(h.time)}</span><b>${h.icon}</b><strong>${h.temp}°</strong><em>${h.pop >= 20 ? h.pop + '%' : ''}</em>`;
    return d;
  }));

  const min = Math.min(...w.daily.map(d => d.lo));
  const max = Math.max(...w.daily.map(d => d.hi));
  $('daily').replaceChildren(...w.daily.map((d, i) => {
    const li = document.createElement('li');
    const left = ((d.lo - min) / (max - min || 1)) * 100;
    const width = Math.max(((d.hi - d.lo) / (max - min || 1)) * 100, 6);
    li.innerHTML = `<span class="d-name">${dayLabel(d.date, i)}</span><span class="d-icon">${d.icon}</span>
      <span class="d-pop">${d.pop >= 20 ? d.pop + '%' : ''}</span><span class="d-lo">${d.lo}°</span>
      <span class="bar"><i style="left:${left}%;width:${width}%"></i></span><span class="d-hi">${d.hi}°</span>`;
    return li;
  }));

  const t = w.today;
  const tiles = [
    ['Wind', `${w.now.wind}<small>${windUnit()}</small>`, compass(w.now.windDir)],
    ['Humidity', `${w.now.humidity}<small>%</small>`, ''],
    ['UV', `${Math.round(t.uv)}`, uvLabel(t.uv)],
    ['Rain', `${t.pop ?? 0}<small>%</small>`, 'chance today'],
    ['Sunrise', clock(t.sunrise), ''],
    ['Sunset', clock(t.sunset), ''],
    ['Pressure', `${w.now.pressure}<small>hPa</small>`, ''],
    ['Feels like', `${w.now.feels}°`, ''],
  ];
  $('tiles').replaceChildren(...tiles.map(([k, v, s], i) => {
    const d = document.createElement('div');
    d.className = `tile tile--${i % 4}`;
    d.innerHTML = `<h3>${k}</h3><div class="tile__v">${v}</div><div class="tile__s">${s}</div>`;
    return d;
  }));

  document.querySelector('meta[name=theme-color]').content =
    getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#FFD60A';
  renderScene($('scene'), ctx);
}

// ---------- location dialog ----------
const dlg = $('locDialog');
function openDialog() {
  renderSaved();
  $('results').replaceChildren();
  $('search').value = '';
  if (!dlg.open) dlg.showModal();
}

function placeItem(p, onPick) {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<b></b> <span></span>`;
  b.firstChild.textContent = p.name;
  b.lastChild.textContent = p.region ?? '';
  b.onclick = () => onPick(p);
  li.append(b);
  return li;
}

function renderSaved() {
  $('saved').replaceChildren(...state.saved.map(p => placeItem(p, choose)));
}

function choose(p) {
  state.place = p;
  store.set('place', p);
  if (!state.saved.some(s => s.lat === p.lat && s.lon === p.lon)) {
    state.saved = [p, ...state.saved].slice(0, 8);
    store.set('saved', state.saved);
  }
  dlg.close();
  load();
}

let timer;
$('search').addEventListener('input', e => {
  clearTimeout(timer);
  const q = e.target.value.trim();
  if (q.length < 2) return $('results').replaceChildren();
  timer = setTimeout(async () => {
    try { $('results').replaceChildren(...(await searchPlaces(q)).map(p => placeItem(p, choose))); }
    catch { $('results').textContent = 'Search failed.'; }
  }, 250);
});

$('geoBtn').onclick = () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => choose({ name: 'My location', region: '', lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => { $('results').textContent = 'Location permission denied.'; },
  );
};

$('locBtn').onclick = openDialog;
$('unitBtn').onclick = () => {
  state.units = state.units === 'imperial' ? 'metric' : 'imperial';
  store.set('units', state.units);
  load();
};

load();
