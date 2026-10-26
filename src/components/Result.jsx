const money = (v) => (v == null ? "—" : v);

// Optional ISO 4217 code (e.g. "USD"); older backends don't send it.
const withCurrency = (v, currency) =>
  v == null || !currency ? money(v) : `${v} ${currency}`;

// CSV cell escaping: quote anything with a comma, quote, or newline.
const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Result({ data }) {
  const currency = data.currency || null;
  const suffix = currency ? ` (${currency})` : "";

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, "invoice.json");
  }

  function downloadCSV() {
    const rows = [["description", "quantity", "unit_price", "amount"]];
    (data.line_items || []).forEach((li) =>
      rows.push([li.description, li.quantity, li.unit_price, li.amount])
    );
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    triggerDownload(new Blob([csv], { type: "text/csv" }), "invoice.csv");
  }

  return (
    <section className="result">
      <div className="meta">
        <div>
          <span className="label">Vendor</span>
          <span className="value">{data.vendor || "—"}</span>
        </div>
        <div>
          <span className="label">Date</span>
          <span className="value mono">{data.date || "—"}</span>
        </div>
        <div>
          <span className="label">Subtotal</span>
          <span className="value mono">{withCurrency(data.subtotal, currency)}</span>
        </div>
        <div>
          <span className="label">Total</span>
          <span className="value mono strong">{withCurrency(data.total, currency)}</span>
        </div>
      </div>

      <table className="lines">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Unit{suffix}</th>
            <th className="num">Amount{suffix}</th>
          </tr>
        </thead>
        <tbody>
          {(data.line_items || []).length === 0 ? (
            <tr>
              <td colSpan={4} className="empty">No line items found.</td>
            </tr>
          ) : (
            data.line_items.map((li, i) => (
              <tr key={i}>
                <td>{li.description || "—"}</td>
                <td className="num mono">{money(li.quantity)}</td>
                <td className="num mono">{money(li.unit_price)}</td>
                <td className="num mono">{money(li.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="downloads">
        <button onClick={downloadJSON}>Download JSON</button>
        <button onClick={downloadCSV}>Download CSV</button>
      </div>
    </section>
  );
}
