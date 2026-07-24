// The auto-refreshed local agenda, shown at the top of the Events tab.
// Clearly labelled as machine-updated, in contrast to the curated lists.
const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function AgendaItem({ e }) {
  return (
    <li>
      <span className="agenda-date">
        {e.ongoing ? (e.end ? `→ ${shortDate(e.end)}` : 'Now on') : shortDate(e.date)}
      </span>
      <a href={e.url} target="_blank" rel="noreferrer">
        {e.title}
      </a>
      <span className="agenda-place">
        {e.city}
        {e.km != null ? ` · ${e.km} km` : ''}
      </span>
    </li>
  )
}

export default function AgendaSection({ agenda }) {
  const updated = agenda?.updatedAt ? new Date(agenda.updatedAt) : null
  const events = agenda?.events ?? []
  const upcoming = events.filter((e) => !e.ongoing)
  const ongoing = events.filter((e) => e.ongoing)

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
        <>
          {upcoming.length > 0 && (
            <>
              <h3 className="agenda-group">📅 Coming up</h3>
              <ul className="agenda-list">
                {upcoming.map((e) => (
                  <AgendaItem e={e} key={e.id} />
                ))}
              </ul>
            </>
          )}
          {ongoing.length > 0 && (
            <>
              <h3 className="agenda-group">
                🔄 Now on <span className="agenda-group-note">markets, exhibitions & other recurring events — date is the last day</span>
              </h3>
              <ul className="agenda-list">
                {ongoing.map((e) => (
                  <AgendaItem e={e} key={e.id} />
                ))}
              </ul>
            </>
          )}
        </>
      ) : updated ? (
        <p className="agenda-empty">
          The feed is active but found no upcoming events within ~60 km right now. It retries
          every Sunday night; the curated seasonal highlights below are maintained by hand.
        </p>
      ) : (
        <p className="agenda-empty">
          No automatic events yet. The feed updates every Sunday night once the{' '}
          <code>DATATOURISME_WEBSERVICE_URL</code> secret is configured in the repository (see
          the README for the step-by-step guide). The curated seasonal highlights below are
          maintained by hand.
        </p>
      )}
    </div>
  )
}
