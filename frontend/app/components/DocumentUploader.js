"use client";

import { useState, useRef } from "react";
import { sound } from "../utils/sound";

export default function DocumentUploader({
  onUpload,
  isUploading,
  onDragStateChange,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileExtension = (name) => {
    if (!name) return "";
    return name.slice(name.lastIndexOf(".") + 1).toUpperCase();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      if (onDragStateChange) onDragStateChange(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
      if (onDragStateChange) onDragStateChange(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (onDragStateChange) onDragStateChange(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setSelectedFile(droppedFile);
      sound.playTick();
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      sound.playTick();
    }
  };

  const handleStartUpload = () => {
    if (!selectedFile || isUploading) return;
    sound.playPop();
    onUpload(selectedFile);
  };

  return (
    <div className="uploader-card">
      <div className="card-header-row">
        <div className="section-title-wrap">
          <span className="section-badge">Step 1</span>
          <h2 className="section-heading">Ingest Knowledge Base</h2>
        </div>
        <span className="rag-pill">Vector Indexing</span>
      </div>

      {/* Drag & Drop Surface */}
      <div
        className={`dropzone-surface ${dragActive ? "drag-over" : ""} ${
          selectedFile ? "has-file" : ""
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden-file-input"
          accept=".pdf,.docx,.csv,.xls,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={handleChange}
        />

        <div className="dropzone-inner">
          <div className="dropzone-icon-orbit">
            <div className="orbit-spin" />
            <div className="dropzone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
          </div>

          <div className="dropzone-texts">
            <p className="drop-title">
              {dragActive ? "Release to load document" : "Drag & drop your document here"}
            </p>
            <p className="drop-subtitle">
              or <span className="highlight-browse">browse files</span> from your computer
            </p>
          </div>

          <div className="format-badges">
            <span className="fmt-badge pdf">PDF</span>
            <span className="fmt-badge docx">DOCX</span>
            <span className="fmt-badge xlsx">XLSX</span>
            <span className="fmt-badge csv">CSV</span>
          </div>
        </div>
      </div>

      {/* Selected File Details Bar */}
      {selectedFile && (
        <div className="selected-file-banner">
          <div className="file-info-col">
            <div className="file-type-icon">
              <span>{getFileExtension(selectedFile.name)}</span>
            </div>
            <div className="file-name-meta">
              <span className="file-name" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <span className="file-size">{formatFileSize(selectedFile.size)}</span>
            </div>
          </div>

          <button
            type="button"
            className="clear-selected-btn"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
              sound.playTick();
            }}
            title="Remove selection"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ingest Button & Uploading Progress */}
      {isUploading ? (
        <div className="upload-progress-box">
          <div className="progress-labels">
            <span className="progress-label-main">Embedding into Qdrant...</span>
            <span className="progress-pulse-dot" />
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill animated" />
          </div>
          <div className="indexing-steps">
            <span>Parse</span> &rarr; <span>Chunk</span> &rarr; <span>Gemini Vector</span> &rarr; <span>Index</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartUpload}
          disabled={!selectedFile || isUploading}
          className="upload-submit-btn"
        >
          <span className="btn-glow" />
          <span className="btn-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Process & Index Document</span>
          </span>
        </button>
      )}
    </div>
  );
}
