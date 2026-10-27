import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Browser-native voice input via the Web Speech API (Chrome, Safari, Edge).
// Fills the search box with whatever the user says — e.g. "Saliba 317".
export default function VoiceSearchButton({ onResult, disabled }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      if (text) onResult(text.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, [onResult]);

  const toggle = () => {
    if (!recRef.current || disabled) return;
    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      try {
        recRef.current.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? "Stop voice search" : "Search by voice"}
      className={cn(
        "shrink-0 h-11 w-11 rounded-xl border flex items-center justify-center transition-colors select-none",
        listening
          ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
          : "bg-card border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/40"
      )}
    >
      {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}