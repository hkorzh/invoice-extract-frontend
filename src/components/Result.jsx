const money = (v) => (v == null ? "—" : v);

// Optional ISO 4217 code (e.g. "USD"); older backends don't send it.
const withCurrency = (v, currency) =>
  v == null || !currency ? money(v) : `${v} ${currency}`;

const percent = (v) => (v == null ? "—" : `${v}%`);

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

export default function Result({ data, name }) {
  // Downloads are named after the source file, e.g. "acme-march.pdf" -> "acme-march.json".
  const base = name ? name.replace(/\.[^.]+$/, "") : "invoice";
  const currency = data.currency || null;
  const suffix = currency ? ` (${currency})` : "";
  const lineItems = data.line_items || [];
  // Only show the per-line tax column when the invoice prints a rate somewhere.
  const showTax = lineItems.some((li) => li.tax_percent != null);
  // Same rule as the batch summary: prefer the explicit with-tax figure.
  const total = data.total_with_tax ?? data.total;

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, `${base}.json`);
  }

  function downloadCSV() {
    const rows = [["description", "quantity", "unit_price", "amount", "tax_percent"]];
    lineItems.forEach((li) =>
      rows.push([li.description, li.quantity, li.unit_price, li.amount, li.tax_percent])
    );
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    triggerDownload(new Blob([csv], { type: "text/csv" }), `${base}.csv`);
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
          <span className="label">Tax</span>
          <span className="value mono">{withCurrency(data.total_tax, currency)}</span>
        </div>
        <div>
          <span className="label">Total</span>
          <span className="value mono strong">{withCurrency(total, currency)}</span>
        </div>
      </div>

      <table className="lines">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Unit{suffix}</th>
            <th className="num">Amount{suffix}</th>
            {showTax && <th className="num">Tax</th>}
          </tr>
        </thead>
        <tbody>
          {lineItems.length === 0 ? (
            <tr>
              <td colSpan={4} className="empty">No line items found.</td>
            </tr>
          ) : (
            lineItems.map((li, i) => (
              <tr key={i}>
                <td>{li.description || "—"}</td>
                <td className="num mono">{money(li.quantity)}</td>
                <td className="num mono">{money(li.unit_price)}</td>
                <td className="num mono">{money(li.amount)}</td>
                {showTax && <td className="num mono">{percent(li.tax_percent)}</td>}
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
