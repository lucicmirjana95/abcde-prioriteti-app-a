import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

interface VoiceInputNodeProps {
  onTranscript: (text: string) => void;
  isEvening?: boolean;
  language?: "en" | "sr" | "tr";
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  inline?: boolean;
}

export default function VoiceInputNode({
  onTranscript,
  isEvening = false,
  language = "sr",
  onStartRecording,
  onStopRecording,
  inline = false,
}: VoiceInputNodeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const transcriptCallback = useRef(onTranscript);
  const startRecordingCallback = useRef(onStartRecording);
  const stopRecordingCallback = useRef(onStopRecording);

  useEffect(() => {
    transcriptCallback.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    startRecordingCallback.current = onStartRecording;
  }, [onStartRecording]);

  useEffect(() => {
    stopRecordingCallback.current = onStopRecording;
  }, [onStopRecording]);

  // Clean up recording stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setHasError(false);
      setIsRecording(true);
      audioChunksRef.current = [];

      if (startRecordingCallback.current) {
        startRecordingCallback.current();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detect supported mime-types
      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported("audio/webm")) {
          if (MediaRecorder.isTypeSupported("audio/ogg")) {
            mimeType = "audio/ogg";
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            mimeType = "audio/mp4";
          } else {
            mimeType = "audio/wav";
          }
        }
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch (mimeErr) {
        console.warn(
          "Could not create MediaRecorder with mimeType",
          mimeType,
          mimeErr,
        );
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });

          if (audioBlob.size < 100) {
            // Recording too short or empty
            setIsTranscribing(false);
            window.dispatchEvent(
              new CustomEvent("trigger-toast", {
                detail: {
                  message:
                    language === "en" ? "Recording was too short. Please speak some more! 🎙️" : language === "tr" ? "Recording was too short. Please speak some more! 🎙️" : "Snimak je previše kratak. Molimo vas da kažete nešto! 🎙️",
                  type: "warning",
                },
              }),
            );
            return;
          }

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64data = reader.result as string;
              const base64Raw = base64data.split(",")[1];

              const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audio64: base64Raw,
                  mimeType: mimeType,
                  language: language,
                }),
              });

              if (!response.ok) {
                throw new Error("Transcribe request failed");
              }

              const data = await response.json();
              const text = data.transcript || "";
              if (text && text.trim().length > 0) {
                transcriptCallback.current(text.trim() + " ");
              } else {
                window.dispatchEvent(
                  new CustomEvent("trigger-toast", {
                    detail: {
                      message:
                        language === "en" ? "We couldn't hear any words. Try speaking closer to the mic! 🎙️" : language === "tr" ? "We couldn't hear any words. Try speaking closer to the mic! 🎙️" : "Nismo uspjeli da čujemo reči. Pokušajte da pričate bliže mikrofonu! 🎙️",
                      type: "warning",
                    },
                  }),
                );
              }
            } catch (err) {
              console.error("Transcribe API Error:", err);
              setHasError(true);
              window.dispatchEvent(
                new CustomEvent("trigger-toast", {
                  detail: {
                    message:
                      language === "en" ? "Transcription service is currently busy. Let's try again! 🌐" : language === "tr" ? "Transcription service is currently busy. Let's try again! 🌐" : "Servis za transkripciju je trenutno zauzet. Pokušajmo ponovo! 🌐",
                    type: "warning",
                  },
                }),
              );
            } finally {
              setIsTranscribing(false);
            }
          };
        } catch (err) {
          console.error("Blob to base64 processing error:", err);
          setIsTranscribing(false);
          setHasError(true);
        }
      };

      mediaRecorder.start();
    } catch (err: any) {
      console.error("MediaDevices getUserMedia error:", err);
      setHasError(true);
      setIsRecording(false);
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message:
              language === "en" ? "Microphone access is blocked or unavailable in your browser. 🎤" : language === "tr" ? "Microphone access is blocked or unavailable in your browser. 🎤" : "Pristup mikrofonu je blokiran ili nedostupan u vašem pretraživaču. 🎤",
            type: "warning",
          },
        }),
      );
    }
  };

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.error("Error stopping stream tracks:", e);
      }
    }
    if (stopRecordingCallback.current) {
      stopRecordingCallback.current();
    }
  }, []);

  return (
    <>
      <div className={inline ? "relative z-10 no-zoom flex items-center shrink-0" : "absolute right-3 bottom-3 z-10 no-zoom"}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }}
          disabled={isTranscribing}
          className={`${inline ? "w-[32px] h-[32px]" : "w-11 h-11"} rounded-full transition-all flex items-center justify-center border group active:scale-95 ${
            isRecording
              ? "bg-[#FF3B30] dark:bg-[#FF453A] border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-white transition-opacity"
              : isTranscribing
                ? "bg-black/5 dark:bg-white/5 dark:bg-[#000000]/5 dark:bg-white/5 border-transparent text-[#8E8E93] cursor-not-allowed"
                : hasError
                  ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A]"
                  : isEvening
                    ? "bg-white/10 hover:bg-white/15 border-white/10 text-violet-300"
                    : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#007AFF] dark:hover:text-[#0A84FF] transition-colors duration-150"
          }`}
          title={
            isTranscribing
              ? language === "sr"
                ? "Transkribovanje..."
                : "Transcribing..."
              : isRecording
                ? language === "sr"
                  ? "Zaustavi snimanje"
                  : "Stop Recording"
                : language === "sr"
                  ? "Snimi glasom"
                  : "Record Voice"
          }
        >
          {isTranscribing ? (
            <Loader2 className={`${inline ? "w-4 h-4" : "w-5 h-5"} animate-spin`} />
          ) : isRecording ? (
            <MicOff className={inline ? "w-4 h-4" : "w-5 h-5"} />
          ) : (
            <Mic className={`${inline ? "w-4 h-4" : "w-5 h-5"} transition-transform group-active:scale-95`} />
          )}
          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3B30]/40 dark:bg-[#FF453A]/40 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF3B30] dark:bg-[#FF453A]"></span>
            </span>
          )}
        </button>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {(isRecording || isTranscribing) && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm pointer-events-auto"
              >
                <div
                  className={`p-4 rounded-2xl border flex flex-col gap-3 shadow-2xl ${
                    isEvening
                      ? "bg-[#1C1C1E]/95 border-white/10 text-white backdrop-blur-md"
                      : "bg-[#FAFAFA]/95 dark:bg-[#1C1C1E]/95 border-black/10 dark:border-white/10 text-black dark:text-white backdrop-blur-md"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1 items-center shrink-0 w-8 justify-center h-10">
                      {isRecording ? (
                        <>
                          <motion.div
                            animate={{ height: [8, 22, 8] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              ease: "easeInOut",
                            }}
                            className="w-1 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]"
                          />
                          <motion.div
                            animate={{ height: [8, 32, 8] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              ease: "easeInOut",
                              delay: 0.15,
                            }}
                            className="w-1 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]"
                          />
                          <motion.div
                            animate={{ height: [8, 16, 8] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              ease: "easeInOut",
                              delay: 0.3,
                            }}
                            className="w-1 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]"
                          />
                        </>
                      ) : (
                        <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] font-bold mb-0.5 ${
                          isTranscribing ? "text-[#007AFF]" : "text-[#FF453A]"
                        }`}
                      >
                        {isTranscribing
                          ? language === "sr"
                            ? "⏳ Transkribujem glas..."
                            : "⏳ Transcribing voice..."
                          : language === "sr"
                            ? "🔴 Slušam vaša razmišljanja..."
                            : "🔴 Listening to your thoughts..."}
                      </p>
                      <p className="text-xs sm:text-xs font-semibold truncate leading-relaxed text-[#8E8E93]">
                        {isTranscribing
                          ? language === "sr"
                            ? "Procesuiram audio uz pomoć Gemini AI..."
                            : "Processing audio with Gemini AI..."
                          : language === "sr"
                            ? "Snimanje u toku. Kliknite na dugme da završite."
                            : "Recording in progress. Click button to finish."}
                      </p>
                    </div>
                  </div>

                  {!isTranscribing && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                      <button
                        onClick={stopRecording}
                        className="px-3 py-1.5 rounded-lg bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer animate-pulse"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        {language === "sr" ? "Završi" : "Stop & Send"}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
