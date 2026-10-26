import { useState } from "react";
import "./App.css";
import Uploader from "./components/Uploader";
import Result from "./components/Result";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Gemini thought summaries are Markdown that open with a bold title,
// e.g. "**Identifying Invoice Details**\n\n..." — the title alone makes a good status line.
function thoughtTitle(text) {
  const bold = text.match(/\*\*(.+?)\*\*/);
  return (bold ? bold[1] : text.split("\n")[0]).trim();
}

function progressText(status, thought) {
  switch (status) {
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

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [thought, setThought] = useState(null);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [extracted, setExtracted] = useState(false);

  async function extract() {
    if (!file) return;
    // Hand the file off and free the dropzone right away so the next one can be picked.
    const current = file;
    setFile(null);
    setExtracted(true);
    setLoading(true);
    setStatus(null);
    setThought(null);
    setError("");
    setData(null);

    const form = new FormData();
    form.append("file", current);

    try {
      const res = await fetch(`${API_URL}/extract/live`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }

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
          if (!line.trim()) continue;

          const update = JSON.parse(line);
          setStatus(update.status);
          if (update.status === "thinking" && update.payload?.thought) {
            setThought(thoughtTitle(update.payload.thought));
          } else if (update.status === "retrying") {
            setThought(null);
          } else if (update.status === "finished") {
            setData(update.payload);
          } else if (update.status === "error") {
            setError(update.payload?.error || "Something went wrong.");
          }
        }
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }


  const progress = loading && progressText(status, thought);

  return (
    <div className="page">
      <header className="masthead">
        <span className="kicker">structured extraction</span>
        <h1>Invoice Reader</h1>
        <p>Drop in an invoice — image or PDF — and get clean, typed data back.</p>
      </header>

      <Uploader
        file={file}
        loading={loading}
        status={status}
        extracted={extracted}
        onFileChange={setFile}
        onRemove={() => setFile(null)}
        onExtract={extract}
      />

      {progress && (
        <div className="progress" aria-live="polite">
          {progress}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {data && <Result data={data} />}

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
