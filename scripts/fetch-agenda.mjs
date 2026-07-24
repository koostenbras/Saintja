// Weekly agenda refresh — writes public/data/agenda.json with upcoming
// events around Saint-Jalle.
//
// Sources, in order of preference:
//   1. DataTourisme (official French tourism open data): the workflow
//      downloads the configured flux (zip of JSON-LD files) into DT_DIR
//      before this script runs. Parsed here.
//   2. OpenAgenda (fallback): documented read API with OPENAGENDA_KEY.
//
// Design rule: this script must NEVER break the site. On any problem it
// logs, leaves the existing agenda.json untouched and exits 0.
import { writeFileSync, existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const OUT = new URL('../public/data/agenda.json', import.meta.url)
const KEY = process.env.OPENAGENDA_KEY
const DT_DIR = process.env.DT_DIR || 'dt-feed'

const BASE = { lat: 44.3839, lon: 5.2386 } // Saint-Jalle
const MAX_KM = 60
const DAYS_AHEAD = 30
const MAX_EVENTS = 30

const now = new Date()
const until = new Date(now.getTime() + DAYS_AHEAD * 24 * 3600 * 1000)

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function finish(events, source) {
  const payload = {
    updatedAt: now.toISOString(),
    source,
    daysAhead: DAYS_AHEAD,
    events: events.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, MAX_EVENTS),
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.log(`Wrote ${payload.events.length} events (within ${MAX_KM} km, next ${DAYS_AHEAD} days) from ${source}.`)
}

// ---------- DataTourisme (JSON-LD flux directory) ----------
// The ontology serialises inconsistently depending on framing, so every
// accessor below is defensive: values may be strings, arrays or objects.
function first(x) {
  return Array.isArray(x) ? x[0] : x
}

function label(x) {
  // rdfs:label variants: "Title" | {"fr":["Title"]} | {"@value":"Title"} | [{...}]
  const v = first(x)
  if (!v) return null
  if (typeof v === 'string') return v
  if (v['@value']) return v['@value']
  if (v.fr) return first(v.fr)
  if (v.en) return first(v.en)
  const vals = Object.values(v)
  return typeof first(vals) === 'string' ? first(vals) : null
}

function num(x) {
  const v = first(x)
  const n = typeof v === 'object' && v !== null ? parseFloat(v['@value']) : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function* jsonFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* jsonFiles(p)
    else if (name.endsWith('.json') && name !== 'index.json' && name !== 'context.json') yield p
  }
}

// A flux is either a zip of one-entity-per-file documents, or a single
// compacted JSON-LD document whose @graph holds every entity. Yield them all.
function* entities(dir) {
  for (const path of jsonFiles(dir)) {
    let doc
    try {
      doc = JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      continue
    }
    const graph = doc?.['@graph']
    const list = Array.isArray(graph) ? graph : graph ? [graph] : Array.isArray(doc) ? doc : [doc]
    for (const obj of list) if (obj && typeof obj === 'object') yield { obj, path }
  }
}

function parseDataTourisme(dir) {
  const events = []
  let files = 0
  let parsed = 0
  for (const { obj, path } of entities(dir)) {
    files++
    const types = [].concat(obj['@type'] || [])
    const isEvent =
      types.some((t) => /Event|Manifestation|Festival|Concert|Exposition|Rambling/i.test(String(t)))
    if (!isEvent) continue
    parsed++

    const title = label(obj['rdfs:label']) || label(obj.label) || null
    if (!title) continue

    // Dates: takesPlace[].startDate / endDate
    const periods = [].concat(obj.takesPlace || obj['takesPlace'] || [])
    let start = null
    let end = null
    for (const p of periods) {
      const s = first(p?.startDate) ? new Date(first(p.startDate)) : null
      const e = first(p?.endDate) ? new Date(first(p.endDate)) : s
      if (!s || isNaN(s)) continue
      // keep the first period overlapping [now, until]
      if (e >= now && s <= until) {
        start = s
        end = e
        break
      }
    }
    if (!start) continue

    // Location: isLocatedAt[].schema:geo + schema:address
    const loc = first(obj.isLocatedAt || obj['isLocatedAt'])
    const geo = loc?.['schema:geo'] || loc?.geo
    const lat = num(geo?.['schema:latitude'] ?? geo?.latitude)
    const lon = num(geo?.['schema:longitude'] ?? geo?.longitude)
    const km = lat != null && lon != null ? haversineKm(BASE.lat, BASE.lon, lat, lon) : null
    if (km == null || km > MAX_KM) continue

    const addr = first(loc?.['schema:address'] || loc?.address)
    const city = label(addr?.['schema:addressLocality'] ?? addr?.addressLocality) || ''

    const displayDate = start >= now ? start : now
    events.push({
      id: String(obj['@id'] || obj['dc:identifier'] || path),
      title,
      city,
      date: displayDate.toISOString(),
      km,
      url:
        first(obj['schema:url'] || obj.url) ||
        `https://www.google.com/search?q=${encodeURIComponent(`${title} ${city}`)}`,
    })
  }
  console.log(`DataTourisme: scanned ${files} entities, ${parsed} events, ${events.length} nearby & upcoming.`)
  return events
}

// ---------- OpenAgenda fallback ----------
const PINNED_UIDS = []
const AGENDA_SEARCHES = ['Baronnies provençales', 'Drôme provençale', 'Buis-les-Baronnies', 'Vaison Ventoux']

async function oa(path, params) {
  const qs = new URLSearchParams({ key: KEY, ...params })
  const res = await fetch(`https://api.openagenda.com/v2/${path}?${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} on /v2/${path}`)
  return res.json()
}

async function fetchOpenAgenda() {
  await oa('agendas', { size: '1' }) // key check
  const uids = new Map()
  for (const uid of PINNED_UIDS) uids.set(uid, `pinned:${uid}`)
  for (const search of AGENDA_SEARCHES) {
    try {
      const json = await oa('agendas', { search, size: '5' })
      for (const a of json.agendas || []) if (a.uid) uids.set(a.uid, a.title || String(a.uid))
    } catch {}
  }
  const seen = new Map()
  for (const [uid] of uids) {
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
        const firstDate = e.nextTiming?.begin || e.timings?.[0]?.begin
        if (!firstDate) continue
        seen.set(e.uid, {
          id: String(e.uid),
          title: e.title?.fr || Object.values(e.title || {})[0] || 'Untitled',
          city: e.location?.city || '',
          date: firstDate,
          km,
          url: `https://openagenda.com/agendas/${uid}/events/${e.slug || e.uid}`,
        })
      }
    } catch {}
  }
  return [...seen.values()]
}

// ---------- main ----------
try {
  if (existsSync(DT_DIR)) {
    finish(parseDataTourisme(DT_DIR), 'DataTourisme')
  } else if (KEY) {
    console.log('No DataTourisme feed directory — falling back to OpenAgenda.')
    finish(await fetchOpenAgenda(), 'OpenAgenda')
  } else {
    console.log('Neither DataTourisme feed nor OPENAGENDA_KEY available — keeping existing agenda.json.')
    console.log('Configure the DATATOURISME_WEBSERVICE_URL secret (see README) to activate the feed.')
  }
} catch (err) {
  console.log(`Agenda refresh failed (${err.message}) — keeping existing agenda.json.`)
  process.exit(0)
}
