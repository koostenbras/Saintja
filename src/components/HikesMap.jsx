import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BASE } from '../data/base.js'
import { DIFFICULTY } from '../data/hikes.js'

// Interactive overview map of all trailheads (OpenStreetMap tiles).
// Markers are divIcons so no image assets are needed under the bundler.
export default function HikesMap({ hikes }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return
    const map = L.map(boxRef.current, { scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Home base marker — decorative only, so it never blocks trailhead pins
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
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    hikes.forEach((h) => {
      const color = DIFFICULTY[h.difficulty].color
      const marker = L.marker([h.lat, h.lon], {
        icon: L.divIcon({
          className: 'hike-pin-wrap',
          html: `<span class="hike-pin" style="background:${color}">🥾</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      })
      marker.bindPopup(
        `<b>${h.name}</b><br/>` +
          `${h.distanceKm} km · ${h.ascentM} m ↑ · ~${h.timeH} h · ${DIFFICULTY[h.difficulty].label}<br/>` +
          `Trailhead: ${h.trailhead}<br/>` +
          `<a href="https://www.google.com/maps/dir/?api=1&origin=Saint-Jalle,France&destination=${h.lat},${h.lon}&travelmode=driving" target="_blank" rel="noreferrer">Directions</a> · ` +
          `<a href="https://www.geoportail.gouv.fr/carte?c=${h.lon},${h.lat}&z=15" target="_blank" rel="noreferrer">IGN map</a>`,
      )
      layer.addLayer(marker)
    })

    const pts = hikes.map((h) => [h.lat, h.lon])
    pts.push([BASE.lat, BASE.lon])
    map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] })
  }, [hikes])

  return <div className="map-box" ref={boxRef} aria-label="Map of hike trailheads" />
}
