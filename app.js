const form = document.querySelector('#search-form');
const input = document.querySelector('#city-input');
const submitButton = document.querySelector('#submit-button');
const unitToggle = document.querySelector('#unit-toggle');
const statusCard = document.querySelector('#status-card');
const weatherGrid = document.querySelector('#weather-grid');
const forecastList = document.querySelector('#forecast-list');
const hourlyList = document.querySelector('#hourly-list');
const forecastTemplate = document.querySelector('#forecast-item-template');
const hourlyTemplate = document.querySelector('#hourly-item-template');
const recentSearchesWrapper = document.querySelector('#recent-searches-wrapper');
const recentSearchesContainer = document.querySelector('#recent-searches');

const locationName = document.querySelector('#location-name');
const locationMeta = document.querySelector('#location-meta');
const weatherSummary = document.querySelector('#weather-summary');
const weatherIcon = document.querySelector('#weather-icon');
const currentTemp = document.querySelector('#current-temp');
const temperatureUnit = document.querySelector('#temperature-unit');
const feelsLike = document.querySelector('#feels-like');
const feelsLikeUnit = document.querySelector('#feels-like-unit');
const humidity = document.querySelector('#humidity');
const wind = document.querySelector('#wind');
const precipitation = document.querySelector('#precipitation');
const localTime = document.querySelector('#local-time');
const uvIndex = document.querySelector('#uv-index');
const sunrise = document.querySelector('#sunrise');
const sunset = document.querySelector('#sunset');

const RECENT_SEARCHES_KEY = 'weather-now-recent-searches';
const DEFAULT_CITY = 'San Francisco';

let currentUnit = 'celsius';
let lastWeatherPayload = null;
let lastCity = null;

const weatherCodes = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Rime fog', icon: '🌫️' },
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
  82: { label: 'Violent showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Storm with hail', icon: '⛈️' },
  99: { label: 'Severe storm', icon: '⛈️' }
};

function setStatus(message, tone = 'neutral') {
  statusCard.textContent = message;
  statusCard.style.color = tone === 'error' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--text-muted)';
}

function setLoadingState(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? 'Loading…' : 'Get weather';
}

function getWeatherMeta(code) {
  return weatherCodes[code] ?? { label: 'Unknown conditions', icon: '🌍' };
}

function getDisplayUnit() {
  return currentUnit === 'celsius' ? '°C' : '°F';
}

function convertTemperature(valueInCelsius) {
  return currentUnit === 'celsius' ? valueInCelsius : (valueInCelsius * 9) / 5 + 32;
}

function formatTemperature(valueInCelsius) {
  return `${Math.round(convertTemperature(valueInCelsius))}${getDisplayUnit()}`;
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

function getHourlySlice(hourly) {
  const nowIndex = hourly.time.findIndex((entry) => entry === lastWeatherPayload.data.current.time);
  const startIndex = nowIndex >= 0 ? nowIndex : 0;

  return hourly.time.slice(startIndex, startIndex + 8).map((time, index) => ({
    time,
    temperature: hourly.temperature_2m[startIndex + index],
    weatherCode: hourly.weather_code[startIndex + index],
    precipitationProbability: hourly.precipitation_probability[startIndex + index]
  }));
}

function saveRecentSearch(cityName) {
  const recent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]');
  const nextRecent = [cityName, ...recent.filter((entry) => entry.toLowerCase() !== cityName.toLowerCase())].slice(0, 5);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecent));
  renderRecentSearches();
}

function renderRecentSearches() {
  const recent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]');
  recentSearchesContainer.replaceChildren();

  if (!recent.length) {
    recentSearchesWrapper.classList.add('hidden');
    return;
  }

  recent.forEach((cityName) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-chip';
    button.textContent = cityName;
    button.addEventListener('click', () => {
      input.value = cityName;
      searchWeather(cityName);
    });
    recentSearchesContainer.appendChild(button);
  });

  recentSearchesWrapper.classList.remove('hidden');
}

