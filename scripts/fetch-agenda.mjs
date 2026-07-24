// Weekly agenda refresh — fetches upcoming public events around Saint-Jalle
// from the OpenAgenda open-data API and writes public/data/agenda.json.
//
// Run by .github/workflows/refresh-agenda.yml (Sunday nights) and manually:
//   OPENAGENDA_KEY=xxx node scripts/fetch-agenda.mjs
//
// Design rule: this script must NEVER break the site. On any problem it
// logs, leaves the existing agenda.json untouched and exits 0.
import { writeFileSync } from 'fs'

const OUT = new URL('../public/data/agenda.json', import.meta.url)
const KEY = process.env.OPENAGENDA_KEY

const BASE = { lat: 44.3839, lon: 5.2386 } // Saint-Jalle
const RADIUS_DEG = 0.45 // ~50 km bounding box
const DAYS_AHEAD = 30
const MAX_EVENTS = 30

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

if (!KEY) {
  console.log('OPENAGENDA_KEY is not set — skipping refresh, keeping existing agenda.json.')
  console.log('Get a free key at https://openagenda.com and add it as a GitHub Actions secret.')
  process.exit(0)
}

try {
  const now = new Date()
  const until = new Date(now.getTime() + DAYS_AHEAD * 24 * 3600 * 1000)
  const params = new URLSearchParams({
    key: KEY,
    size: '100',
    'timings[gte]': now.toISOString(),
    'timings[lte]': until.toISOString(),
    'geo[northEast][lat]': String(BASE.lat + RADIUS_DEG),
    'geo[northEast][lng]': String(BASE.lon + RADIUS_DEG),
    'geo[southWest][lat]': String(BASE.lat - RADIUS_DEG),
    'geo[southWest][lng]': String(BASE.lon - RADIUS_DEG),
  })
  const res = await fetch(`https://api.openagenda.com/v2/events?${params}`)
  if (!res.ok) throw new Error(`OpenAgenda returned HTTP ${res.status}`)
  const json = await res.json()
  const raw = json.events || []

  const events = raw
    .map((e) => {
      const title = e.title?.fr || e.title?.en || Object.values(e.title || {})[0] || 'Untitled'
      const city = e.location?.city || ''
      const lat = e.location?.latitude
      const lon = e.location?.longitude
      const first = e.nextTiming?.begin || e.timings?.[0]?.begin || null
      return {
        id: String(e.uid),
        title,
        city,
        date: first,
        km: lat && lon ? haversineKm(BASE.lat, BASE.lon, lat, lon) : null,
        url: `https://openagenda.com/events/${e.slug || e.uid}`,
      }
    })
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, MAX_EVENTS)

  const payload = {
    updatedAt: now.toISOString(),
    source: 'OpenAgenda',
    daysAhead: DAYS_AHEAD,
    events,
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.log(`Wrote ${events.length} events to agenda.json (of ${raw.length} fetched).`)
} catch (err) {
  console.log(`Agenda refresh failed (${err.message}) — keeping existing agenda.json.`)
  process.exit(0)
}
