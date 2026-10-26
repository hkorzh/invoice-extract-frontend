import { useEffect, useState } from "react";

const ACCEPTED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

export default function Uploader({ file, loading, status, extracted, onFileChange, onRemove, onExtract }) {
  const [dragging, setDragging] = useState(false);
  // Keep the last file around so its slot can animate out after it's cleared.
  const [shownFile, setShownFile] = useState(file);
  if (file && file !== shownFile) setShownFile(file);

  const runOpen = Boolean(file) || loading;

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Enter" && file && !loading) {
        onExtract();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [file, loading, onExtract]);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (loading) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped && ACCEPTED.includes(dropped.type)) {
      onFileChange(dropped);
    }
  }

  function handleInputChange(e) {
    const picked = e.target.files[0];
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
    if (picked) onFileChange(picked);
  }

  let prompt;
  if (dragging) prompt = "Drop it here";
  else if (extracted) prompt = "Try another invoice — click or drag it here";
  else prompt = "Choose an invoice or drag it here";

  // The slot takes the dropzone's place; dragging a file over it brings the dropzone back.
  const slotOpen = Boolean(file) && !dragging;

  return (
    <section className="panel" aria-busy={loading}>
      <div className={`loadbar${loading ? " active" : ""}`} aria-hidden="true" />

      <div
        className="dropstack"
        onDragOver={(e) => {
          e.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <label
          className={`filepick${dragging ? " dragging" : ""}${loading ? " busy" : ""}${slotOpen ? " covered" : ""}`}
          inert={slotOpen}
        >
          <input
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={handleInputChange}
            disabled={loading}
          />
          <span className="filepick-prompt">{prompt}</span>
          <span className="filepick-hint mono">PNG · JPEG · WEBP · PDF</span>
          <span className="filepick-overlay" aria-hidden="true">
            <span className="spinner" />
            <span className="mono">Extracting…</span>
          </span>
        </label>

        <div className={`slots-box${slotOpen ? " open" : ""}`} inert={!slotOpen}>
          {shownFile && (
            <ul className="slots">
              <li className="slot">
                <span className="slot-name" title={shownFile.name}>
                  {shownFile.name}
                </span>
                <button
                  className="slot-remove"
                  onClick={onRemove}
                  aria-label={`Remove ${shownFile.name}`}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className={`reveal${runOpen ? " open" : ""}`} inert={!runOpen}>
        <div className="reveal-inner">
          <button className="run" onClick={onExtract} disabled={!file || loading}>
            {loading ? (status === "retrying" ? "Retrying…" : "Reading…") : "Extract"}
          </button>
        </div>
      </div>
    </section>
  );
}
