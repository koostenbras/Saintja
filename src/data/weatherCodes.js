// WMO weather interpretation codes used by Open-Meteo → label + emoji.
export function describeWeather(code) {
  const map = {
    0: ['Clear sky', '☀️'],
    1: ['Mainly clear', '🌤️'],
    2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'],
    45: ['Fog', '🌫️'],
    48: ['Rime fog', '🌫️'],
    51: ['Light drizzle', '🌦️'],
    53: ['Drizzle', '🌦️'],
    55: ['Dense drizzle', '🌧️'],
    56: ['Freezing drizzle', '🌧️'],
    57: ['Freezing drizzle', '🌧️'],
    61: ['Light rain', '🌦️'],
    63: ['Rain', '🌧️'],
    65: ['Heavy rain', '🌧️'],
    66: ['Freezing rain', '🌧️'],
    67: ['Freezing rain', '🌧️'],
    71: ['Light snow', '🌨️'],
    73: ['Snow', '🌨️'],
    75: ['Heavy snow', '❄️'],
    77: ['Snow grains', '🌨️'],
    80: ['Rain showers', '🌦️'],
    81: ['Rain showers', '🌧️'],
    82: ['Violent showers', '⛈️'],
    85: ['Snow showers', '🌨️'],
    86: ['Snow showers', '❄️'],
    95: ['Thunderstorm', '⛈️'],
    96: ['Thunderstorm + hail', '⛈️'],
    99: ['Thunderstorm + hail', '⛈️'],
  }
  return map[code] || ['—', '❓']
}

// A simple "good to be outside" score used to flag nice hiking days.
export function outdoorRating(code, tMax, wind) {
  if ([95, 96, 99, 82, 65, 75, 86].includes(code)) return 'poor'
  if ([45, 48, 51, 53, 55, 61, 63, 80, 81, 71, 73, 85].includes(code)) return 'fair'
  if (tMax != null && (tMax >= 35 || tMax <= 2)) return 'fair'
  if (wind != null && wind >= 45) return 'fair' // strong Mistral
  return 'good'
}
