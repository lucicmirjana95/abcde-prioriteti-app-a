import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AppALanguage } from "../../types";
import { appendVoiceTranscript, SPEECH_LANGUAGE, VOICE_INPUT_COPY, voiceErrorMessageKey } from "./voiceInput";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0?: { transcript?: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

interface Props {
  language: AppALanguage;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  describedBy?: string;
}

export default function VoiceInputButton({ language, value, onChange, maxLength, describedBy }: Props) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [messageKey, setMessageKey] = useState<"denied" | "noSpeech" | "error" | null>(null);
  const copy = VOICE_INPUT_COPY[language];

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionConstructor()));
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const start = () => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition || listening) return;
    setMessageKey(null);
    const recognition = new Recognition();
    recognition.lang = SPEECH_LANGUAGE[language];
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) transcript += `${result[0]?.transcript ?? ""} `;
      }
      if (!transcript.trim()) return;
      const next = appendVoiceTranscript(valueRef.current, transcript, maxLength);
      valueRef.current = next;
      onChangeRef.current(next);
    };
    recognition.onerror = (event) => {
      setMessageKey(voiceErrorMessageKey(event.error));
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setMessageKey("error");
      setListening(false);
    }
  };

  if (supported === null) return null;

  return (
    <div className="flex min-w-0 flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={!supported}
        aria-pressed={listening}
        aria-label={listening ? copy.stop : copy.start}
        title={listening ? copy.stop : copy.start}
        aria-describedby={describedBy}
        className="app-a-focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor: listening ? "var(--app-a-danger-soft)" : "var(--app-a-surface-secondary)",
          borderColor: listening ? "var(--app-a-danger)" : "var(--app-a-border)",
          color: listening ? "var(--app-a-danger)" : "var(--app-a-accent)",
        }}
      >
        {listening ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
      </button>
      <p id={describedBy} className="max-w-[320px] text-right text-[12px] leading-snug empty:hidden" style={{ color: messageKey ? "var(--app-a-danger)" : "var(--app-a-text-secondary)" }} role="status" aria-live="polite">
        {listening ? copy.listening : !supported ? copy.unavailable : messageKey ? copy[messageKey] : ""}
      </p>
    </div>
  );
}
