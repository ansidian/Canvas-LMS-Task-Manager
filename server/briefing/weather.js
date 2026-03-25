// WMO weather code → icon mapping
const WMO_ICONS = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  56: "🌧️",
  57: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  66: "🌧️",
  67: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "🌨️",
  77: "🌨️",
  80: "🌦️",
  81: "🌧️",
  82: "🌧️",
  85: "🌨️",
  86: "🌨️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

const WMO_DESCRIPTIONS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function formatHour(isoString) {
  const h = new Date(isoString).getHours();
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

export async function fetchWeather(lat, lng) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lng);
  url.searchParams.set(
    "hourly",
    "temperature_2m,weathercode,relativehumidity_2m,windspeed_10m",
  );
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("timezone", "America/Los_Angeles");
  url.searchParams.set("forecast_days", "1");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const now = new Date();
  const currentHourIndex = now.getHours();

  // Build hourly array — every 2 hours from current hour through end of day
  const hourly = [];
  for (let i = currentHourIndex; i < 24 && hourly.length < 8; i += 2) {
    const code = data.hourly.weathercode[i];
    hourly.push({
      time: formatHour(data.hourly.time[i]),
      temp: Math.round(data.hourly.temperature_2m[i]),
      icon: WMO_ICONS[code] || "☀️",
    });
  }

  // Current conditions from closest hour
  const currentCode = data.hourly.weathercode[currentHourIndex];
  const description = WMO_DESCRIPTIONS[currentCode] || "Clear";

  return {
    temp: Math.round(data.hourly.temperature_2m[currentHourIndex]),
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
    summary: `${description}. High of ${Math.round(data.daily.temperature_2m_max[0])}°F, low of ${Math.round(data.daily.temperature_2m_min[0])}°F.`,
    hourly,
  };
}
