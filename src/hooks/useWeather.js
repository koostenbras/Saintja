import { useEffect, useState } from 'react'

// Fetches current conditions + a multi-day daily forecast from Open-Meteo.
// No API key required. Runs in the visitor's browser.
export function useWeather(lat, lon, days = 7) {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    if (lat == null || lon == null) return
    let cancelled = false
    setState({ loading: true, error: null, data: null })

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset',
      timezone: 'Europe/Paris',
      forecast_days: String(days),
      wind_speed_unit: 'kmh',
    })
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Weather service returned ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data })
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, data: null })
      })

    return () => {
      cancelled = true
    }
  }, [lat, lon, days])

  return state
}
