// Curated hiking routes reachable from Saint-Jalle.
// distanceKm / ascentM are round-trip estimates; times assume a steady pace.
// difficulty: 'easy' | 'moderate' | 'hard'
export const DIFFICULTY = {
  easy: { label: 'Easy', color: '#4f6f52' },
  moderate: { label: 'Moderate', color: '#c07a2b' },
  hard: { label: 'Hard', color: '#8e3b46' },
}

// AllTrails pages per hike: town pages where they exist, otherwise the
// Baronnies Provençales park page (tiny villages have no own page).
const AT_PARK = 'parks/france/hautes-alpes/parc-naturel-regional-des-baronnies-provencales'
export const ALLTRAILS = {
  'saint-julien': 'france/drome/buis-les-baronnies',
  angele: AT_PARK,
  caire: AT_PARK,
  'saint-julien-buis': AT_PARK,
  'ventoux-gr4': 'france/vaucluse/bedoin',
  'dentelles-loop': 'france/vaucluse/gigondas',
  'trois-becs': 'france/drome/saou',
  nesque: 'france/vaucluse/monieux',
  'toulourenc-walk': 'france/vaucluse/malaucene',
  vanige: AT_PARK,
  'garde-grosse': 'france/drome/nyons',
  'saint-may': AT_PARK,
  ubrieux: 'france/drome/buis-les-baronnies',
  mevouillon: AT_PARK,
  'ventoux-mont-serein': 'france/vaucluse/bedoin',
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
