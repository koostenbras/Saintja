# Saintja 🌻

A personal **what-to-do app** for the area around **Saint-Jalle** in the Drôme Provençale (Baronnies Provençales, France).

It answers a simple question — *"what should we do today?"* — with:

- 🧭 **Things to do** — curated day trips (villages & culture, food & wine, nature outings), each sorted by drive time from Saint-Jalle. Everything within ~90 minutes is flagged *Nearby*; longer trips are marked *Big day out* and are chosen to be worth the extra drive (Avignon, Pont du Gard, Gorges de l'Ardèche, the Verdon, lavender at Valensole…).
- 🥾 **Hiking routes** — trails with distance, ascent, time, difficulty and the best season, from the ridge behind Saint-Jalle to Mont Ventoux.
- 🌤️ **Live weather** — current conditions and a 7-day forecast for Saint-Jalle, with the best days for being outside flagged automatically. Data comes from [Open-Meteo](https://open-meteo.com) (no API key needed).

Filter by category/difficulty and slide the **max drive time** to match your day. Every card links straight to Google Maps driving directions from Saint-Jalle.

## Tech

- [React 18](https://react.dev) + [Vite](https://vitejs.dev), plus [Leaflet](https://leafletjs.com) for the trailhead map.
- No backend and no API keys — weather is fetched client-side from Open-Meteo's free forecast API.
- **All content lives in JSON files under `public/data/`** — the app's "database". The app loads them at runtime, so updating content never requires touching code.

## What updates automatically vs. by hand

| Content | How it updates |
|---|---|
| 🌤️ Weather | **Live** — fetched from Open-Meteo on every page visit |
| 📡 Local agenda (Events tab) | **Automatic, weekly** — a scheduled script pulls upcoming events near Saint-Jalle from OpenAgenda every Sunday night |
| 🧭 Day trips · 🥾 Hikes · 🍽️ Restaurants · ✍️ Seasonal highlights | **Curated by hand** — edit the JSON files below |
| 🚀 Publishing | **Automatic** — every change to `main` deploys in ~1 minute |

### Activating the automatic agenda

The weekly script (`scripts/fetch-agenda.mjs`, run by `.github/workflows/refresh-agenda.yml`) needs a free OpenAgenda API key:

1. Register at [openagenda.com](https://openagenda.com) and copy your API key.
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**, name `OPENAGENDA_KEY`.
3. Trigger the first run manually: **Actions → Refresh local agenda → Run workflow** (afterwards it runs every Sunday night).

Without the key the workflow simply skips — the site keeps working and shows how to activate the feed. The script is fail-safe: any API problem leaves the previous agenda in place.

## The live database (`public/data/*.json`)

| File | Contents | Updated by |
|---|---|---|
| `destinations.json` | Day trips (culture / food / nature) | hand |
| `hikes.json` | Hiking routes with stats & GPS links | hand |
| `restaurants.json` | Restaurants & terraces | hand |
| `events.json` | Seasonal events, markets & brocantes | hand |
| `agenda.json` | Upcoming local events (next 30 days) | **script, weekly** |

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
