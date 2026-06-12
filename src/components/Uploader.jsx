import { useEffect, useState } from "react";

const ACCEPTED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

export default function Uploader({ file, loading, onFileChange, onExtract }) {
  const [dragging, setDragging] = useState(false);

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
    const dropped = e.dataTransfer.files[0];
    if (dropped && ACCEPTED.includes(dropped.type)) {
      onFileChange(dropped);
    }
  }

  return (
    <section className="panel">
      <label
        className={`filepick${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={ACCEPTED.join(",")}
          onChange={(e) => onFileChange(e.target.files[0])}
        />
        <span>
          {file
            ? file.name
            : dragging
            ? "Drop it here"
            : "Choose an invoice or drag it here"}
        </span>
      </label>
      <button className="run" onClick={onExtract} disabled={!file || loading}>
        {loading ? "Reading…" : "Extract"}
      </button>
    </section>
  );
}
