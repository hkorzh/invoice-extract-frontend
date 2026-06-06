import { useState } from "react";
import "./App.css";
import Uploader from "./components/Uploader";
import Result from "./components/Result";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  async function extract() {
    if (!file) return;
    setLoading(true);
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
      setData(await res.json());
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
        onFileChange={handleFileChange}
        onExtract={extract}
      />

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
