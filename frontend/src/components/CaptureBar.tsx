"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { transcribe, transcribeAvailable } from "@/lib/api";

interface RecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Props {
  busy: boolean;
  onSubmit: (text: string) => Promise<boolean>;
}

export default function CaptureBar({ busy, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const voiceSupported = useSyncExternalStore(
    () => () => {},
    () => getRecognitionCtor() !== null,
    () => false,
  );
  const recRef = useRef<Recognition | null>(null);
  const baseRef = useRef("");
  const [scribe, setScribe] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    let alive = true;
    transcribeAvailable().then((ok) => alive && setScribe(ok));
    return () => {
      alive = false;
      recRef.current?.stop();
      recorderRef.current?.stop();
    };
  }, []);

  async function toggleScribe() {
    if (listening) {
      recorderRef.current?.stop();
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setListening(false);
      setTranscribing(true);
      try {
        const heard = await transcribe(new Blob(chunks, { type: recorder.mimeType }));
        if (heard) setText((prev) => (prev ? `${prev.trimEnd()} ${heard}` : heard));
      } catch {
        // leave the text box untouched; the user can type instead
      } finally {
        setTranscribing(false);
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setListening(true);
  }

  function toggleVoice() {
    if (scribe) {
      void toggleScribe();
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    baseRef.current = text ? `${text.trimEnd()} ` : "";
    rec.onresult = (e) => {
      let spoken = "";
      for (let i = 0; i < e.results.length; i++) spoken += e.results[i][0].transcript;
      setText(baseRef.current + spoken);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    recRef.current?.stop();
    const ok = await onSubmit(value);
    if (ok) setText("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex items-center gap-3.5 rounded-[18px] border border-line bg-card py-2.5 pr-2.5 pl-6"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
        <path d="M4 12c4-7 12-7 16 0" stroke="#8a8273" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="15" r="2" stroke="#8a8273" strokeWidth="1.6" />
      </svg>
      <label htmlFor="capture" className="sr-only">
        Capture
      </label>
      <input
        id="capture"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a link, drop an idea, or say what you just saw..."
        className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={toggleVoice}
        disabled={(!voiceSupported && !scribe) || transcribing}
        aria-label={listening ? "Stop voice capture" : "Capture by voice"}
        title={
          transcribing
            ? "Transcribing..."
            : voiceSupported || scribe
              ? undefined
              : "Voice capture needs a browser with speech recognition, such as Chrome"
        }
        className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          listening ? "listening border-accent bg-accent" : "border-line bg-card hover:border-accent"
        }`}
      >
        {listening ? (
          <span className="size-2.5 rounded-[3px] bg-card" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="#1c1a17" strokeWidth="1.6" />
            <path d="M5 11a7 7 0 0014 0" stroke="#1c1a17" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 18v3" stroke="#1c1a17" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <button
        type="submit"
        disabled={busy || !text.trim() || transcribing || (scribe && listening)}
        aria-label="Capture"
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? (
          <span className="size-4 animate-spin rounded-full border-2 border-card/40 border-t-card" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#fbf8f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </form>
  );
}
