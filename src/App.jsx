import { useMemo, useState } from 'react'
import { BASE } from './data/base.js'
import { DESTINATIONS, CATEGORIES } from './data/destinations.js'
import { HIKES, DIFFICULTY } from './data/hikes.js'
import WeatherPanel from './components/WeatherPanel.jsx'
import DestinationCard from './components/DestinationCard.jsx'
import HikeCard from './components/HikeCard.jsx'

const MAX_MIN = 180

function driveLabel(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

export default function App() {
  const [tab, setTab] = useState('explore')
  const [cats, setCats] = useState(new Set(Object.keys(CATEGORIES)))
  const [diffs, setDiffs] = useState(new Set(Object.keys(DIFFICULTY)))
  const [maxDrive, setMaxDrive] = useState(MAX_MIN)

  function toggle(set, updater, key) {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    if (next.size === 0) return // never let it go empty
    updater(next)
  }

  const destinations = useMemo(
    () =>
      DESTINATIONS.filter((d) => cats.has(d.category) && d.driveMin <= maxDrive).sort(
        (a, b) => a.driveMin - b.driveMin,
      ),
    [cats, maxDrive],
  )

  const hikes = useMemo(
    () =>
      HIKES.filter((h) => diffs.has(h.difficulty) && h.driveMin <= maxDrive).sort(
        (a, b) => a.driveMin - b.driveMin,
      ),
    [diffs, maxDrive],
  )

  return (
    <div className="app">
      <header className="hero">
        <div className="eyebrow">Drôme Provençale · Baronnies</div>
        <h1>
          What to do around <span className="sun">Saint-Jalle</span> 🌻
        </h1>
        <p className="lede">
          Day trips, hikes and live weather — from village markets and Côtes du Rhône cellars to vulture
          cliffs and Mont Ventoux. Everything sorted by how far you’ll drive.
        </p>
        <div className="base-chip">🏡 Home base: {BASE.name} · {BASE.region}</div>
      </header>

      <WeatherPanel base={BASE} />

      <nav className="tabs">
        <button className={`tab ${tab === 'explore' ? 'active' : ''}`} onClick={() => setTab('explore')}>
          🧭 Things to do
        </button>
        <button className={`tab ${tab === 'hikes' ? 'active' : ''}`} onClick={() => setTab('hikes')}>
          🥾 Hiking routes
        </button>
      </nav>

      {tab === 'explore' && (
        <>
          <div className="filters">
            {Object.entries(CATEGORIES).map(([key, c]) => {
              const active = cats.has(key)
              return (
                <button
                  key={key}
                  className={`chip ${active ? 'active' : ''}`}
                  style={active ? { background: c.color } : undefined}
                  onClick={() => toggle(cats, setCats, key)}
                >
                  {c.emoji} {c.label}
                </button>
              )
            })}
            <span className="spacer" />
            <label className="range">
              Max drive: <b>{driveLabel(maxDrive)}</b>
              <input
                type="range"
                min="20"
                max={MAX_MIN}
                step="5"
                value={maxDrive}
                onChange={(e) => setMaxDrive(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="count">
            {destinations.length} place{destinations.length === 1 ? '' : 's'} within {driveLabel(maxDrive)}
          </div>
          {destinations.length ? (
            <div className="grid">
              {destinations.map((d) => (
                <DestinationCard key={d.id} d={d} />
              ))}
            </div>
          ) : (
            <p className="empty">No spots match these filters — widen the drive time or add a category.</p>
          )}
        </>
      )}

      {tab === 'hikes' && (
        <>
          <div className="filters">
            {Object.entries(DIFFICULTY).map(([key, d]) => {
              const active = diffs.has(key)
              return (
                <button
                  key={key}
                  className={`chip ${active ? 'active' : ''}`}
                  style={active ? { background: d.color } : undefined}
                  onClick={() => toggle(diffs, setDiffs, key)}
                >
                  {d.label}
                </button>
              )
            })}
            <span className="spacer" />
            <label className="range">
              Max drive: <b>{driveLabel(maxDrive)}</b>
              <input
                type="range"
                min="5"
                max={MAX_MIN}
                step="5"
                value={maxDrive}
                onChange={(e) => setMaxDrive(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="count">
            {hikes.length} route{hikes.length === 1 ? '' : 's'} within {driveLabel(maxDrive)} · check the
            weather panel for the best days
          </div>
          {hikes.length ? (
            <div className="grid">
              {hikes.map((h) => (
                <HikeCard key={h.id} h={h} />
              ))}
            </div>
          ) : (
            <p className="empty">No hikes match — widen the drive time or add a difficulty.</p>
          )}
        </>
      )}

      <footer>
        <p>
          <b>Saintja</b> — a personal what-to-do guide for the Baronnies Provençales around Saint-Jalle.
          Drive times are rough estimates on winding local roads. Weather is live from{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
          . Always check trail conditions, opening hours and seasons before you go.
        </p>
      </footer>
    </div>
  )
}
