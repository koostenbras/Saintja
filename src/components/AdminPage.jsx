import { useEffect, useMemo, useState } from 'react'

// Admin: curate the JSON lists (add / edit / delete) straight from the browser.
// Saves commit directly to GitHub via the Contents API with a fine-grained
// Personal Access Token that never leaves this browser (localStorage).
// The public site redeploys automatically ~1 minute after each save.
const REPO = { owner: 'koostenbras', repo: 'Saintja', branch: 'main' }
const TOKEN_KEY = 'saintja_admin_token'

const COLLECTIONS = {
  destinations: {
    label: '🧭 Day trips',
    file: 'destinations.json',
    title: (e) => e.name,
    sub: (e) => `${e.category} · ${e.tier} · ${e.driveMin} min`,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', options: ['culture', 'food', 'nature'] },
      { key: 'tier', label: 'Tier', type: 'select', options: ['near', 'far'] },
      { key: 'driveMin', label: 'Drive (min)', type: 'number' },
      { key: 'lat', label: 'Latitude', type: 'number' },
      { key: 'lon', label: 'Longitude', type: 'number' },
      { key: 'summary', label: 'Summary', type: 'textarea' },
      { key: 'highlights', label: 'Highlights (comma separated)', type: 'tags' },
      { key: 'tip', label: 'Tip', type: 'text' },
    ],
  },
  hikes: {
    label: '🥾 Hikes',
    file: 'hikes.json',
    title: (e) => e.name,
    sub: (e) => `${e.distanceKm} km · ${e.ascentM} m ↑ · ${e.difficulty} · ${e.driveMin} min drive`,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'trailhead', label: 'Trailhead', type: 'text' },
      { key: 'driveMin', label: 'Drive (min)', type: 'number' },
      { key: 'lat', label: 'Latitude', type: 'number' },
      { key: 'lon', label: 'Longitude', type: 'number' },
      { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
      { key: 'ascentM', label: 'Ascent (m)', type: 'number' },
      { key: 'timeH', label: 'Time (hours)', type: 'number' },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'moderate', 'hard'] },
      { key: 'loop', label: 'Loop route', type: 'bool' },
      { key: 'summary', label: 'Summary', type: 'textarea' },
      { key: 'highlights', label: 'Highlights (comma separated)', type: 'tags' },
      { key: 'season', label: 'Best season', type: 'text' },
      { key: 'visorando', label: 'Visorando page (path after visorando.com/)', type: 'text' },
      { key: 'gpx', label: 'GPX file name (upload to public/data/gpx/ first)', type: 'text' },
    ],
  },
  restaurants: {
    label: '🍽️ Restaurants',
    file: 'restaurants.json',
    title: (e) => e.name,
    sub: (e) => `${e.town} · ${e.style} · ${e.price}`,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'town', label: 'Town', type: 'text' },
      { key: 'style', label: 'Style', type: 'select', options: ['gastronomic', 'bistro', 'terrace'] },
      { key: 'driveMin', label: 'Drive (min)', type: 'number' },
      { key: 'price', label: 'Price', type: 'select', options: ['€', '€€', '€€€', '€€€€'] },
      { key: 'summary', label: 'Summary', type: 'textarea' },
      { key: 'highlights', label: 'Highlights (comma separated)', type: 'tags' },
    ],
  },
  events: {
    label: '🎪 Seasonal highlights',
    file: 'events.json',
    title: (e) => e.name,
    sub: (e) => `${e.place} · ${e.when}`,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'place', label: 'Place', type: 'text' },
      { key: 'driveMin', label: 'Drive (min)', type: 'number' },
      { key: 'months', label: 'Months (numbers 1–12, comma separated)', type: 'months' },
      { key: 'when', label: 'When (label)', type: 'text' },
      { key: 'summary', label: 'Summary', type: 'textarea' },
      { key: 'highlights', label: 'Highlights (comma separated)', type: 'tags' },
      { key: 'url', label: 'Agenda link (optional)', type: 'text' },
      { key: 'urlLabel', label: 'Agenda link label (optional)', type: 'text' },
    ],
  },
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

