"use client";

import { useState } from "react";

const API_BASE = "http://localhost:4000";

export default function HomePage() {
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState("");
  const [question, setQuestion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [chatLog, setChatLog] = useState([
    {
      role: "assistant",
      text: "Upload a PDF, DOCX, or spreadsheet and I will answer questions from it.",
    },
  ]);

  const handleUpload = async () => {
    if (!file) {
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: "Please choose a supported document first." },
      ]);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setDocumentId(data.documentId);
      setChatLog((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Indexed \"${data.filename}\" — ${data.pageCount} pages, ${data.chunkCount} chunks.`,
        },
      ]);
    } catch (error) {
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: `Upload error: ${error.message}` },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAsk = async (event) => {
    event.preventDefault();

    if (!question.trim() || !documentId) {
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: "Upload a file before asking a question." },
      ]);
      return;
    }

    const userQuestion = question.trim();
    setChatLog((prev) => [...prev, { role: "user", text: userQuestion }]);
    setQuestion("");
    setIsAsking(true);

    try {
      const response = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question: userQuestion }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to answer question");
      }

      const sourceText = data.sources?.length ? ` (Pages: ${data.sources.join(", ")})` : "";
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: `${data.answer}${sourceText}` },
      ]);
    } catch (error) {
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${error.message}` },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="chat-card">
        <div className="header-block">
          <span className="badge">RAG Chat</span>
          <h1>Ask My PDF</h1>
          <p>Upload a document and ask questions about it.</p>
        </div>

        <div className="upload-box">
          <input
            type="file"
            accept=".pdf,.docx,.csv,.xls,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <button type="button" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload document"}
          </button>
        </div>

        <div className="chat-window" aria-live="polite">
          {chatLog.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`message-row ${message.role === "user" ? "user" : "assistant"}`}
            >
              <div className="message-bubble">{message.text}</div>
            </div>
          ))}
        </div>

        <form className="prompt-box" onSubmit={handleAsk}>
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={documentId ? "Ask a question about your document..." : "Upload a file to begin..."}
            disabled={!documentId || isAsking}
          />
          <button type="submit" disabled={!documentId || isAsking || !question.trim()}>
            {isAsking ? "Thinking..." : "Ask"}
          </button>
        </form>
      </div>
    </main>
  );
}
