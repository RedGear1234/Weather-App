# Weather Now

Weather Now is a polished single-page weather dashboard for searching cities worldwide.

## Features

- current conditions with feels-like temperature and local time
- key metrics including humidity, wind, precipitation, UV index, sunrise, and sunset
- 5-day forecast with rain probability and temperature ranges
- next 8 hours trend cards
- quick city presets and saved recent searches
- Celsius/Fahrenheit toggle

## Run locally

Because the app uses JavaScript modules, serve it with a simple static server:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Data source

This app uses Open-Meteo's geocoding and forecast APIs, so no API key is required.
