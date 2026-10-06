"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function MascotDex({ state = "idle", hasDocument = false, onClick, className = "" }) {
  const [speech, setSpeech] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  const [easterEggCount, setEasterEggCount] = useState(0);

  const funQuotes = [
    "I digest 500-page docs in seconds! 🚀",
    "Gemini + Qdrant = Superpowers! ⚡️",
    "Did you know cosine similarity is my favorite math? 📐",
    "Drop any PDF, DOCX, or Excel sheet right here!",
    "Ask me for summaries, tables, or specific quotes!",
    "Every chunk is embedded with precision vector coordinates! 🧭",
  ];

  // React to status changes
  useEffect(() => {
    switch (state) {
      case "dragging":
        setSpeech("Ooh, feed me that file! 📄✨");
        break;
      case "scanning":
        setSpeech("Scanning pages & indexing vectors in Qdrant... ⚡️");
        break;
      case "thinking":
        setSpeech("Searching vector space for the exact answers... 🧠");
        break;
      case "happy":
        setSpeech("Got it! Check out the answers with page citations below! ✨");
        break;
      case "error":
        setSpeech("Oops, something went sideways! Let's check that file again. ⚠️");
        break;
      case "ready":
        setSpeech("Document fully loaded! Fire away with your questions. 🔥");
        break;
      case "idle":
      default:
        if (hasDocument) {
          setSpeech("What would you like to know from this document?");
        } else {
          setSpeech("Hey! I'm Dex. Upload a document to unlock semantic search!");
        }
        break;
    }
  }, [state, hasDocument]);

  // Periodic blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4500);
    return () => clearInterval(blinkInterval);
  }, []);

  const handleClick = () => {
    const nextIdx = (easterEggCount + 1) % funQuotes.length;
    setEasterEggCount(nextIdx);
    setSpeech(funQuotes[nextIdx]);
    if (onClick) onClick();
  };

  return (
    <div className={`mascot-container ${state} ${className}`} onClick={handleClick}>
      {/* Speech Bubble */}
      <div className="mascot-speech-bubble" role="status" aria-live="polite">
        <span className="speech-sparkle">✦</span>
        <span className="speech-text">{speech}</span>
        <div className="bubble-tail" />
      </div>

      {/* Main Mascot Stage */}
      <div className="mascot-stage" title="Click Dex to chat!">
        {/* Ambient Aura Rings */}
        <div className="mascot-aura" />
        <div className="mascot-orbit-ring" />
        <div className="mascot-particles">
          <span className="p1">✦</span>
          <span className="p2">●</span>
          <span className="p3">✦</span>
          <span className="p4">▲</span>
        </div>

        {/* 3D Render Avatar with SVG Visor Hologram Overlay */}
        <div className="mascot-body-wrapper">
          <div className="mascot-3d-avatar">
            <Image
              src="/dex-mascot.png"
              alt="Dex AI Mascot"
              width={130}
              height={130}
              priority
              className="mascot-img"
            />
          </div>

          {/* Dynamic Laser & Scanner Visor Overlay */}
          {state === "scanning" && (
            <div className="visor-scan-laser">
              <div className="laser-line" />
              <div className="laser-beam" />
              <div className="scan-data-stream">0101100101</div>
            </div>
          )}

          {state === "thinking" && (
            <div className="visor-neural-spin">
              <div className="neural-ring r1" />
              <div className="neural-ring r2" />
              <div className="neural-core" />
            </div>
          )}

          {/* State badge indicator */}
          <div className={`mascot-status-pill ${state}`}>
            <span className="status-dot" />
            <span className="status-label">
              {state === "scanning"
                ? "Indexing"
                : state === "thinking"
                ? "Retrieving"
                : state === "dragging"
                ? "Drop file"
                : state === "happy"
                ? "Active"
                : hasDocument
                ? "Ready"
                : "Standby"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
