import { Mic, Square, ShieldAlert, X, Settings2, Sparkles } from "lucide-react";
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
  className?: string;
}

export default function VoiceInputButton({ language, value, onChange, maxLength, describedBy, className = "" }: Props) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const copy = VOICE_INPUT_COPY[language] || VOICE_INPUT_COPY.en;

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

  const startListening = () => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setShowPermissionModal(true);
      return;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }

    const recognition = new Recognition();
    recognition.lang = SPEECH_LANGUAGE[language] || "en-US";
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
      const errKey = voiceErrorMessageKey(event.error);
      setListening(false);
      recognitionRef.current = null;
      if (errKey === "denied") {
        setShowPermissionModal(true);
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch (err) {
      recognitionRef.current = null;
      setListening(false);
      setShowPermissionModal(true);
    }
  };

  const handleMicClick = async () => {
    if (listening) {
      stop();
      return;
    }

    // Try requesting audio permission directly via getUserMedia on mobile before recognition
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks because SpeechRecognition uses the mic
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        // If user denied or error, show guidance modal
        setShowPermissionModal(true);
        return;
      }
    }

    startListening();
  };

  const requestPermissionFromModal = async () => {
    setIsRequestingPermission(true);
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setShowPermissionModal(false);
        setIsRequestingPermission(false);
        startListening();
        return;
      } catch (err) {
        // Permission was blocked in browser settings
      }
    }
    setIsRequestingPermission(false);
  };

  return (
    <>
      <div className={`relative inline-flex items-center ${className}`}>
        <button
          type="button"
          onClick={() => void handleMicClick()}
          aria-pressed={listening}
          aria-label={listening ? copy.stop : copy.start}
          title={listening ? copy.stop : copy.start}
          aria-describedby={describedBy}
          className="app-a-focus-ring relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 sm:h-10 sm:w-10"
          style={{
            backgroundColor: listening ? "rgba(255, 59, 48, 0.15)" : "var(--app-a-surface-secondary)",
            borderColor: listening ? "rgba(255, 59, 48, 0.6)" : "var(--app-a-border)",
            color: listening ? "#FF3B30" : "var(--app-a-accent)",
          }}
        >
          {listening ? (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-[#FF3B30]/30" />
              <Square className="relative z-10 h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" aria-hidden="true" />
            </>
          ) : (
            <Mic className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Apple HIG Permission & Settings Modal */}
      {showPermissionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mic-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            className="w-full max-w-[420px] rounded-3xl border p-6 shadow-2xl transition-all"
            style={{
              backgroundColor: "var(--app-a-surface)",
              borderColor: "var(--app-a-border)",
              color: "var(--app-a-text)",
            }}
          >
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#2997ff]/20 dark:text-[#2997ff]">
                  <Mic className="h-5 w-5" />
                </div>
                <h3 id="mic-modal-title" className="text-[17px] font-bold tracking-tight">
                  {copy.denied}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8E8E93] hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
              {copy.deniedDetails}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void requestPermissionFromModal()}
                disabled={isRequestingPermission}
                className="app-a-primary-button app-a-focus-ring w-full justify-center gap-2 py-3 text-[14px] font-semibold"
              >
                <Mic className="h-4 w-4" />
                {isRequestingPermission ? "..." : copy.enableMic}
              </button>
            </div>

            {/* Step-by-step phone settings guide */}
            <div className="mt-5 rounded-2xl border p-3.5 text-[12px]" style={{ borderColor: "var(--app-a-border)", backgroundColor: "var(--app-a-surface-secondary)" }}>
              <div className="flex items-center gap-1.5 font-semibold text-black dark:text-white mb-2">
                <Settings2 className="h-3.5 w-3.5 text-[#0071E3]" />
                <span>{copy.howToSettings}</span>
              </div>
              <div className="space-y-2 text-[#6E6E73] dark:text-[#AEAEB2] leading-relaxed">
                <div>
                  <strong className="text-black dark:text-white font-medium">{copy.safariGuideTitle}</strong>
                  <p className="mt-0.5 whitespace-pre-line">{copy.safariGuideText}</p>
                </div>
                <div>
                  <strong className="text-black dark:text-white font-medium">{copy.chromeGuideTitle}</strong>
                  <p className="mt-0.5">{copy.chromeGuideText}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPermissionModal(false)}
              className="mt-4 w-full py-2 text-center text-[13px] font-medium text-[#8E8E93] hover:text-black dark:hover:text-white"
            >
              {copy.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
