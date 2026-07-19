import { CATEGORIES } from '../data/destinations.js'

function driveLabel(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m.toString().padStart(2, '0')}` : `${h}h`
}

export default function DestinationCard({ d }) {
  const cat = CATEGORIES[d.category]
  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=Saint-Jalle,France&destination=${d.lat},${d.lon}&travelmode=driving`
  return (
    <div className="card">
      <div className="top">
        <div>
          <h3>{d.name}</h3>
          <div className="sub">
            {cat.emoji} {cat.label}
          </div>
        </div>
        <span className="badge" style={{ background: cat.color }}>
          {d.tier === 'far' ? 'Big day out' : 'Nearby'}
        </span>
      </div>

      <span className={`drive ${d.tier}`}>🚗 {driveLabel(d.driveMin)} from Saint-Jalle</span>

      <p className="desc">{d.summary}</p>

      <div className="tags">
        {d.highlights.map((h) => (
          <span className="tag" key={h}>
            {h}
          </span>
        ))}
      </div>

      {d.tip && (
        <div className="tip">
          <b>Tip:</b> {d.tip}
        </div>
      )}

      <a className="map-link" href={mapUrl} target="_blank" rel="noreferrer">
        Directions →
      </a>
    </div>
  )
}
