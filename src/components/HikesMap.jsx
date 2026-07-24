import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BASE } from '../data/base.js'
import { DIFFICULTY } from '../data/hikes.js'

// Overview map of all trailheads, with two ways to see real routes:
// 1. The "Marked hiking trails" overlay (Waymarked Trails / OpenStreetMap)
//    shows the actual GR/PR trail network — real geometry, always on.
// 2. Hikes with a `gpx` field draw their exact track as a coloured line,
//    loaded from public/data/gpx/<file>. Clicking that hike's pin zooms
//    to the full route.
function parseGpx(text) {
  const pts = []
  for (const m of text.matchAll(/<trkpt\b[^>]*>/g)) {
    const lat = m[0].match(/lat="(-?[\d.]+)"/)
    const lon = m[0].match(/lon="(-?[\d.]+)"/)
    if (lat && lon) pts.push([parseFloat(lat[1]), parseFloat(lon[1])])
  }
  return pts
}

export default function HikesMap({ hikes }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const trackCache = useRef(new Map()) // hike id -> L.polyline | 'missing'

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return
    const map = L.map(boxRef.current, { scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Real marked-trail network (GR/PR) as an overlay, on by default.
    const trails = L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
      maxZoom: 17,
      opacity: 0.85,
      attribution: 'Trails &copy; <a href="https://hiking.waymarkedtrails.org">Waymarked Trails</a> (CC-BY-SA)',
    }).addTo(map)
    L.control
      .layers(null, { 'Marked hiking trails (GR/PR)': trails }, { collapsed: false, position: 'topright' })
      .addTo(map)

    L.marker([BASE.lat, BASE.lon], {
      icon: L.divIcon({ className: 'home-pin', html: '🏡', iconSize: [30, 30], iconAnchor: [15, 15] }),
      interactive: false,
      zIndexOffset: -100,
    }).addTo(map)

    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
      trackCache.current = new Map()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    let disposed = false

    hikes.forEach((h) => {
      const color = DIFFICULTY[h.difficulty].color

      // Draw the exact GPX track when the hike has one.
      if (h.gpx) {
        const cached = trackCache.current.get(h.id)
        if (cached && cached !== 'missing') {
          layer.addLayer(cached)
        } else if (!cached) {
          fetch(`${import.meta.env.BASE_URL}data/gpx/${h.gpx}`)
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
            .then((text) => {
              const pts = parseGpx(text)
              if (!pts.length) throw new Error('no trackpoints')
              const line = L.polyline(pts, { color, weight: 4, opacity: 0.9 }).bindPopup(
                `<b>${h.name}</b><br/>Exact route (GPX)`,
              )
              trackCache.current.set(h.id, line)
              if (!disposed && mapRef.current) layer.addLayer(line)
            })
            .catch(() => trackCache.current.set(h.id, 'missing'))
        }
      }

      const marker = L.marker([h.lat, h.lon], {
        icon: L.divIcon({
          className: 'hike-pin-wrap',
          html: `<span class="hike-pin" style="background:${color}">🥾</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      })
      const track = trackCache.current.get(h.id)
      const hasTrack = h.gpx && track && track !== 'missing'
      marker.bindPopup(
        `<b>${h.name}</b><br/>` +
          `${h.distanceKm} km · ${h.ascentM} m ↑ · ~${h.timeH} h · ${DIFFICULTY[h.difficulty].label}<br/>` +
          `Trailhead: ${h.trailhead}<br/>` +
          (hasTrack
            ? `<i>Exact route shown on the map.</i><br/>`
            : `<i>Zoom in — the coloured trail network is real (GR/PR).</i><br/>`) +
          `<a href="https://www.google.com/maps/dir/?api=1&origin=Saint-Jalle,France&destination=${h.lat},${h.lon}&travelmode=driving" target="_blank" rel="noreferrer">Directions</a> · ` +
          `<a href="https://hiking.waymarkedtrails.org/#?map=15!${h.lat}!${h.lon}" target="_blank" rel="noreferrer">Trail routes map</a>`,
      )
      // Clicking a pin zooms to its route (GPX bounds) or close to the trailhead
      marker.on('click', () => {
        const t = trackCache.current.get(h.id)
        if (t && t !== 'missing') map.fitBounds(t.getBounds(), { padding: [40, 40] })
        else map.setView([h.lat, h.lon], Math.max(map.getZoom(), 14))
      })
      layer.addLayer(marker)
    })

    const pts = hikes.map((h) => [h.lat, h.lon])
    pts.push([BASE.lat, BASE.lon])
    map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] })
    return () => {
      disposed = true
    }
  }, [hikes])

  return (
    <div>
      <div className="map-box" ref={boxRef} aria-label="Map of hike trailheads and routes" />
      <p className="map-note">
        The coloured lines on the map are the <b>real marked trail network</b> (GR/PR, from
        OpenStreetMap). Click a 🥾 pin to zoom in on its area — or to its exact track when a GPX
        file has been added for that hike.
      </p>
    </div>
  )
}
