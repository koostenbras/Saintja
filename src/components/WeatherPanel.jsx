import { useState } from 'react'
import { useWeather } from '../hooks/useWeather.js'
import { describeWeather, outdoorRating } from '../data/weatherCodes.js'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dayLabel(iso, i) {
  if (i === 0) return 'Today'
  // iso like 2026-07-19 — parse as local date without timezone surprises
  const [y, m, d] = iso.split('-').map(Number)
  return DOW[new Date(y, m - 1, d).getDay()]
}

function HourlyStrip({ hourly, day }) {
  const idx = hourly.time
    .map((t, i) => (t.startsWith(day) ? i : -1))
    .filter((i) => i !== -1)
  if (!idx.length) return null
  return (
    <div className="hours-wrap">
      <div className="hours-strip">
        {idx.map((i) => {
          const [label, emoji] = describeWeather(hourly.weather_code[i])
          const hh = hourly.time[i].slice(11, 16)
          return (
            <div key={hourly.time[i]} className="hour" title={label}>
              <div className="h-time">{hh}</div>
              <div className="h-em">{emoji}</div>
              <div className="h-temp">{Math.round(hourly.temperature_2m[i])}°</div>
              <div className="h-rain">
                ☔ {hourly.precipitation_probability?.[i] ?? 0}%
              </div>
              <div className="h-wind">💨 {Math.round(hourly.wind_speed_10m[i])}</div>
            </div>
          )
        })}
      </div>
      <p className="hours-legend">Per hour: temperature · rain chance · wind (km/h)</p>
    </div>
  )
}

export default function WeatherPanel({ base }) {
  const { loading, error, data } = useWeather(base.lat, base.lon, 7)
  const [selected, setSelected] = useState(null)

  if (loading) return <div className="weather-panel loading">Loading live weather for {base.name}…</div>
  if (error)
    return (
      <div className="weather-panel error">
        Couldn’t load weather ({error}). Check your connection and refresh.
      </div>
    )
  if (!data) return null

  const c = data.current
  const [curLabel, curEmoji] = describeWeather(c.weather_code)
  const daily = data.daily

  return (
    <div className="weather-panel">
      <div className="weather-head">
        <div className="weather-now">
          <div className="big-emoji">{curEmoji}</div>
          <div>
            <div className="temp">{Math.round(c.temperature_2m)}°C</div>
            <div className="desc">
              {curLabel} · feels {Math.round(c.apparent_temperature)}°
            </div>
          </div>
        </div>
        <div className="weather-meta">
          <span>
            💨 Wind <b>{Math.round(c.wind_speed_10m)} km/h</b>
          </span>
          <span>
            💧 Humidity <b>{c.relative_humidity_2m}%</b>
          </span>
          <span>
            📍 <b>{base.name}</b>
          </span>
        </div>
      </div>

      <div className="forecast">
        {daily.time.map((iso, i) => {
          const [label, emoji] = describeWeather(daily.weather_code[i])
          const rating = outdoorRating(
            daily.weather_code[i],
            daily.temperature_2m_max[i],
            daily.wind_speed_10m_max[i],
          )
          const sel = selected === iso
          return (
            <button
              key={iso}
              className={`day ${rating} ${sel ? 'sel' : ''}`}
              title={`${label} — click for hourly details`}
              onClick={() => setSelected(sel ? null : iso)}
            >
              {rating === 'good' && <span className="flag">🥾</span>}
              <div className="dow">{dayLabel(iso, i)}</div>
              <div className="em">{emoji}</div>
              <div className="hi">{Math.round(daily.temperature_2m_max[i])}°</div>
              <div className="lo">{Math.round(daily.temperature_2m_min[i])}°</div>
              {daily.precipitation_probability_max[i] != null && (
                <div className="rain">☔ {daily.precipitation_probability_max[i]}%</div>
              )}
            </button>
          )
        })}
      </div>

      {selected && data.hourly && <HourlyStrip hourly={data.hourly} day={selected} />}

      <p className="weather-note">
        🥾 marks the best days to be outside. <b>Click a day for its hour-by-hour forecast.</b> Live
        data from Open-Meteo.
      </p>
    </div>
  )
}
