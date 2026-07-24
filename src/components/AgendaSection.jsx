// The auto-refreshed local agenda, shown at the top of the Events tab.
// Clearly labelled as machine-updated, in contrast to the curated lists.
export default function AgendaSection({ agenda }) {
  const updated = agenda?.updatedAt ? new Date(agenda.updatedAt) : null
  const events = agenda?.events ?? []

  return (
    <div className="agenda-panel">
      <div className="agenda-head">
        <h2>
          📡 Local agenda <span className="auto-badge">AUTO · refreshed weekly</span>
        </h2>
        <span className="agenda-meta">
          {updated
            ? `Last automatic update: ${updated.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })} · source: ${agenda.source}`
            : 'Automatic feed not active yet'}
        </span>
      </div>

      {events.length ? (
        <ul className="agenda-list">
          {events.map((e) => (
            <li key={e.id}>
              <span className="agenda-date">
                {new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <a href={e.url} target="_blank" rel="noreferrer">
                {e.title}
              </a>
              <span className="agenda-place">
                {e.city}
                {e.km != null ? ` · ${e.km} km` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : updated ? (
        <p className="agenda-empty">
          The feed is active but found no upcoming events within ~60 km right now — rural
          agendas are thinly covered on OpenAgenda. It retries every Sunday night; the curated
          seasonal highlights below are maintained by hand.
        </p>
      ) : (
        <p className="agenda-empty">
          No automatic events yet. The feed updates every Sunday night once the{' '}
          <code>OPENAGENDA_KEY</code> secret is configured in the repository (free key at{' '}
          <a href="https://openagenda.com" target="_blank" rel="noreferrer">
            openagenda.com
          </a>
          ). The curated seasonal highlights below are maintained by hand.
        </p>
      )}
    </div>
  )
}
