import { SEASONS } from '../data/events.js'

function driveLabel(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m.toString().padStart(2, '0')}` : `${h}h`
}

function seasonOf(months) {
  // Pick the season containing the event's first month for the badge colour.
  for (const [key, s] of Object.entries(SEASONS)) {
    if (s.months.includes(months[0])) return { key, ...s }
  }
  return { key: 'summer', ...SEASONS.summer }
}

export default function EventCard({ e }) {
  const now = new Date().getMonth() + 1
  const happeningNow = e.months.includes(now)
  const allYear = e.months.length >= 12
  const season = seasonOf(e.months)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.place)}`
  const badge = allYear ? 'All year' : happeningNow ? 'Now!' : season.label
  const badgeColor = allYear ? '#6b5d52' : happeningNow ? '#4f6f52' : season.color
  return (
    <div className="card">
      <div className="top">
        <div>
          <h3>{e.name}</h3>
          <div className="sub">
            {allYear ? '📅' : season.emoji} {e.when} · {e.place}
          </div>
        </div>
        <span className="badge" style={{ background: badgeColor }}>
          {badge}
        </span>
      </div>

      <span className="drive">🚗 {driveLabel(e.driveMin)} from Saint-Jalle</span>

      <p className="desc">{e.summary}</p>

      <div className="tags">
        {e.highlights.map((h) => (
          <span className="tag" key={h}>
            {h}
          </span>
        ))}
      </div>

      <div className="tip">
        <b>Dates shift yearly:</b> check the local tourist office before planning around this one.
      </div>

      <div className="link-row">
        <a className="map-link" href={mapUrl} target="_blank" rel="noreferrer">
          Find on Google Maps →
        </a>
        {e.url && (
          <a className="map-link" href={e.url} target="_blank" rel="noreferrer">
            🗓️ {e.urlLabel || 'Agenda'}
          </a>
        )}
      </div>
    </div>
  )
}
