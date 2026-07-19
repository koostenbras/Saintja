# Saintja 🌻

A personal **what-to-do app** for the area around **Saint-Jalle** in the Drôme Provençale (Baronnies Provençales, France).

It answers a simple question — *"what should we do today?"* — with:

- 🧭 **Things to do** — curated day trips (villages & culture, food & wine, nature outings), each sorted by drive time from Saint-Jalle. Everything within ~90 minutes is flagged *Nearby*; longer trips are marked *Big day out* and are chosen to be worth the extra drive (Avignon, Pont du Gard, Gorges de l'Ardèche, the Verdon, lavender at Valensole…).
- 🥾 **Hiking routes** — trails with distance, ascent, time, difficulty and the best season, from the ridge behind Saint-Jalle to Mont Ventoux.
- 🌤️ **Live weather** — current conditions and a 7-day forecast for Saint-Jalle, with the best days for being outside flagged automatically. Data comes from [Open-Meteo](https://open-meteo.com) (no API key needed).

Filter by category/difficulty and slide the **max drive time** to match your day. Every card links straight to Google Maps driving directions from Saint-Jalle.

## Tech

- [React 18](https://react.dev) + [Vite](https://vitejs.dev)
- No backend and no API keys — weather is fetched client-side from Open-Meteo's free forecast API.
- All content lives in plain data files under `src/data/` so it's easy to add your own spots.

## Run it

```bash
npm install
npm run dev      # local dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the production build
```

The build in `dist/` is a static site — drop it on any static host (Netlify, GitHub Pages, Vercel, an S3 bucket…).

## Add your own places

- **Day trips:** edit `src/data/destinations.js`. Each entry needs a `category` (`culture` / `food` / `nature`), a rough `driveMin` from Saint-Jalle, `lat`/`lon`, a short `summary`, some `highlights` and an optional `tip`. Set `tier` to `near` or `far`.
- **Hikes:** edit `src/data/hikes.js` with distance, ascent, time, `difficulty` and `season`.
- **Move the home base:** change `src/data/base.js` (name + coordinates) and drive times/weather follow automatically.

> Drive times are rough estimates on winding local roads. Always check trail conditions, opening hours and seasons before you set off.
