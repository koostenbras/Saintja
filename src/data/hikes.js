// Curated hiking routes reachable from Saint-Jalle.
// distanceKm / ascentM are round-trip estimates; times assume a steady pace.
// difficulty: 'easy' | 'moderate' | 'hard'
export const DIFFICULTY = {
  easy: { label: 'Easy', color: '#4f6f52' },
  moderate: { label: 'Moderate', color: '#c07a2b' },
  hard: { label: 'Hard', color: '#8e3b46' },
}

// Free French GPX libraries per hike (randogps.net - no account needed):
// the Baronnies park page for hikes inside the park, department pages elsewhere.
const RG_BARONNIES = 'randonnee-baronnies-provencales-pnr.php'
const RG_VAUCLUSE = 'randonnee-pedestre-gps-vaucluse-84.php'
const RG_DROME = 'randonnee-pedestre-gps-drome-26.php'
export const RANDOGPS = {
  'saint-julien': RG_BARONNIES,
  angele: RG_BARONNIES,
  caire: RG_BARONNIES,
  'saint-julien-buis': RG_BARONNIES,
  'ventoux-gr4': RG_VAUCLUSE,
  'dentelles-loop': RG_VAUCLUSE,
  'trois-becs': RG_DROME,
  nesque: RG_VAUCLUSE,
  'toulourenc-walk': RG_VAUCLUSE,
  vanige: RG_BARONNIES,
  'garde-grosse': RG_BARONNIES,
  'saint-may': RG_BARONNIES,
  ubrieux: RG_BARONNIES,
  mevouillon: RG_BARONNIES,
  'ventoux-mont-serein': RG_VAUCLUSE,
}

// Visorando commune pages: curated local routes with downloadable GPX tracks.
// Keyed by hike id → commune slug (https://www.visorando.com/randonnee-<slug>.html)
export const VISORANDO_COMMUNE = {
  'saint-julien': 'buis-les-baronnies',
  angele: 'bellecombe-tarendol',
  caire: 'remuzat',
  'saint-julien-buis': 'sainte-jalle',
  'ventoux-gr4': 'bedoin',
  'dentelles-loop': 'gigondas',
  'trois-becs': 'saou',
  nesque: 'monieux',
  'toulourenc-walk': 'malaucene',
  vanige: 'sainte-jalle',
  'garde-grosse': 'nyons',
  'saint-may': 'saint-may',
  ubrieux: 'buis-les-baronnies',
  mevouillon: 'mevouillon',
  'ventoux-mont-serein': 'beaumont-du-ventoux',
}

// Hike entries live in public/data/hikes.json
