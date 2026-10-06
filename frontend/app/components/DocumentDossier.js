"use client";

import { sound } from "../utils/sound";

export default function DocumentDossier({
  documentData,
  onResetDocument,
  onSelectPrompt,
}) {
  if (!documentData) return null;

  const quickPrompts = [
    { label: "📋 Executive Summary", prompt: "Provide a clear executive summary of this document." },
    { label: "🔍 Key Takeaways", prompt: "What are the 3 to 5 most important takeaways from this document?" },
    { label: "📊 Facts & Metrics", prompt: "Highlight any key statistics, numerical metrics, or dates mentioned." },
    { label: "❓ Next Steps / Action Items", prompt: "What action items, conclusions, or next steps are outlined?" },
  ];

  const getDocTypeClass = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("pdf")) return "type-pdf";
    if (t.includes("word") || t.includes("docx")) return "type-docx";
    if (t.includes("sheet") || t.includes("excel") || t.includes("xlsx") || t.includes("xls")) return "type-excel";
    if (t.includes("csv")) return "type-csv";
    return "type-default";
  };

  return (
    <div className="dossier-card">
      <div className="dossier-header-row">
        <div className="section-title-wrap">
          <span className="section-badge active-badge">Active Base</span>
          <h2 className="section-heading">Indexed Document</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            sound.playTick();
            onResetDocument();
          }}
          className="reset-doc-btn"
          title="Index a different document"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>Change Document</span>
        </button>
      </div>

      {/* Main File Dossier Badge */}
      <div className={`dossier-file-box ${getDocTypeClass(documentData.fileType || documentData.type)}`}>
        <div className="dossier-icon-col">
          <div className="dossier-ext-tag">
            {documentData.filename?.split(".").pop()?.toUpperCase() || "DOC"}
          </div>
        </div>
        <div className="dossier-main-col">
          <h3 className="dossier-filename" title={documentData.filename}>
            {documentData.filename}
          </h3>
          <div className="dossier-stat-pills">
            <span className="stat-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {documentData.pageCount} {documentData.pageCount === 1 ? "page" : "pages"}
            </span>
            <span className="stat-pill highlight-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              {documentData.chunkCount} vector chunks
            </span>
          </div>
        </div>
      </div>

      {/* Vector Store Assurance Chip */}
      <div className="qdrant-status-banner">
        <div className="qdrant-indicator" />
        <span className="qdrant-text">
          Live in Qdrant Vector Cloud &bull; Top-4 Cosine Retrieval
        </span>
      </div>

      {/* Quick Prompt Starters */}
      <div className="quick-prompts-section">
        <span className="prompts-label">Instant Insights & Starters:</span>
        <div className="prompts-grid">
          {quickPrompts.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="prompt-chip-btn"
              onClick={() => {
                sound.playPop();
                onSelectPrompt(item.prompt);
              }}
            >
              <span>{item.label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
