
import { useState } from "react";

export default function PhotoIssueReporter() {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");

  function handlePhoto(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image.");
      return;
    }

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setMessage(
      "Photo ready! Next, connect the AI vision model to identify the issue."
    );
  }

  return (
    <section style={{
      maxWidth: 600,
      margin: "24px auto",
      padding: 24,
      border: "1px solid #ddd",
      borderRadius: 16,
      background: "#fff"
    }}>
      <h2>📸 Campus Issue Detection</h2>
      <p>
        Take a photo or upload a picture of a campus facility problem.
      </p>

      <label style={{
        display: "block",
        padding: 18,
        border: "2px dashed #999",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "center"
      }}>
        <strong>Take Photo / Upload Image</strong>
        <p>Broken fan, damaged desk, water leakage, litter, etc.</p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          style={{ maxWidth: "100%" }}
        />
      </label>

      {preview && (
        <div style={{ marginTop: 20 }}>
          <img
            src={preview}
            alt="Selected campus issue"
            style={{
              width: "100%",
              maxHeight: 320,
              objectFit: "contain",
              borderRadius: 12
            }}
          />
          <p><strong>Selected:</strong> {photo?.name}</p>
        </div>
      )}

      {message && <p role="status">{message}</p>}
    </section>
  );
}
