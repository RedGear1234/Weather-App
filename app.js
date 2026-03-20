const form = document.querySelector('#search-form');
const input = document.querySelector('#city-input');
const statusCard = document.querySelector('#status-card');
const weatherGrid = document.querySelector('#weather-grid');
const forecastList = document.querySelector('#forecast-list');
const forecastTemplate = document.querySelector('#forecast-item-template');

const locationName = document.querySelector('#location-name');
const weatherSummary = document.querySelector('#weather-summary');
const weatherIcon = document.querySelector('#weather-icon');
const currentTemp = document.querySelector('#current-temp');
const feelsLike = document.querySelector('#feels-like');
const humidity = document.querySelector('#humidity');
const wind = document.querySelector('#wind');
const precipitation = document.querySelector('#precipitation');
const localTime = document.querySelector('#local-time');

const weatherCodes = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Moderate drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌦️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Slight snow', icon: '🌨️' },
  73: { label: 'Moderate snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Rain showers', icon: '🌧️' },
  82: { label: 'Violent rain showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' }
};

function setStatus(message, tone = 'neutral') {
  statusCard.textContent = message;
  statusCard.style.color = tone === 'error' ? '#fecaca' : 'var(--text-muted)';
}

function getWeatherMeta(code) {
  return weatherCodes[code] ?? { label: 'Unknown conditions', icon: '🌍' };
}

function formatDay(dateString, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone
  }).format(new Date(`${dateString}T12:00:00`));
}

function formatTime(dateTimeString, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone
  }).format(new Date(dateTimeString));
}

function renderWeather(city, data) {
  const current = data.current;
  const daily = data.daily;
  const meta = getWeatherMeta(current.weather_code);

  locationName.textContent = `${city.name}, ${city.country}`;
  weatherSummary.textContent = meta.label;
  weatherIcon.textContent = meta.icon;
  currentTemp.textContent = Math.round(current.temperature_2m);
  feelsLike.textContent = Math.round(current.apparent_temperature);
  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  precipitation.textContent = `${current.precipitation.toFixed(1)} mm`;
  localTime.textContent = formatTime(current.time, data.timezone);

  forecastList.replaceChildren();

  daily.time.slice(0, 5).forEach((day, index) => {
    const node = forecastTemplate.content.firstElementChild.cloneNode(true);
    const forecastMeta = getWeatherMeta(daily.weather_code[index]);

    node.querySelector('.forecast-day').textContent = formatDay(day, data.timezone);
    node.querySelector('.forecast-condition').textContent = forecastMeta.label;
    node.querySelector('.forecast-icon').textContent = forecastMeta.icon;
    node.querySelector('.forecast-temp').textContent = `${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°`;

    forecastList.appendChild(node);
  });

  weatherGrid.classList.remove('hidden');
  setStatus(`Showing weather for ${city.name}, ${city.country}.`);
}

async function getCoordinates(city) {
  const params = new URLSearchParams({
    name: city,
    count: '1',
    language: 'en',
    format: 'json'
  });

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!response.ok) throw new Error('Unable to reach the geocoding service.');

  const payload = await response.json();
  if (!payload.results?.length) throw new Error(`No city found for “${city}”.`);

  return payload.results[0];
}

async function getForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m'
    ].join(','),
    daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min'].join(','),
    timezone: 'auto',
    forecast_days: '5'
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('Unable to retrieve weather data right now.');
  return response.json();
}

async function searchWeather(cityQuery) {
  setStatus(`Looking up ${cityQuery}…`);

  try {
    const city = await getCoordinates(cityQuery);
    const forecast = await getForecast(city.latitude, city.longitude);
    renderWeather(city, forecast);
  } catch (error) {
    weatherGrid.classList.add('hidden');
    setStatus(error.message, 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const cityQuery = input.value.trim();
  if (!cityQuery) return;
  searchWeather(cityQuery);
});

input.value = 'San Francisco';
searchWeather(input.value);
