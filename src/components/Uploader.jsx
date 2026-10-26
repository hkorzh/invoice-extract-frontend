import { useEffect, useState } from "react";

const ACCEPTED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

export default function Uploader({ files, maxFiles, loading, extracted, onFilesAdd, onRemove, onExtract }) {
  const [dragging, setDragging] = useState(false);
  // Keep the last files around so their slots can animate out after they're cleared.
  const [shownFiles, setShownFiles] = useState(files);
  if (files.length > 0 && files !== shownFiles) setShownFiles(files);

  const hasFiles = files.length > 0;
  const runOpen = hasFiles || loading;
  const full = files.length >= maxFiles;

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Enter" && hasFiles && !loading) {
        onExtract();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasFiles, loading, onExtract]);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (loading) return;
    const dropped = [...e.dataTransfer.files].filter((f) => ACCEPTED.includes(f.type));
    if (dropped.length > 0) onFilesAdd(dropped);
  }

  function handleInputChange(e) {
    const picked = [...e.target.files];
    // Reset so picking the same files again still fires onChange.
    e.target.value = "";
    if (picked.length > 0) onFilesAdd(picked);
  }

  let prompt;
  if (dragging) prompt = "Drop them here";
  else if (extracted) prompt = "Try more invoices — click or drag them here";
  else prompt = "Choose invoices or drag them here";

  // The slots take the dropzone's place; dragging files over them brings the dropzone back.
  const slotOpen = hasFiles && !dragging;

  let runLabel;
  if (loading) runLabel = "Reading…";
  else if (files.length > 1) runLabel = `Extract ${files.length} invoices`;
  else runLabel = "Extract";

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
            multiple
            accept={ACCEPTED.join(",")}
            onChange={handleInputChange}
            disabled={loading}
          />
          <span className="filepick-prompt">{prompt}</span>
          <span className="filepick-hint mono">
            PNG · JPEG · WEBP · PDF · UP TO {maxFiles}
          </span>
          <span className="filepick-overlay" aria-hidden="true">
            <span className="spinner" />
            <span className="mono">Extracting…</span>
          </span>
        </label>

        <div className={`slots-box${slotOpen ? " open" : ""}`} inert={!slotOpen}>
          <ul className="slots">
            {shownFiles.map((f, i) => (
              <li className="slot" key={`${f.name}-${f.size}-${f.lastModified}`}>
                <span className="slot-name" title={f.name}>
                  {f.name}
                </span>
                <button
                  className="slot-remove"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove ${f.name}`}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {!full && (
            <label className="slot-add mono">
              <input
                type="file"
                multiple
                accept={ACCEPTED.join(",")}
                onChange={handleInputChange}
                disabled={loading}
              />
              + Add more
            </label>
          )}
        </div>
      </div>

      <div className={`reveal${runOpen ? " open" : ""}`} inert={!runOpen}>
        <div className="reveal-inner">
          <button className="run" onClick={onExtract} disabled={!hasFiles || loading}>
            {runLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
