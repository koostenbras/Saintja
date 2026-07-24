// Weekly agenda refresh — fetches upcoming public events around Saint-Jalle
// from the OpenAgenda API and writes public/data/agenda.json.
//
// Uses only the documented read API (developers.openagenda.com):
//   1. GET /v2/agendas?search=...   -> find local public agendas
//   2. GET /v2/agendas/{uid}/events -> upcoming events per agenda
// Events are then filtered by distance from Saint-Jalle client-side.
//
// Design rule: this script must NEVER break the site. On any problem it
// logs, leaves the existing agenda.json untouched and exits 0.
import { writeFileSync } from 'fs'

const OUT = new URL('../public/data/agenda.json', import.meta.url)
const KEY = process.env.OPENAGENDA_KEY

const BASE = { lat: 44.3839, lon: 5.2386 } // Saint-Jalle
const MAX_KM = 60
const DAYS_AHEAD = 30
const MAX_EVENTS = 30
// Pin specific agendas here (guaranteed pickup). Find one on openagenda.com:
// the UID is the number in the agenda's URL or settings page.
const PINNED_UIDS = []
const AGENDA_SEARCHES = [
  'Baronnies provençales',
  'Drôme provençale',
  'Nyons Baronnies',
  'Buis-les-Baronnies',
  'Vaison Ventoux',
  'Vaison-la-Romaine',
  'Pays de Grignan',
  'Ventoux Provence',
  'Drôme sud',
  'Haut Vaucluse',
  'Rémuzat',
  'Séderon',
  'Montbrun-les-Bains',
  'Valréas Enclave des Papes',
]
const MAX_AGENDAS = 30

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

async function oa(path, params) {
  const qs = new URLSearchParams({ key: KEY, ...params })
  const res = await fetch(`https://api.openagenda.com/v2/${path}?${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} on /v2/${path}`)
  return res.json()
}

if (!KEY) {
  console.log('OPENAGENDA_KEY is not set — skipping refresh, keeping existing agenda.json.')
  console.log('Get a free key at https://openagenda.com and add it as a GitHub Actions secret.')
  process.exit(0)
}

try {
  // 1. Validate the key against the simplest documented endpoint.
  try {
    await oa('agendas', { size: '1' })
  } catch (err) {
    console.log(`OpenAgenda rejected the API key (${err.message}).`)
    console.log('Check the secret: log in on openagenda.com → your name (top right) → Settings → API keys,')
    console.log('copy the PUBLIC key exactly (no spaces) into the OPENAGENDA_KEY repository secret.')
    process.exit(0)
  }

  // 2. Find local agendas.
  const uids = new Map() // uid -> title
  for (const uid of PINNED_UIDS) uids.set(uid, `pinned:${uid}`)
  for (const search of AGENDA_SEARCHES) {
    try {
      const json = await oa('agendas', { search, size: '5' })
      for (const a of json.agendas || []) {
        if (uids.size < MAX_AGENDAS && a.uid) uids.set(a.uid, a.title || String(a.uid))
      }
    } catch (err) {
      console.log(`Agenda search "${search}" failed (${err.message}) — continuing.`)
    }
  }
  console.log(`Searching ${uids.size} local agendas: ${[...uids.values()].join(' | ')}`)

  // 3. Collect upcoming events from each agenda.
  const now = new Date()
  const until = new Date(now.getTime() + DAYS_AHEAD * 24 * 3600 * 1000)
  const seen = new Map() // event uid -> event
  for (const [uid, title] of uids) {
    try {
      const json = await oa(`agendas/${uid}/events`, {
        size: '50',
        'timings[gte]': now.toISOString(),
        'timings[lte]': until.toISOString(),
        detailed: '1',
      })
      for (const e of json.events || []) {
        if (seen.has(e.uid)) continue
        const lat = e.location?.latitude
        const lon = e.location?.longitude
        const km = lat && lon ? haversineKm(BASE.lat, BASE.lon, lat, lon) : null
        if (km !== null && km > MAX_KM) continue
        const first = e.nextTiming?.begin || e.timings?.[0]?.begin || null
        if (!first) continue
        seen.set(e.uid, {
          id: String(e.uid),
          title: e.title?.fr || e.title?.en || Object.values(e.title || {})[0] || 'Untitled',
          city: e.location?.city || '',
          date: first,
          km,
          url: `https://openagenda.com/agendas/${uid}/events/${e.slug || e.uid}`,
        })
      }
    } catch (err) {
      console.log(`Events fetch for agenda "${title}" failed (${err.message}) — continuing.`)
    }
  }

  const events = [...seen.values()]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, MAX_EVENTS)

  const payload = {
    updatedAt: now.toISOString(),
    source: 'OpenAgenda',
    daysAhead: DAYS_AHEAD,
    events,
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.log(`Wrote ${events.length} events (within ${MAX_KM} km, next ${DAYS_AHEAD} days) to agenda.json.`)
} catch (err) {
  console.log(`Agenda refresh failed (${err.message}) — keeping existing agenda.json.`)
  process.exit(0)
}
