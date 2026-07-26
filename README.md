# Saintja 🌻

A personal **what-to-do app** for the area around **Saint-Jalle** in the Drôme Provençale (Baronnies Provençales, France).

It answers a simple question — *"what should we do today?"* — with four tabs:

- 🧭 **Things to do** — curated day trips (villages & culture, food & wine, nature outings), each sorted by drive time from Saint-Jalle. Everything within ~90 minutes is flagged *Nearby*; longer trips are marked *Big day out* and are chosen to be worth the extra drive (Avignon, Pont du Gard, Gorges de l'Ardèche, the Verdon, lavender at Valensole, the antiques capital L'Isle-sur-la-Sorgue…).
- 🥾 **Hiking routes** — every hike is backed by a **[Visorando](https://www.visorando.com) route (English pages)** as the primary "Route & GPX" link, with **[RandoGPS](https://www.randogps.net)** (free French GPX library, no account) as the second source. An **interactive map** shows all trailheads as difficulty-coloured pins over the real marked GR/PR trail network; drop a real GPX file in `public/data/gpx/` and the exact track is drawn on the map (click the pin to zoom to the full route).
- 🍽️ **Restaurants** — gastronomic tables, bistros/auberges and café terraces, from La Charrette Bleue (15 min) to the Crillon le Brave terraces, each with a Google Maps lookup so opening hours stay current.
- 🎪 **Events & seasons** — a 📡 **auto-refreshed local agenda** (nightly script, DataTourisme/OpenAgenda) on top, followed by hand-curated seasonal highlights: lavender season, the winter truffle market of Richerenches, brocantes & vide-greniers, the Avignon/Orange/Vaison summer festivals… Events happening this month float to the top with a "Now!" badge.
- 🌤️ **Live weather** — current conditions and a 7-day forecast for Saint-Jalle; the best outdoor days get a 🥾 flag, and **clicking any day opens its hour-by-hour forecast** (temperature, rain chance, wind). Data from [Open-Meteo](https://open-meteo.com), no API key.

Filter by category/difficulty/season and slide the **max drive time** (defaults to a 1-hour day-trip range, up to 3 h). Every card links straight to Google Maps driving directions from Saint-Jalle. Owners curate everything from the built-in **`/#admin`** page.

## Tech

- [React 18](https://react.dev) + [Vite](https://vitejs.dev), plus [Leaflet](https://leafletjs.com) for the trailhead map.
- No backend and no API keys — weather is fetched client-side from Open-Meteo's free forecast API.
- **All content lives in JSON files under `public/data/`** — the app's "database". The app loads them at runtime, so updating content never requires touching code.

## What updates automatically vs. by hand

| Content | How it updates |
|---|---|
| 🌤️ Weather (incl. hourly detail) | **Live** — fetched from Open-Meteo on every page visit |
| 📡 Local agenda (Events tab) | **Automatic, nightly** — a scheduled script pulls upcoming events within ~60 km from DataTourisme (or OpenAgenda as fallback) every night |
| 🧭 Day trips · 🥾 Hikes · 🍽️ Restaurants · ✍️ Seasonal highlights | **Curated by hand** — via `/#admin` or the JSON files below |
| 🚀 Publishing | **Automatic** — every change to `main` deploys in ~1 minute |

### Activating the automatic agenda

The nightly workflow (`.github/workflows/refresh-agenda.yml` + `scripts/fetch-agenda.mjs`) supports two sources, tried in this order:

**1. DataTourisme (preferred — official French tourism open data):**

1. Create a free account on [diffuseur.datatourisme.fr](https://diffuseur.datatourisme.fr).
2. Create an **Application** (this gives you an API key).
3. Create a **Flux**: filter on event types (*Fêtes et manifestations*), zone **Drôme (26) + Vaucluse (84)**, format JSON-LD (compacted is fine). Note: each flux is (re)generated once a day at its own fixed slot (shown on the flux page, e.g. 22:00) — the first download only works after that first generation.
4. Copy the flux's **webservice URL** and replace `{app_key}` with your application's API key: `https://diffuseur.datatourisme.fr/webservice/<fluxId>/<appKey>`.
5. Repo → **Settings → Secrets and variables → Actions → New repository secret**: name `DATATOURISME_WEBSERVICE_URL`, value = that URL.
6. First fill: **Actions → Refresh local agenda → Run workflow**. Afterwards it runs every night (03:00 UTC).

**2. OpenAgenda (fallback):** set the `OPENAGENDA_KEY` secret (free key at openagenda.com → Settings → API keys). Used only when no DataTourisme feed is configured. Coverage for the rural Baronnies proved thin.

Without any secret the workflow simply skips — the site keeps working and shows how to activate the feed. The script is fail-safe: any download or API problem leaves the previous agenda in place.

## The live database (`public/data/*.json`)

| File | Contents | Updated by |
|---|---|---|
| `destinations.json` | Day trips (culture / food / nature) | hand |
| `hikes.json` | Hiking routes with stats, Visorando route link (`visorando` field) and optional GPX (`gpx` field) | hand |
| `gpx/*.gpx` | Exact route tracks drawn on the map (see `public/data/gpx/README.md`) | hand |
| `restaurants.json` | Restaurants & terraces | hand |
| `events.json` | Seasonal events, markets & brocantes | hand |
| `agenda.json` | Upcoming local events (next 30 days, ≤ 60 km) | **script, nightly** |

### Updating content via the built-in admin (easiest)

Open **`/#admin`** on the site (link in the footer). There you can browse all four lists and **add, edit or delete entries with forms** — no JSON editing needed. Each save is a Git commit, so everything is versioned and revertible; the live site updates ~1 minute later.

One-time setup: create a **fine-grained Personal Access Token** on GitHub (Settings → Developer settings → Fine-grained tokens) scoped to *only this repository* with *Contents: Read and write*, and paste it into the admin page. The token is stored only in your own browser (localStorage) — the page is useless to anyone without a token.

### Updating content on GitHub (hosted on GitHub Pages)

1. Open the file on GitHub, e.g. `public/data/restaurants.json`.
2. Click the **pencil icon** (Edit this file).
3. Add or change an entry — copy an existing block `{ … }` as a template and mind the commas.
4. Click **Commit changes**.

That's it: the deploy workflow rebuilds automatically and the live site shows your change **about a minute later**. No code, no local tools needed — it works from your phone, too.

### Updating content on-prem

The compose file mounts `./public/data` into the container, so just edit the JSON files on the server and refresh the browser — **no rebuild, no restart**.

## Run it locally

```bash
npm install
npm run dev      # local dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Hosting

**GitHub Pages (current setup):** every push to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to <https://koostenbras.github.io/Saintja/>.

**On-prem / self-hosted (Docker):**

```bash
docker compose up -d --build
# → http://localhost:8080
```

Or without compose: `docker build -t saintja . && docker run -p 8080:80 saintja`. The image is a plain nginx serving static files, so it also runs on any NAS, Raspberry Pi or VM that has Docker. Without Docker, `npm run build` and point any web server (nginx, Apache, Caddy) at `dist/`.

> Drive times are rough estimates on winding local roads. Always check trail conditions, opening hours and seasons before you set off.
