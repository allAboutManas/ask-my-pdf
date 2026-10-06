"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { sound } from "../utils/sound";

export default function Header({ isMuted, onToggleMute, onClearChat, hasMessages }) {
  const [backendOnline, setBackendOnline] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch("http://localhost:4000/health");
        if (res.ok) {
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="brand-group">
          <div className="logo-badge-wrap">
            <div className="logo-glow" />
            <div className="logo-icon-box">
              <Image
                src="/dex-mascot.png"
                alt="Dex Mascot"
                width={38}
                height={38}
                className="logo-avatar"
              />
            </div>
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <h1 className="brand-title">DocuMind</h1>
              <span className="brand-pill">RAG Pro</span>
            </div>
            <p className="brand-subtitle">Gemini 2.0 &middot; Qdrant Neural Engine</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Live Backend Status */}
          <div
            className={`status-pill ${backendOnline ? "online" : "offline"}`}
            title={backendOnline ? "Backend active at http://localhost:4000" : "Backend unreachable"}
          >
            <span className="pulse-indicator" />
            <span className="status-text">
              {backendOnline ? "API Online :4000" : "API Offline"}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              sound.playTick();
              onToggleMute();
            }}
            className={`icon-action-btn ${isMuted ? "muted" : "active"}`}
            title={isMuted ? "Unmute UI audio effects" : "Mute audio effects"}
            aria-label="Toggle UI Sound"
          >
            {isMuted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          {/* Pipeline Info Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setShowInfoModal(true);
            }}
            className="icon-action-btn"
            title="Inspect RAG Architecture"
            aria-label="System architecture"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>

          {/* Clear Chat Button */}
          {hasMessages && (
            <button
              type="button"
              onClick={() => {
                sound.playTick();
                onClearChat();
              }}
              className="icon-action-btn danger-hover"
              title="Clear conversation history"
              aria-label="Clear chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* RAG Architecture Modal */}
      {showInfoModal && (
        <div className="modal-backdrop" onClick={() => setShowInfoModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-badge">Architecture</span>
                <h3>How DocuMind RAG Works</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowInfoModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="pipeline-steps">
                <div className="pipe-step">
                  <div className="step-num">01</div>
                  <div className="step-content">
                    <h4>Multi-Format Parser</h4>
                    <p>Extracts structured textual pages from PDF, DOCX, CSV, and XLSX using specialized native buffers.</p>
                  </div>
                </div>
                <div className="pipe-step">
                  <div className="step-num">02</div>
                  <div className="step-content">
                    <h4>Overlapping Chunker</h4>
                    <p>Splits continuous text into contextual semantic chunks (500 tokens with 100 token overlap) to preserve continuity.</p>
                  </div>
                </div>
                <div className="pipe-step">
                  <div className="step-num">03</div>
                  <div className="step-content">
                    <h4>Gemini 768d Vector Embeddings</h4>
                    <p>Generates high-dimensional vector representations capturing deep semantic relationships of each chunk.</p>
                  </div>
                </div>
                <div className="pipe-step">
                  <div className="step-num">04</div>
                  <div className="step-content">
                    <h4>Qdrant Vector Database</h4>
                    <p>Indexes points with document payload filters and performs sub-millisecond Cosine distance nearest-neighbor queries.</p>
                  </div>
                </div>
                <div className="pipe-step">
                  <div className="step-num">05</div>
                  <div className="step-content">
                    <h4>Context Augmentation & Generation</h4>
                    <p>Injects retrieved chunks with page provenance into Gemini 2.0 to formulate grounded, hallucination-free answers.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowInfoModal(false)}
              >
                Got it, let's explore!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
