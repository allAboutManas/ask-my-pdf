"use client";

import { useState } from "react";
import Image from "next/image";
import { sound } from "../utils/sound";

// Lightweight, resilient markdown formatter without heavy external bloat
function formatMarkdown(text) {
  if (!text) return "";

  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, partIdx) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const firstLineEnd = part.indexOf("\n");
      const lang = part.slice(3, firstLineEnd > -1 ? firstLineEnd : 3).trim() || "text";
      const code = firstLineEnd > -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);

      return (
        <CodeBlock key={partIdx} language={lang} code={code} />
      );
    }

    // Process regular text line by line for lists, headings, and bold
    const lines = part.split("\n");
    return (
      <div key={partIdx} className="prose-block">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lineIdx} className="prose-empty-line" />;
          }

          // Headers
          if (trimmed.startsWith("### ")) {
            return <h4 key={lineIdx} className="prose-h3">{parseInline(trimmed.slice(4))}</h4>;
          }
          if (trimmed.startsWith("## ")) {
            return <h3 key={lineIdx} className="prose-h2">{parseInline(trimmed.slice(3))}</h3>;
          }
          if (trimmed.startsWith("# ")) {
            return <h2 key={lineIdx} className="prose-h1">{parseInline(trimmed.slice(2))}</h2>;
          }

          // Bullet list
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={lineIdx} className="prose-bullet">
                <span className="bullet-dot">✦</span>
                <span className="bullet-content">{parseInline(trimmed.slice(2))}</span>
              </div>
            );
          }

          // Numbered list
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={lineIdx} className="prose-numbered">
                <span className="number-badge">{numMatch[1]}</span>
                <span className="number-content">{parseInline(numMatch[2])}</span>
              </div>
            );
          }

          // Regular paragraph
          return (
            <p key={lineIdx} className="prose-p">
              {parseInline(line)}
            </p>
          );
        })}
      </div>
    );
  });
}

// Inline token parser for bold, italic, code
function parseInline(str) {
  if (!str) return null;

  // Split by inline code, bold, italic
  const tokens = [];
  let remaining = str;
  let keyCounter = 0;

  while (remaining.length > 0) {
    // Inline code: `code`
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // Italic: *text*
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);

    // Find the earliest match
    let earliest = null;
    let type = "";

    if (codeMatch && (earliest === null || codeMatch.index < earliest.index)) {
      earliest = codeMatch;
      type = "code";
    }
    if (boldMatch && (earliest === null || boldMatch.index < earliest.index)) {
      earliest = boldMatch;
      type = "bold";
    }
    if (italicMatch && (earliest === null || italicMatch.index < earliest.index)) {
      earliest = italicMatch;
      type = "italic";
    }

    if (!earliest) {
      tokens.push(remaining);
      break;
    }

    // Push text before match
    if (earliest.index > 0) {
      tokens.push(remaining.substring(0, earliest.index));
    }

    // Push matched element
    if (type === "code") {
      tokens.push(
        <code key={`code-${keyCounter++}`} className="inline-code">
          {earliest[1]}
        </code>
      );
    } else if (type === "bold") {
      tokens.push(
        <strong key={`bold-${keyCounter++}`} className="inline-bold">
          {earliest[1]}
        </strong>
      );
    } else if (type === "italic") {
      tokens.push(
        <em key={`italic-${keyCounter++}`} className="inline-italic">
          {earliest[1]}
        </em>
      );
    }

    remaining = remaining.substring(earliest.index + earliest[0].length);
  }

  return tokens;
}

// Interactive Code Block with 1-click Copy
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    sound.playTick();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang-tag">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="code-copy-btn"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-block-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ChatMessage({ message, timestamp, sources = [] }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = async () => {
    sound.playTick();
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text for speech
    const cleanText = message.text
      .replace(/```[\s\S]*?```/g, "Code omitted.")
      .replace(/[*#_`]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      {/* Avatar */}
      <div className="message-avatar">
        {isUser ? (
          <div className="user-avatar-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        ) : (
          <div className="assistant-avatar-circle">
            <Image
              src="/dex-mascot.png"
              alt="Dex"
              width={34}
              height={34}
              className="avatar-img"
            />
            <span className="online-indicator" />
          </div>
        )}
      </div>

      {/* Message Content Container */}
      <div className="message-body-wrap">
        <div className="message-header-meta">
          <span className="sender-name">{isUser ? "You" : "Dex • Scholar AI"}</span>
          {timestamp && <span className="message-time">{timestamp}</span>}
        </div>

        <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
          {isUser ? (
            <p className="user-text">{message.text}</p>
          ) : (
            <div className="assistant-formatted-text">
              {formatMarkdown(message.text)}
            </div>
          )}
        </div>

        {/* Source Citations & Action Tools for Assistant */}
        {!isUser && (
          <div className="message-footer-tools">
            {sources && sources.length > 0 && (
              <div className="sources-container">
                <span className="sources-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  Verified Sources:
                </span>
                <div className="sources-tags">
                  {sources.map((pageNum) => (
                    <span
                      key={pageNum}
                      className="source-chip"
                      title={`Retrieved from Page ${pageNum} via Qdrant cosine similarity`}
                    >
                      📄 Page {pageNum}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="action-buttons-group">
              <button
                type="button"
                onClick={handleCopy}
                className="tool-btn"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSpeak}
                className={`tool-btn ${isSpeaking ? "active-speech" : ""}`}
                title={isSpeaking ? "Stop reading" : "Read answer aloud"}
              >
                {isSpeaking ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                    <span>Listen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