function b64decode(b64) {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function gh(path, token, opts = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/${path}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`GitHub ${res.status}: ${body.message || 'request failed'}`)
  }
  return res.json()
}

function toForm(entry, fields) {
  const f = {}
  fields.forEach(({ key, type }) => {
    const v = entry?.[key]
    if (type === 'tags') f[key] = (v || []).join(', ')
    else if (type === 'months') f[key] = (v || []).join(', ')
    else if (type === 'bool') f[key] = Boolean(v)
    else f[key] = v ?? ''
  })
  return f
}

function fromForm(form, fields, existing) {
  const out = { ...(existing || {}) }
  fields.forEach(({ key, type }) => {
    const v = form[key]
    if (type === 'number') out[key] = v === '' ? undefined : Number(v)
    else if (type === 'tags')
      out[key] = String(v).split(',').map((s) => s.trim()).filter(Boolean)
    else if (type === 'months')
      out[key] = String(v)
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => n >= 1 && n <= 12)
    else if (type === 'bool') out[key] = Boolean(v)
    else if (v !== '') out[key] = v
    else delete out[key]
  })
  if (!out.id) out.id = slugify(out.name || `entry-${Date.now()}`)
  return out
}

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [tokenInput, setTokenInput] = useState('')
  const [collKey, setCollKey] = useState('destinations')
  const [entries, setEntries] = useState(null)
  const [sha, setSha] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | index
  const [form, setForm] = useState({})
  const [status, setStatus] = useState({ kind: '', msg: '' })
  const [busy, setBusy] = useState(false)

  const coll = COLLECTIONS[collKey]

  const load = useMemo(
    () => async () => {
      setEntries(null)
      setSha(null)
      setEditing(null)
      setStatus({ kind: '', msg: '' })
      try {
        if (token) {
          const json = await gh(
            `contents/public/data/${coll.file}?ref=${REPO.branch}`,
            token,
          )
          setEntries(JSON.parse(b64decode(json.content)))
          setSha(json.sha)
        } else {
          const res = await fetch(`${import.meta.env.BASE_URL}data/${coll.file}`)
          setEntries(await res.json())
        }
      } catch (err) {
        setStatus({ kind: 'error', msg: `Couldn’t load ${coll.file}: ${err.message}` })
        setEntries([])
      }
    },
    [collKey, token], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    load()
  }, [load])

  async function save(newEntries, message) {
    if (!token) {
      setStatus({ kind: 'error', msg: 'Add your GitHub token first — saving needs it.' })
      return
    }
    setBusy(true)
    setStatus({ kind: '', msg: '' })
    try {
      // Re-fetch for the current sha so we never overwrite someone else's edit
      const fresh = await gh(`contents/public/data/${coll.file}?ref=${REPO.branch}`, token)
      await gh(`contents/public/data/${coll.file}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: b64encode(JSON.stringify(newEntries, null, 2) + '\n'),
          sha: fresh.sha,
          branch: REPO.branch,
        }),
      })
      setEntries(newEntries)
      setEditing(null)
      setStatus({
        kind: 'ok',
        msg: `Saved ✓ — committed to GitHub. The live site updates in about a minute.`,
      })
    } catch (err) {
      setStatus({ kind: 'error', msg: `Save failed: ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  function startEdit(i) {
    setEditing(i)
    setForm(toForm(i === 'new' ? null : entries[i], coll.fields))
  }

  function submitForm(e) {
    e.preventDefault()
    const required = coll.fields.filter((f) => f.required && !String(form[f.key] || '').trim())
    if (required.length) {
      setStatus({ kind: 'error', msg: `Missing required field: ${required[0].label}` })
      return
    }
    const entry = fromForm(form, coll.fields, editing === 'new' ? null : entries[editing])
    const next = [...entries]
    if (editing === 'new') next.push(entry)
    else next[editing] = entry
    save(next, `admin: ${editing === 'new' ? 'add' : 'update'} ${entry.name || entry.id} (${collKey})`)
  }

  function remove(i) {
    const entry = entries[i]
    if (!window.confirm(`Delete “${entry.name || entry.id}”? This commits immediately.`)) return
    const next = entries.filter((_, idx) => idx !== i)
    save(next, `admin: remove ${entry.name || entry.id} (${collKey})`)
  }

  return (
    <div className="app admin">
      <header className="hero">
        <div className="eyebrow">Saintja · Admin</div>
        <h1>Curate the lists 🔧</h1>
        <p className="lede">
          Add, edit or delete entries. Every save is a commit to GitHub — the live site updates
          itself about a minute later. <a href="#">← Back to the site</a>
        </p>
      </header>

      {!token ? (
        <div className="admin-token card">
          <h3>Connect your GitHub token</h3>
          <p className="desc">
            Create a <b>fine-grained Personal Access Token</b> on GitHub (Settings → Developer
            settings → Fine-grained tokens) with access to <b>only this repository</b> and
            <b> Contents: Read and write</b>. It is stored only in this browser.
          </p>
          <div className="admin-token-row">
            <input
              type="password"
              placeholder="github_pat_…"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button
              className="tab active"
              onClick={() => {
                localStorage.setItem(TOKEN_KEY, tokenInput.trim())
                setToken(tokenInput.trim())
              }}
              disabled={!tokenInput.trim()}
            >
              Save token
            </button>
          </div>
          <p className="desc">Without a token you can browse the lists but not save.</p>
        </div>
      ) : (
        <p className="admin-token-set">
          🔐 Token connected (stored in this browser only) ·{' '}
          <button
            className="linkish"
            onClick={() => {
              localStorage.removeItem(TOKEN_KEY)
              setToken('')
            }}
          >
            disconnect
          </button>
        </p>
      )}

      <nav className="tabs">
        {Object.entries(COLLECTIONS).map(([key, c]) => (
          <button
            key={key}
            className={`tab ${collKey === key ? 'active' : ''}`}
            onClick={() => setCollKey(key)}
          >
            {c.label}
          </button>
        ))}
      </nav>

      {status.msg && <p className={status.kind === 'error' ? 'error' : 'saved-ok'}>{status.msg}</p>}

      {entries === null ? (
        <p className="loading">Loading {coll.file}…</p>
      ) : editing !== null ? (
        <form className="card admin-form" onSubmit={submitForm}>
          <h3>{editing === 'new' ? 'Add entry' : `Edit: ${entries[editing]?.name}`}</h3>
          {coll.fields.map((f) => (
            <label key={f.key} className="admin-field">
              <span>{f.label}{f.required ? ' *' : ''}</span>
              {f.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : f.type === 'select' ? (
                <select
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                >
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === 'bool' ? (
                <input
                  type="checkbox"
                  checked={Boolean(form[f.key])}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                />
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  step="any"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          <div className="admin-actions">
            <button type="submit" className="tab active" disabled={busy}>
              {busy ? 'Saving…' : 'Save & commit'}
            </button>
            <button type="button" className="tab" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <button className="tab active admin-add" onClick={() => startEdit('new')}>
            ➕ Add {coll.label.replace(/^[^ ]+ /, '')}
          </button>
          <ul className="admin-list">
            {entries.map((e, i) => (
              <li key={e.id || i}>
                <div>
                  <b>{coll.title(e)}</b>
                  <span className="admin-sub">{coll.sub(e)}</span>
                </div>
                <div className="admin-row-actions">
                  <button className="chip" onClick={() => startEdit(i)}>✏️ Edit</button>
                  <button className="chip danger" onClick={() => remove(i)} disabled={busy}>
                    🗑️ Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <footer>
        <p>
          Saves commit straight to <b>{REPO.owner}/{REPO.repo}</b> (branch {REPO.branch}) — full
          history in Git, so every change can be reverted. The 📡 auto-agenda is machine-managed
          and not editable here.
        </p>
      </footer>
    </div>
  )
}
