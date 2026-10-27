// The batch's closing "done" payload: {finished, failed, totals: [{currency, amount}]}.
export default function Summary({ summary, loading }) {
  if (!summary) {
    return (
      <div className="progress" aria-live="polite">
        {loading
          ? "Totals appear once every file is processed…"
          : "Totals aren't available — the batch didn't complete."}
      </div>
    );
  }

  const totals = summary.totals || [];

  return (
    <section className="result">
      <div className="meta">
        <div>
          <span className="label">Extracted</span>
          <span className="value mono">{summary.finished}</span>
        </div>
        <div>
          <span className="label">Failed</span>
          <span className="value mono">{summary.failed}</span>
        </div>
        <div>
          <span className="label">Total</span>
          {totals.length === 0 ? (
            <span className="value mono">—</span>
          ) : (
            totals.map((t) => (
              <span className="value mono strong" key={t.currency ?? ""}>
                {t.currency ? `${t.amount} ${t.currency}` : `${t.amount} (unknown currency)`}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
