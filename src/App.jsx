import { useState } from "react";
import "./App.css";
import Uploader from "./components/Uploader";
import Result from "./components/Result";
import Summary from "./components/Summary";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Matches the backend's MAX_BATCH_FILES default.
const MAX_FILES = 5;

// Gemini thought summaries are Markdown that open with a bold title,
// e.g. "**Identifying Invoice Details**\n\n..." — the title alone makes a good status line.
function thoughtTitle(text) {
  const bold = text.match(/\*\*(.+?)\*\*/);
  return (bold ? bold[1] : text.split("\n")[0]).trim();
}

function progressText(status, thought) {
  switch (status) {
    case null:
      return "Sending…";
    case "queued":
      return "Waiting for a free slot…";
    case "uploading":
      return "Uploading the invoice to Gemini…";
    case "uploaded":
    case "waiting":
      return "Sending the invoice to Gemini…";
    case "thinking":
      return thought ? `${thought}…` : "Thinking…";
    case "writing":
      return "Writing up the results…";
    case "retrying":
      return "Gemini hiccuped — retrying…";
    default:
      return null;
  }
}

const sameFile = (a, b) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

// Reads an NDJSON response body, calling onUpdate once per parsed line.
async function readNdjson(res, onUpdate) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) onUpdate(JSON.parse(line));
    }
  }
}

// Folds one per-file update from /extract/batch into that file's job.
function applyUpdate(job, update) {
  const next = { ...job, status: update.status };
  if (update.status === "thinking" && update.payload?.thought) {
    next.thought = thoughtTitle(update.payload.thought);
  } else if (update.status === "retrying") {
    next.thought = null;
  } else if (update.status === "finished") {
    next.data = update.payload;
  } else if (update.status === "error") {
    next.error = update.payload?.error || "Something went wrong.";
  }
  return next;
}

const isSettled = (job) => job.status === "finished" || job.status === "error";

const TABS = [
  { id: "invoices", label: "Invoices" },
  { id: "summary", label: "Summary" },
];

export default function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [extracted, setExtracted] = useState(false);
  // The batch's closing "done" payload; null until it arrives.
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState("invoices");
  // Validation message for the current file selection, e.g. too many files.
  const [selectionError, setSelectionError] = useState("");

  function addFiles(picked) {
    const fresh = picked.filter((f) => !files.some((p) => sameFile(p, f)));
    const all = [...files, ...fresh];
    // Keep the first MAX_FILES and say what was left out, rather than dropping it silently.
    const skipped = all.length - MAX_FILES;
    setSelectionError(
      skipped > 0
        ? `You can upload up to ${MAX_FILES} files at once — ${skipped} ${skipped === 1 ? "file was" : "files were"} not added.`
        : ""
    );
    setFiles(all.slice(0, MAX_FILES));
  }

  function removeFile(index) {
    setSelectionError("");
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function extract() {
    if (files.length === 0) return;
    // Hand the files off and free the dropzone right away so the next ones can be picked.
    const current = files;
    setFiles([]);
    setExtracted(true);
    setLoading(true);
    setError("");
    setSelectionError("");
    setSummary(null);
    setJobs(
      current.map((f) => ({ name: f.name, status: null, thought: null, data: null, error: "" }))
    );

    const form = new FormData();
    current.forEach((f) => form.append("files", f));

    try {
      const res = await fetch(`${API_URL}/extract/batch`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }

      await readNdjson(res, (update) => {
        // Only per-file updates carry an index; the closing "done" carries the totals.
        if (update.file == null) {
          if (update.status === "done") setSummary(update.payload);
          return;
        }
        setJobs((prev) =>
          prev.map((job, i) => (i === update.file ? applyUpdate(job, update) : job))
        );
      });
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      // A stream cut short leaves some files mid-way; don't leave them spinning.
      setJobs((prev) =>
        prev.map((job) =>
          isSettled(job) ? job : { ...job, status: "error", error: "Connection lost." }
        )
      );
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <span className="kicker">structured extraction</span>
        <h1>Invoice Reader</h1>
        <p>Drop in invoices — images or PDFs — and get clean, typed data back.</p>
      </header>

      <Uploader
        files={files}
        maxFiles={MAX_FILES}
        loading={loading}
        extracted={extracted}
        onFilesAdd={addFiles}
        onRemove={removeFile}
        onExtract={extract}
      />

      {selectionError && (
        <div className="error" role="alert">
          {selectionError}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {jobs.length > 0 && (
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              className={`tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {jobs.length > 0 && tab === "summary" && (
        <div id="panel-summary" role="tabpanel" aria-labelledby="tab-summary">
          <Summary summary={summary} loading={loading} />
        </div>
      )}

      {jobs.length > 0 && tab === "invoices" && (
        <div id="panel-invoices" role="tabpanel" aria-labelledby="tab-invoices">
          {jobs.map((job, i) => {
            const progress = progressText(job.status, job.thought);
            return (
              <section className="job" key={i}>
                <h2 className="job-name" title={job.name}>
                  {job.name}
                </h2>
                {progress && !isSettled(job) && (
                  <div className="progress" aria-live="polite">
                    {progress}
                  </div>
                )}
                {job.error && <div className="error">{job.error}</div>}
                {job.data && <Result data={job.data} name={job.name} />}
              </section>
            );
          })}
        </div>
      )}

      <footer className="repos">
        <a
          href="https://github.com/hkorzh/invoice-extract-frontend"
          target="_blank"
          rel="noreferrer"
        >
          Frontend repo
        </a>
        <a
          href="https://github.com/hkorzh/invoice-extract-backend"
          target="_blank"
          rel="noreferrer"
        >
          Backend repo
        </a>
      </footer>
    </div>
  );
}