function renderForecast(daily, timezone) {
  forecastList.replaceChildren();

  daily.time.slice(0, 5).forEach((day, index) => {
    const node = forecastTemplate.content.firstElementChild.cloneNode(true);
    const forecastMeta = getWeatherMeta(daily.weather_code[index]);
    node.querySelector('.forecast-day').textContent = formatDay(day, timezone);
    node.querySelector('.forecast-condition').textContent = forecastMeta.label;
    node.querySelector('.forecast-rain').textContent = `${Math.round(daily.precipitation_probability_max[index])}% rain`;
    node.querySelector('.forecast-icon').textContent = forecastMeta.icon;
    node.querySelector('.forecast-temp').textContent = `${formatTemperature(daily.temperature_2m_max[index])} / ${formatTemperature(daily.temperature_2m_min[index])}`;
    forecastList.appendChild(node);
  });
}

function renderHourly(hourly, timezone) {
  hourlyList.replaceChildren();

  getHourlySlice(hourly).forEach((entry) => {
    const node = hourlyTemplate.content.firstElementChild.cloneNode(true);
    const hourlyMeta = getWeatherMeta(entry.weatherCode);
    node.querySelector('.hourly-time').textContent = formatTime(entry.time, timezone);
    node.querySelector('.hourly-icon').textContent = hourlyMeta.icon;
    node.querySelector('.hourly-temp').textContent = formatTemperature(entry.temperature);
    node.querySelector('.hourly-rain').textContent = `${Math.round(entry.precipitationProbability)}% rain`;
    hourlyList.appendChild(node);
  });
}

function renderWeather(city, data) {
  const current = data.current;
  const daily = data.daily;
  const meta = getWeatherMeta(current.weather_code);

  lastCity = city;
  lastWeatherPayload = { city, data };

  locationName.textContent = `${city.name}, ${city.country}`;
  locationMeta.textContent = `${city.admin1 ?? 'Region unavailable'} • ${city.timezone}`;
  weatherSummary.textContent = meta.label;
  weatherIcon.textContent = meta.icon;
  currentTemp.textContent = Math.round(convertTemperature(current.temperature_2m));
  feelsLike.textContent = Math.round(convertTemperature(current.apparent_temperature));
  temperatureUnit.textContent = getDisplayUnit();
  feelsLikeUnit.textContent = getDisplayUnit();
  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  precipitation.textContent = `${current.precipitation.toFixed(1)} mm`;
  localTime.textContent = formatTime(current.time, data.timezone);
  uvIndex.textContent = daily.uv_index_max[0].toFixed(1);
  sunrise.textContent = formatTime(daily.sunrise[0], data.timezone);
  sunset.textContent = formatTime(daily.sunset[0], data.timezone);

  renderForecast(daily, data.timezone);
  renderHourly(data.hourly, data.timezone);

  weatherGrid.classList.remove('hidden');
  setStatus(`Showing weather for ${city.name}, ${city.country}.`, 'success');
}

async function getCoordinates(city) {
  const params = new URLSearchParams({
    name: city,
    count: '5',
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
    hourly: ['temperature_2m', 'weather_code', 'precipitation_probability'].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_probability_max'
    ].join(','),
    timezone: 'auto',
    forecast_days: '5'
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('Unable to retrieve weather data right now.');
  return response.json();
}

async function searchWeather(cityQuery) {
  const normalizedQuery = cityQuery.trim();
  if (!normalizedQuery) return;

  setLoadingState(true);
  setStatus(`Looking up ${normalizedQuery}…`);

  try {
    const city = await getCoordinates(normalizedQuery);
    const forecast = await getForecast(city.latitude, city.longitude);
    renderWeather(city, forecast);
    saveRecentSearch(city.name);
  } catch (error) {
    weatherGrid.classList.add('hidden');
    setStatus(error.message || 'Something went wrong while loading weather data.', 'error');
  } finally {
    setLoadingState(false);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  searchWeather(input.value);
});

document.querySelectorAll('[data-city]').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = button.dataset.city;
    searchWeather(button.dataset.city);
  });
});

unitToggle.addEventListener('click', () => {
  currentUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
  unitToggle.textContent = currentUnit === 'celsius' ? 'Show °F' : 'Show °C';
  unitToggle.setAttribute('aria-pressed', String(currentUnit === 'fahrenheit'));

  if (lastWeatherPayload && lastCity) {
    renderWeather(lastCity, lastWeatherPayload.data);
  }
});

renderRecentSearches();
input.value = DEFAULT_CITY;
searchWeather(DEFAULT_CITY);
