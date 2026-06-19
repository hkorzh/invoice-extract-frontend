import { useState } from "react";
import "./App.css";
import Uploader from "./components/Uploader";
import Result from "./components/Result";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  async function extract() {
    if (!file) return;
    setLoading(true);
    setStatus(null);
    setError("");
    setData(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_URL}/extract`, {
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
          if (update.status === "finished") {
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

  function handleFileChange(f) {
    setFile(f);
    setData(null);
    setError("");
    setStatus(null);
  }

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
        onFileChange={handleFileChange}
        onExtract={extract}
      />

      {loading && status === "retrying" && (
        <div className="retrying">Gemini hiccuped — retrying…</div>
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
