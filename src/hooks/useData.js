import { useEffect, useState } from 'react'

// Loads all content from JSON files under /data at runtime — the app's
// "database". Edit those files (on GitHub or on your server) and the site
// updates without touching any code. BASE_URL keeps this working from a
// subpath (GitHub Pages) as well as from a domain root (on-prem).
const FILES = ['destinations', 'hikes', 'restaurants', 'events']

export function useData() {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      ...FILES.map((name) =>
        fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((r) => {
          if (!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`)
          return r.json()
        }),
      ),
      // The auto-refreshed agenda is optional — its absence must never break the app.
      fetch(`${import.meta.env.BASE_URL}data/agenda.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([destinations, hikes, restaurants, events, agenda]) => {
        if (!cancelled)
          setState({
            loading: false,
            error: null,
            data: { destinations, hikes, restaurants, events, agenda },
          })
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, data: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
