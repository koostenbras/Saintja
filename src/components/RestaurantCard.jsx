import { STYLES } from '../data/restaurants.js'

function driveLabel(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m.toString().padStart(2, '0')}` : `${h}h`
}

export default function RestaurantCard({ r }) {
  const style = STYLES[r.style]
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.name} ${r.town} restaurant`,
  )}`
  return (
    <div className="card">
      <div className="top">
        <div>
          <h3>{r.name}</h3>
          <div className="sub">
            {style.emoji} {style.label} · {r.town} · {r.price}
          </div>
        </div>
        <span className="badge" style={{ background: style.color }}>
          {style.label}
        </span>
      </div>

      <span className="drive">🚗 {driveLabel(r.driveMin)} from Saint-Jalle</span>

      <p className="desc">{r.summary}</p>

      <div className="tags">
        {r.highlights.map((h) => (
          <span className="tag" key={h}>
            {h}
          </span>
        ))}
      </div>

      <div className="tip">
        <b>Before you go:</b> country restaurants change hours and close days often — check the map
        listing or call ahead.
      </div>

      <a className="map-link" href={mapUrl} target="_blank" rel="noreferrer">
        Find on Google Maps →
      </a>
    </div>
  )
}
