"use client";

import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import MascotDex from "./components/MascotDex";
import DocumentUploader from "./components/DocumentUploader";
import DocumentDossier from "./components/DocumentDossier";
import ChatMessage from "./components/ChatMessage";
import { sound } from "./utils/sound";

const API_BASE = "http://localhost:4000";

export default function HomePage() {
  const [documentId, setDocumentId] = useState("");
  const [documentData, setDocumentData] = useState(null);
  const [question, setQuestion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mascotState, setMascotState] = useState("idle"); // idle, dragging, scanning, thinking, happy, error, ready
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);

  const [chatLog, setChatLog] = useState([
    {
      role: "assistant",
      text: "👋 Welcome! I'm **Dex**, your AI document research companion.\n\nUpload any **PDF, Word doc, Excel workbook, or CSV** on the left. I'll split it into semantic chunks, embed it into our **Qdrant vector engine**, and answer your questions with exact page references!",
      timestamp: "Just now",
      sources: [],
    },
  ]);

  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll chat window when new messages arrive or when thinking
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, isAsking]);

  // Global drag-and-drop listener to make Dex react immediately
  useEffect(() => {
    const handleWindowDragOver = (e) => {
      e.preventDefault();
      if (!isDraggingGlobal) {
        setIsDraggingGlobal(true);
        setMascotState("dragging");
      }
    };

    const handleWindowDragLeave = (e) => {
      if (e.clientX <= 0 || e.clientY <= 0) {
        setIsDraggingGlobal(false);
        setMascotState(documentId ? "ready" : "idle");
      }
    };

    const handleWindowDrop = (e) => {
      e.preventDefault();
      setIsDraggingGlobal(false);
      setMascotState(documentId ? "ready" : "idle");
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [isDraggingGlobal, documentId]);

  // Handle Mute toggle
  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      sound.setMuted(next);
      return next;
    });
  };

  // Upload handler
  const handleUploadFile = async (file) => {
    if (!file) return;

    setIsUploading(true);
    setMascotState("scanning");

    const formData = new FormData();
    formData.append("file", file);

    const uploadStartTime = Date.now();

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
      setDocumentData(data);
      setMascotState("ready");
      sound.playChime();

      const timeTaken = ((Date.now() - uploadStartTime) / 1000).toFixed(1);

      setChatLog((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `🎉 Successfully indexed **${data.filename}** in ${timeTaken}s!\n\n- **Pages**: ${data.pageCount}\n- **Vector Chunks**: ${data.chunkCount}\n- **Storage**: Qdrant Vector Cloud\n\nAsk me anything about this file, or select a starter prompt below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sources: [],
        },
      ]);
    } catch (error) {
      setMascotState("error");
      sound.playTick();
      setChatLog((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ **Upload Error**: ${error.message}\n\nPlease verify that the file is not password-protected and is a supported format (.pdf, .docx, .xlsx, .csv).`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sources: [],
        },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  // Ask question handler
  const handleAskQuestion = async (queryText = null) => {
    const textToSend = typeof queryText === "string" ? queryText : question;
    const trimmed = textToSend.trim();

    if (!trimmed || !documentId || isAsking) return;

    sound.playPop();
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user question
    setChatLog((prev) => [
      ...prev,
      {
        role: "user",
        text: trimmed,
        timestamp: nowTime,
      },
    ]);

    setQuestion("");
    setIsAsking(true);
    setMascotState("thinking");

    try {
      const response = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question: trimmed }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate answer");
      }

      setChatLog((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          sources: data.sources || [],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      setMascotState("happy");
      sound.playSuccess();
      setTimeout(() => setMascotState("ready"), 4000);
    } catch (error) {
      setMascotState("error");
      sound.playTick();
      setChatLog((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ **Query Error**: ${error.message}\n\nCould not retrieve chunks. Please verify backend connection or re-upload your document.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sources: [],
        },
      ]);
      setTimeout(() => setMascotState("ready"), 5000);
    } finally {
      setIsAsking(false);
    }
  };

  const handleResetDocument = () => {
    setDocumentId("");
    setDocumentData(null);
    setMascotState("idle");
    setChatLog((prev) => [
      ...prev,
      {
        role: "assistant",
        text: "Document reset. Please upload a new file whenever you're ready!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources: [],
      },
    ]);
  };

  const handleClearChat = () => {
    setChatLog([
      {
        role: "assistant",
        text: documentId
          ? `Chat cleared! I'm still linked to **${documentData?.filename || "your document"}**. Ask me anything!`
          : "Chat cleared! Upload a document to get started.",
        timestamp: "Just now",
        sources: [],
      },
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <div className="app-viewport">
      {/* Dynamic Background Mesh & Ambient Glow Orbs */}
      <div className="bg-canvas">
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
        <div className="glow-orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <div className="main-layout-container">
        {/* Global Navigation Header */}
        <Header
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onClearChat={handleClearChat}
          hasMessages={chatLog.length > 1}
        />

        {/* Dual Pane Studio Arena */}
        <div className="studio-grid">
          {/* LEFT COLUMN: Mascot & Document Control Center */}
          <aside className="left-panel">
            {/* Mascot Companion Dock */}
            <div className="mascot-card-dock">
              <MascotDex
                state={mascotState}
                hasDocument={Boolean(documentId)}
                onClick={() => sound.playTick()}
              />
            </div>

            {/* Document Ingestion or Active Dossier */}
            <div className="document-dock">
              {!documentId ? (
                <DocumentUploader
                  onUpload={handleUploadFile}
                  isUploading={isUploading}
                  onDragStateChange={(isOver) => {
                    setMascotState(isOver ? "dragging" : "idle");
                  }}
                />
              ) : (
                <DocumentDossier
                  documentData={documentData}
                  onResetDocument={handleResetDocument}
                  onSelectPrompt={(prompt) => handleAskQuestion(prompt)}
                />
              )}
            </div>

            {/* System Info Footnote */}
            <div className="system-specs-bar">
              <div className="spec-item">
                <span className="spec-label">Model</span>
                <span className="spec-value">Gemini 2.0 Flash</span>
              </div>
              <div className="spec-divider" />
              <div className="spec-item">
                <span className="spec-label">Vector Dim</span>
                <span className="spec-value">768 Float32</span>
              </div>
              <div className="spec-divider" />
              <div className="spec-item">
                <span className="spec-label">Metric</span>
                <span className="spec-value">Cosine</span>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Interactive Neural Chat Arena */}
          <section className="right-panel">
            <div className="chat-card-frame">
              {/* Chat Header Bar */}
              <div className="chat-arena-header">
                <div className="arena-title-group">
                  <div className="radar-dot" />
                  <div>
                    <h2 className="arena-title">
                      {documentData ? documentData.filename : "Neural Research Workspace"}
                    </h2>
                    <p className="arena-subtitle">
                      {documentId
                        ? `Live Vector Knowledge Base • ${documentData?.chunkCount || 0} Chunks`
                        : "Upload a document on the left to initiate vector search"}
                    </p>
                  </div>
                </div>

                {documentId && (
                  <div className="ready-indicator-badge">
                    <span className="pulse-beacon" />
                    <span>Vector Grounded</span>
                  </div>
                )}
              </div>

              {/* Chat Message Scroll Window */}
              <div className="chat-scroll-arena" aria-live="polite">
                {chatLog.map((msg, index) => (
                  <ChatMessage
                    key={index}
                    message={msg}
                    timestamp={msg.timestamp}
                    sources={msg.sources}
                  />
                ))}

                {/* Shimmering Neural Thinking Bubble */}
                {isAsking && (
                  <div className="message-row assistant thinking-state">
                    <div className="message-avatar">
                      <div className="assistant-avatar-circle thinking-pulse">
                        <span className="avatar-sparkle">✦</span>
                      </div>
                    </div>
                    <div className="message-body-wrap">
                      <div className="message-header-meta">
                        <span className="sender-name">Dex • Deep Research</span>
                      </div>
                      <div className="thinking-bubble">
                        <div className="neural-radar">
                          <div className="radar-sweep" />
                        </div>
                        <div className="thinking-text-wrap">
                          <span className="thinking-shimmer">
                            Querying Qdrant vector space &amp; synthesizing citation-grounded response...
                          </span>
                          <span className="retrieval-tags">
                            <span>Top-4 Chunks</span> &bull; <span>Cosine Similarity</span> &bull; <span>Gemini 2.0</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Console Dock */}
              <div className="input-dock-container">
                <form
                  className="input-dock-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskQuestion();
                  }}
                >
                  <div className="input-wrapper">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        documentId
                          ? "Ask any question about your document... (Press Enter ↵)"
                          : "Upload a document first to start asking questions..."
                      }
                      disabled={!documentId || isAsking}
                      className="chat-textarea"
                    />

                    {/* Input Accessory tools */}
                    <div className="input-accessories">
                      {documentId && (
                        <span className="input-token-hint">
                          {question.length > 0 ? `${question.length} chars` : "Enter ↵ to send"}
                        </span>
                      )}

                      <button
                        type="submit"
                        disabled={!documentId || isAsking || !question.trim()}
                        className="send-action-btn"
                        title="Send query"
                        aria-label="Send query"
                      >
                        {isAsking ? (
                          <div className="btn-spinner" />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="dock-footnote">
                  <span>✦ Grounded AI with real-time vector citations. Zero hallucinations.</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
