import { DIFFICULTY, VISORANDO_COMMUNE, RANDOGPS } from '../data/hikes.js'

function driveLabel(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m.toString().padStart(2, '0')}` : `${h}h`
}

export default function HikeCard({ h }) {
  const diff = DIFFICULTY[h.difficulty]
  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=Saint-Jalle,France&destination=${h.lat},${h.lon}&travelmode=driving`
  return (
    <div className="card">
      <div className="top">
        <div>
          <h3>{h.name}</h3>
          <div className="sub">🥾 Trailhead: {h.trailhead}</div>
        </div>
        <span className="badge" style={{ background: diff.color }}>
          {diff.label}
        </span>
      </div>

      <span className="drive">🚗 {driveLabel(h.driveMin)} to trailhead</span>

      <div className="stats">
        <div className="stat">
          <span className="v">{h.distanceKm} km</span>
          <span className="k">Distance</span>
        </div>
        <div className="stat">
          <span className="v">{h.ascentM} m</span>
          <span className="k">Ascent</span>
        </div>
        <div className="stat">
          <span className="v">~{h.timeH} h</span>
          <span className="k">Time</span>
        </div>
        <div className="stat">
          <span className="v">{h.loop ? 'Loop' : 'There & back'}</span>
          <span className="k">Shape</span>
        </div>
      </div>

      <p className="desc">{h.summary}</p>

      <div className="tags">
        {h.highlights.map((x) => (
          <span className="tag" key={x}>
            {x}
          </span>
        ))}
      </div>

      {h.season && (
        <div className="tip">
          <b>When:</b> {h.season}
        </div>
      )}

      <div className="link-row">
        <a className="map-link" href={mapUrl} target="_blank" rel="noreferrer">
          🚗 Directions
        </a>
        {RANDOGPS[h.id] && (
          <a
            className="map-link"
            href={`https://www.randogps.net/${RANDOGPS[h.id]}`}
            target="_blank"
            rel="noreferrer"
          >
            🇫🇷 Free GPX (RandoGPS)
          </a>
        )}
        {VISORANDO_COMMUNE[h.id] && (
          <a
            className="map-link"
            href={`https://www.visorando.com/randonnee-${VISORANDO_COMMUNE[h.id]}.html`}
            target="_blank"
            rel="noreferrer"
          >
            📥 GPX routes
          </a>
        )}
      </div>
    </div>
  )
}
