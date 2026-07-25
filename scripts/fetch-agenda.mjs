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
// Ongoing events (markets, exhibitions…) and dated one-offs get their own
// quota so the many weekly markets can't crowd out concerts and fêtes.
const MAX_ONGOING = 30
const MAX_UPCOMING = 30

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
  // Already-running events sorted by end date (ending soonest first),
  // future one-offs chronologically by start date.
  const ongoing = events
    .filter((e) => e.ongoing)
    .sort((a, b) => new Date(a.end || a.date) - new Date(b.end || b.date))
    .slice(0, MAX_ONGOING)
  const upcoming = events
    .filter((e) => !e.ongoing)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, MAX_UPCOMING)
  const payload = {
    updatedAt: now.toISOString(),
    source,
    daysAhead: DAYS_AHEAD,
    events: [...upcoming, ...ongoing],
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.log(
    `Wrote ${payload.events.length} events (${upcoming.length} upcoming, ${ongoing.length} ongoing; ` +
      `within ${MAX_KM} km, next ${DAYS_AHEAD} days) from ${source}.`,
  )
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

// One date value: "2026-06-01" | {"@value":"2026-06-01","@type":"xsd:date"}
function dateVal(x) {
  const v = first(x)
  const raw = v && typeof v === 'object' ? v['@value'] : v
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d) ? null : d
}

function parseDataTourisme(dir) {
  // A "normalized" compacted flux stores related entities (locations, geo,
  // periods…) as separate @graph members and links them via {"@id": "…"}.
  // Index everything by @id so those references can be resolved.
  const all = []
  for (const { obj } of entities(dir)) all.push(obj)
  const byId = new Map()
  for (const o of all) if (typeof o['@id'] === 'string') byId.set(o['@id'], o)
  const deref = (x) => {
    const v = first(x)
    if (v && typeof v === 'object' && typeof v['@id'] === 'string') return byId.get(v['@id']) || v
    return v
  }

  const events = []
  let parsed = 0
  let noTitle = 0
  let noDate = 0
  let noGeo = 0
  let tooFar = 0
  const sampledWhys = new Set()
  const sample = (why, obj) => {
    // One raw entity per failure stage tells us which field names this flux uses.
    if (sampledWhys.size >= 2 || sampledWhys.has(why)) return
    sampledWhys.add(why)
    console.log(`Sample event that failed on "${why}":`)
    console.log(JSON.stringify(obj).slice(0, 2000))
  }

  for (const obj of all) {
    const types = [].concat(obj['@type'] || [])
    const isEvent =
      types.some((t) => /Event|Manifestation|Festival|Concert|Exposition|Rambling/i.test(String(t)))
    if (!isEvent) continue
    parsed++

    const title = label(obj['rdfs:label']) || label(obj.label) || null
    if (!title) {
      noTitle++
      sample('title', obj)
      continue
    }

    // Dates. Two shapes exist: schema:startDate/endDate directly on the
    // event (possibly arrays for multiple occurrences), and/or takesPlace
    // period entities (possibly {"@id"} references).
    const periods = []
    const starts = [].concat(obj['schema:startDate'] || [])
    const ends = [].concat(obj['schema:endDate'] || [])
    starts.forEach((s, i) => periods.push({ s: dateVal(s), e: dateVal(ends[i]) || dateVal(s) }))
    for (const raw of [].concat(obj.takesPlace || obj.takesPlaceAt || [])) {
      const p = deref(raw)
      const s = dateVal(p?.startDate ?? p?.['schema:startDate'])
      periods.push({ s, e: dateVal(p?.endDate ?? p?.['schema:endDate']) || s })
    }
    let start = null
    let end = null
    for (const { s, e } of periods) {
      // keep the first period overlapping [now, until]
      if (s && e >= now && s <= until) {
        start = s
        end = e
        break
      }
    }
    if (!start) {
      noDate++
      sample('date', obj)
      continue
    }

    // Location: isLocatedAt -> schema:geo (both possibly references).
    const loc = deref(obj.isLocatedAt)
    const geo = deref(loc?.['schema:geo'] ?? loc?.geo)
    const lat = num(geo?.['schema:latitude'] ?? geo?.latitude)
    const lon = num(geo?.['schema:longitude'] ?? geo?.longitude)
    const km = lat != null && lon != null ? haversineKm(BASE.lat, BASE.lon, lat, lon) : null
    if (km == null) {
      noGeo++
      sample('geo', obj)
      continue
    }
    if (km > MAX_KM) {
      tooFar++
      continue
    }

    const addr = deref(loc?.['schema:address'] ?? loc?.address)
    const city = label(addr?.['schema:addressLocality'] ?? addr?.addressLocality) || ''
    const postal = label(addr?.['schema:postalCode'] ?? addr?.postalCode) || ''

    const rawUrl = first(obj['schema:url'] || obj.url)
    const url = typeof rawUrl === 'string' ? rawUrl : rawUrl?.['@value']

    // Markets & brocantes without their own website: link the department
    // agenda on vide-greniers.org instead of a generic web search.
    const isMarket =
      types.some((t) => /Market|SaleEvent|BricABrac|FleaMarket/i.test(String(t))) ||
      /march[ée]|market|brocante|vide[- ]?grenier|puces|foire/i.test(title)
    const dept = postal.startsWith('84') ? 'Vaucluse' : 'Drome'
    const fallback = isMarket
      ? `https://vide-greniers.org/evenements/${dept}`
      : `https://www.google.com/search?q=${encodeURIComponent(`${title} ${city}`)}`

    events.push({
      id: String(obj['@id'] || obj['dc:identifier'] || title),
      title,
      city,
      date: start.toISOString(),
      end: end ? end.toISOString() : null,
      ongoing: start < now,
      km,
      url: url || fallback,
    })
  }
  console.log(
    `DataTourisme: scanned ${all.length} entities, ${parsed} events, ${events.length} nearby & upcoming ` +
      `(no title: ${noTitle}, no usable date: ${noDate}, no coordinates: ${noGeo}, further than ${MAX_KM} km: ${tooFar}).`,
  )
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
