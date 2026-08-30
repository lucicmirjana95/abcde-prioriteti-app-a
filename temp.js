var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/components/MorningAIHub.tsx
var MorningAIHub_exports = {};
__export(MorningAIHub_exports, {
  MorningAIHub: () => MorningAIHub,
  determineCategoryForGoalOrIdea: () => determineCategoryForGoalOrIdea,
  getWeatherEmoji: () => getWeatherEmoji
});
module.exports = __toCommonJS(MorningAIHub_exports);
var import_react3 = require("react");
var import_lucide_react2 = require("lucide-react");
var import_react4 = require("motion/react");

// src/components/VoiceInputNode.tsx
var import_react = require("react");
var import_lucide_react = require("lucide-react");
var import_react_dom = require("react-dom");
var import_react2 = require("motion/react");
var import_jsx_runtime = require("react/jsx-runtime");
function VoiceInputNode({
  onTranscript,
  isEvening = false,
  language = "sr",
  onStartRecording,
  onStopRecording
}) {
  const [isRecording, setIsRecording] = (0, import_react.useState)(false);
  const [isTranscribing, setIsTranscribing] = (0, import_react.useState)(false);
  const [hasError, setHasError] = (0, import_react.useState)(false);
  const mediaRecorderRef = (0, import_react.useRef)(null);
  const audioChunksRef = (0, import_react.useRef)([]);
  const streamRef = (0, import_react.useRef)(null);
  const transcriptCallback = (0, import_react.useRef)(onTranscript);
  const startRecordingCallback = (0, import_react.useRef)(onStartRecording);
  const stopRecordingCallback = (0, import_react.useRef)(onStopRecording);
  (0, import_react.useEffect)(() => {
    transcriptCallback.current = onTranscript;
  }, [onTranscript]);
  (0, import_react.useEffect)(() => {
    startRecordingCallback.current = onStartRecording;
  }, [onStartRecording]);
  (0, import_react.useEffect)(() => {
    stopRecordingCallback.current = onStopRecording;
  }, [onStopRecording]);
  (0, import_react.useEffect)(() => {
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
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch (mimeErr) {
        console.warn(
          "Could not create MediaRecorder with mimeType",
          mimeType,
          mimeErr
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
            type: mimeType
          });
          if (audioBlob.size < 100) {
            setIsTranscribing(false);
            window.dispatchEvent(
              new CustomEvent("trigger-toast", {
                detail: {
                  message: language === "en" ? "Recording was too short. Please speak some more! \u{1F399}\uFE0F" : language === "tr" ? "Recording was too short. Please speak some more! \u{1F399}\uFE0F" : "Snimak je previ\u0161e kratak. Molimo vas da ka\u017Eete ne\u0161to! \u{1F399}\uFE0F",
                  type: "warning"
                }
              })
            );
            return;
          }
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64data = reader.result;
              const base64Raw = base64data.split(",")[1];
              const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audio64: base64Raw,
                  mimeType,
                  language
                })
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
                      message: language === "en" ? "We couldn't hear any words. Try speaking closer to the mic! \u{1F399}\uFE0F" : language === "tr" ? "We couldn't hear any words. Try speaking closer to the mic! \u{1F399}\uFE0F" : "Nismo uspjeli da \u010Dujemo re\u010Di. Poku\u0161ajte da pri\u010Date bli\u017Ee mikrofonu! \u{1F399}\uFE0F",
                      type: "warning"
                    }
                  })
                );
              }
            } catch (err) {
              console.error("Transcribe API Error:", err);
              setHasError(true);
              window.dispatchEvent(
                new CustomEvent("trigger-toast", {
                  detail: {
                    message: language === "en" ? "Transcription service is currently busy. Let's try again! \u{1F310}" : language === "tr" ? "Transcription service is currently busy. Let's try again! \u{1F310}" : "Servis za transkripciju je trenutno zauzet. Poku\u0161ajmo ponovo! \u{1F310}",
                    type: "warning"
                  }
                })
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
    } catch (err) {
      console.error("MediaDevices getUserMedia error:", err);
      setHasError(true);
      setIsRecording(false);
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: language === "en" ? "Microphone access is blocked or unavailable in your browser. \u{1F3A4}" : language === "tr" ? "Microphone access is blocked or unavailable in your browser. \u{1F3A4}" : "Pristup mikrofonu je blokiran ili nedostupan u va\u0161em pretra\u017Eiva\u010Du. \u{1F3A4}",
            type: "warning"
          }
        })
      );
    }
  };
  const stopRecording = (0, import_react.useCallback)(() => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute right-2 bottom-1.5 z-10 no-zoom", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
        },
        disabled: isTranscribing,
        className: `p-1.5 rounded-full transition-all flex items-center justify-center border group active:scale-95 ${isRecording ? "bg-[#FF3B30] dark:bg-[#FF453A] border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-white transition-opacity" : isTranscribing ? "bg-black/5 dark:bg-white/5 dark:bg-[#000000]/5 dark:bg-white/5 border-transparent text-[#8E8E93] cursor-not-allowed" : hasError ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A]" : isEvening ? "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-[#0A84FF] hover:bg-black/5 dark:bg-white/5" : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 active:opacity-70 transition-opacity duration-150 hover:text-[#007AFF] dark:text-[#0A84FF]"}`,
        title: isTranscribing ? language === "sr" ? "Transkribovanje..." : "Transcribing..." : isRecording ? language === "sr" ? "Zaustavi snimanje" : "Stop Recording" : language === "sr" ? "Snimi glasom" : "Record Voice",
        children: [
          isTranscribing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Loader2, { className: "w-3.5 h-3.5 animate-spin" }) : isRecording ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.MicOff, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Mic, { className: "w-3.5 h-3.5 transition-transform group-active:scale-95" }),
          isRecording && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "absolute -top-1 -right-1 flex h-2 w-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3B30]/40 dark:bg-[#FF453A]/40 opacity-75" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-[#FF3B30] dark:bg-[#FF453A]" })
          ] })
        ]
      }
    ) }),
    typeof document !== "undefined" && (0, import_react_dom.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.AnimatePresence, { children: (isRecording || isTranscribing) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_react2.motion.div,
        {
          initial: { y: 100, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: 100, opacity: 0 },
          className: "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm pointer-events-auto",
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: `p-4 rounded-2xl border flex flex-col gap-3 shadow-2xl ${isEvening ? "bg-[#1C1C1E]/95 border-white/10 text-white backdrop-blur-md" : "bg-[#FAFAFA]/95 dark:bg-[#1C1C1E]/95 border-black/10 dark:border-white/10 text-black dark:text-white backdrop-blur-md"}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-4", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex gap-1 items-center shrink-0 w-8 justify-center h-10", children: isRecording ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      import_react2.motion.div,
                      {
                        animate: { height: [8, 22, 8] },
                        transition: {
                          repeat: Infinity,
                          duration: 0.6,
                          ease: "easeInOut"
                        },
                        className: "w-1 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      import_react2.motion.div,
                      {
                        animate: { height: [8, 32, 8] },
                        transition: {
                          repeat: Infinity,
                          duration: 0.6,
                          ease: "easeInOut",
                          delay: 0.15
                        },
                        className: "w-1 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      import_react2.motion.div,
                      {
                        animate: { height: [8, 16, 8] },
                        transition: {
                          repeat: Infinity,
                          duration: 0.6,
                          ease: "easeInOut",
                          delay: 0.3
                        },
                        className: "w-1 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]"
                      }
                    )
                  ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Loader2, { className: "w-5 h-5 text-[#007AFF] animate-spin" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "p",
                      {
                        className: `text-[13px] font-bold mb-0.5 ${isTranscribing ? "text-[#007AFF]" : "text-[#FF453A]"}`,
                        children: isTranscribing ? language === "sr" ? "\u23F3 Transkribujem glas..." : "\u23F3 Transcribing voice..." : language === "sr" ? "\u{1F534} Slu\u0161am va\u0161a razmi\u0161ljanja..." : "\u{1F534} Listening to your thoughts..."
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs sm:text-xs font-semibold truncate leading-relaxed text-[#8E8E93]", children: isTranscribing ? language === "sr" ? "Procesuiram audio uz pomo\u0107 Gemini AI..." : "Processing audio with Gemini AI..." : language === "sr" ? "Snimanje u toku. Kliknite na dugme da zavr\u0161ite." : "Recording in progress. Click button to finish." })
                  ] })
                ] }),
                !isTranscribing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "button",
                  {
                    onClick: stopRecording,
                    className: "px-3 py-1.5 rounded-lg bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer animate-pulse",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Square, { className: "w-3 h-3 fill-current" }),
                      language === "sr" ? "Zavr\u0161i" : "Stop & Send"
                    ]
                  }
                ) })
              ]
            }
          )
        }
      ) }),
      document.body
    )
  ] });
}

// src/components/MorningAIHub.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var getWeatherEmoji = (weatherStr) => {
  if (!weatherStr) return "\u2600\uFE0F";
  if (weatherStr.includes("\u26C8\uFE0F") || weatherStr.includes("\u26A1") || weatherStr.includes("\u{1F327}\uFE0F"))
    return "\u26C8\uFE0F";
  if (weatherStr.includes("\u{1F32B}\uFE0F") || weatherStr.includes("\u{1F4A8}") || weatherStr.includes("\u2601\uFE0F"))
    return "\u{1F32B}\uFE0F";
  if (weatherStr.includes("\u{1F343}") || weatherStr.includes("\u{1F33F}") || weatherStr.includes("\u{1F331}"))
    return "\u{1F343}";
  if (weatherStr.includes("\u2600\uFE0F") || weatherStr.includes("\u{1F324}\uFE0F") || weatherStr.includes("\u{1F506}"))
    return "\u2600\uFE0F";
  const lower = weatherStr.toLowerCase();
  if (lower.includes("storm") || lower.includes("oluja") || lower.includes("grmljav") || lower.includes("preplavlj") || lower.includes("overload")) {
    return "\u26C8\uFE0F";
  }
  if (lower.includes("fog") || lower.includes("magla") || lower.includes("drained") || lower.includes("umor") || lower.includes("iscrp")) {
    return "\u{1F32B}\uFE0F";
  }
  if (lower.includes("clear") || lower.includes("sky") || lower.includes("vedro") || lower.includes("balanced") || lower.includes("balans") || lower.includes("smir")) {
    return "\u{1F343}";
  }
  return "\u2600\uFE0F";
};
var DEFAULT_HISTORY_TEMPLATE = [
  {
    date: "2026-06-04",
    state: "FOCUSED",
    weather: "\u2600\uFE0F Sunshine",
    emotion: "Motivated",
    theme: "Work"
  },
  {
    date: "2026-06-05",
    state: "BALANCED",
    weather: "\u{1F343} Clear Sky",
    emotion: "Calm",
    theme: "Growth"
  },
  {
    date: "2026-06-06",
    state: "OVERLOADED",
    weather: "\u26C8\uFE0F Storm",
    emotion: "Pressured",
    theme: "Work"
  },
  {
    date: "2026-06-07",
    state: "DRAINED",
    weather: "\u{1F32B}\uFE0F Fog",
    emotion: "Tired",
    theme: "Recovery"
  },
  {
    date: "2026-06-08",
    state: "DRAINED",
    weather: "\u{1F32B}\uFE0F Fog",
    emotion: "Overwhelmed",
    theme: "Work"
  },
  {
    date: "2026-06-09",
    state: "BALANCED",
    weather: "\u{1F343} Clear Sky",
    emotion: "Rested",
    theme: "Relationships"
  }
];
function determineCategoryForGoalOrIdea(text, isGoal) {
  if (!text || text.trim().length < 4) return null;
  const lower = text.toLowerCase().trim();
  const abstractPhrases = [
    "life is beautiful",
    "general concept",
    "philosophy",
    "theory",
    "thinking",
    "thoughts",
    "feeling happy",
    "feeling tired",
    "misao dana",
    "filozofiranje",
    "zivot",
    "teorija",
    "lep dan",
    "sre\u0107a",
    "sreca",
    "mir",
    "razmi\u0161ljanje",
    "razmisljanje",
    "ljubav",
    "harmonija"
  ];
  if (abstractPhrases.some((p) => lower === p || lower.includes(p) && lower.split(" ").length < 4)) {
    return null;
  }
  const dKeywords = [
    "wait",
    "waiting",
    "delegate",
    "dependency",
    "ask",
    "reply",
    "response",
    "feedback from",
    "other person",
    "colleague",
    "contact",
    "partner",
    "someone",
    "meeting with",
    "\u010Dekaj",
    "\u010Dekam",
    "cekam",
    "delegirano",
    "pitaj",
    "odgovor",
    "zavisno",
    "od drugog",
    "saradnik",
    "poslao",
    "druga osoba",
    "sastanak sa",
    "proveri sa"
  ];
  if (dKeywords.some((w) => lower.includes(w))) {
    return "D";
  }
  const eKeywords = [
    "later",
    "next week",
    "next month",
    "postpone",
    "future",
    "backlog",
    "not today",
    "some day",
    "someday",
    "elimini\u0161i",
    "next year",
    "sometime",
    "kasnije",
    "slede\u0107e nedelje",
    "sledec",
    "odlo\u017Ei",
    "odlozi",
    "budu\u0107nost",
    "buducnost",
    "drugi put",
    "ne danas",
    "nekad",
    "slede\u0107e godine",
    "arhiviraj",
    "izbri\u0161i"
  ];
  if (eKeywords.some((w) => lower.includes(w))) {
    return "E";
  }
  const aKeywords = [
    "must",
    "priority",
    "urgent",
    "critical",
    "deadline",
    "today",
    "now",
    "finish",
    "resolve",
    "complete",
    "submit",
    "pay",
    "important",
    "hit",
    "deliver",
    "crucial",
    "asap",
    "invoice",
    "payment",
    "mora",
    "prioritet",
    "hitno",
    "urgentno",
    "danas",
    "odmah",
    "zavr\u0161i",
    "zavrsi",
    "re\u0161i",
    "resi",
    "isplati",
    "plati",
    "klju\u010Dno",
    "kljucno",
    "bilo kako",
    "glavno",
    "obavezno",
    "rok",
    "zavr\u0161iti",
    "resiti",
    "pla\u0107anje"
  ];
  if (aKeywords.some((w) => lower.includes(w))) {
    return "A";
  }
  const bKeywords = [
    "plan",
    "design",
    "learn",
    "study",
    "prepare",
    "exercise",
    "analyze",
    "strategy",
    "focus",
    "health",
    "workout",
    "reading",
    "book",
    "course",
    "build",
    "develop",
    "optimize",
    "structure",
    "meditate",
    "habit",
    "schedule",
    "planiraj",
    "dizajn",
    "u\u010Di",
    "uci",
    "pripremi",
    "istra\u017E",
    "istraz",
    "ve\u017Ebaj",
    "vezbaj",
    "analiziraj",
    "strategija",
    "zdravlje",
    "trening",
    "\u010Ditaj",
    "citaj",
    "knjiga",
    "kurs",
    "razvijaj",
    "napravi",
    "organizuj",
    "meditacija",
    "navika",
    "struktura"
  ];
  if (bKeywords.some((w) => lower.includes(w))) {
    return "B";
  }
  const cKeywords = [
    "idea",
    "maybe",
    "try",
    "explore",
    "seed",
    "cool",
    "interesting",
    "nice to have",
    "concept",
    "inspiration",
    "brainstorm",
    "wish",
    "dream",
    "perhaps",
    "ideja",
    "mo\u017Eda",
    "mozda",
    "probaj",
    "istra\u017Euj",
    "istrazuj",
    "seme",
    "zanimljivo",
    "fino",
    "koncept",
    "inspiracija",
    "kreativno",
    "\u017Eelja",
    "zelja",
    "sanjaj",
    "podkast",
    "gledaj",
    "sme\u0161no"
  ];
  if (cKeywords.some((w) => lower.includes(w))) {
    return "C";
  }
  const actionVerbs = [
    "do",
    "make",
    "create",
    "write",
    "call",
    "send",
    "buy",
    "get",
    "go",
    "meet",
    "talk",
    "check",
    "verify",
    "test",
    "run",
    "clean",
    "fix",
    "start",
    "uradi",
    "napravi",
    "kreiraj",
    "pi\u0161i",
    "pisi",
    "pozovi",
    "po\u0161alji",
    "posalji",
    "kupi",
    "nabavi",
    "idi",
    "sretni",
    "pri\u010Daj",
    "pricaj",
    "proveri",
    "testiraj",
    "pokreni",
    "o\u010Disti",
    "ocisti",
    "popravi",
    "po\u010Dni",
    "pocni"
  ];
  if (actionVerbs.some((v) => lower.includes(v))) {
    return isGoal ? "B" : "C";
  }
  const taskNouns = [
    "sajt",
    "web",
    "aplikacij",
    "app",
    "projekat",
    "project",
    "knjig",
    "book",
    "ispit",
    "exam",
    "test",
    "domaci",
    "homework",
    "izvestaj",
    "izve\u0161taj",
    "report",
    "mejl",
    "email",
    "poruk",
    "msg",
    "prezentacij",
    "presentation",
    "clanak",
    "\u010Dlanak",
    "post",
    "video",
    "epizod",
    "sastanak",
    "meeting",
    "poziv",
    "call",
    "racun",
    "ra\u010Dun",
    "invoice",
    "kartu",
    "ticket",
    "dokument",
    "document",
    "analiz",
    "analysis"
  ];
  if (taskNouns.some((n) => lower.includes(n))) {
    return isGoal ? "B" : "C";
  }
  return null;
}
function MorningAIHub({
  language,
  tasks,
  onAddTask,
  onAddMultipleTasks,
  onNavigateToTab,
  isEvening = false
}) {
  const isEn = language === "en";
  const [showFramework, setShowFramework] = (0, import_react3.useState)(false);
  const [userName, setUserName] = (0, import_react3.useState)(() => {
    return safeStorage.getItem("kaizen_morning_username") || "Mirjana";
  });
  const [isEditingName, setIsEditingName] = (0, import_react3.useState)(false);
  const [selectedMindMapItem, setSelectedMindMapItem] = (0, import_react3.useState)(null);
  const [selectedTheme, setSelectedTheme] = (0, import_react3.useState)("board");
  const [customTheme, setCustomTheme] = (0, import_react3.useState)("");
  const [brainDumpText, setBrainDumpText] = (0, import_react3.useState)("");
  const [energyRating, setEnergyRating] = (0, import_react3.useState)(0);
  const [pleasureRating, setPleasureRating] = (0, import_react3.useState)(0);
  const [hasInteractedEnergy, setHasInteractedEnergy] = (0, import_react3.useState)(false);
  const [hasInteractedPleasure, setHasInteractedPleasure] = (0, import_react3.useState)(false);
  const [moodConfirmed, setMoodConfirmed] = (0, import_react3.useState)(false);
  const [showMoodMatrix, setShowMoodMatrix] = (0, import_react3.useState)(false);
  const getDynamicEmotionGroup = (energy, pleasure) => {
    if (energy >= 0 && pleasure >= 0) {
      return {
        quadrant: "YELLOW / GOLD",
        title: isEn ? "\u{1F929} High Energy + High Pleasantness (Active Positive)" : language === "tr" ? "\u{1F929} Y\xFCksek Enerji + Y\xFCksek Ho\u015Fluk (Aktif Pozitif)" : "\u{1F929} Visoka energija + Visoka prijatnost (Aktivna pozitivna stanja)",
        emotions: isEn ? [
          "Excitement",
          "Joy",
          "Enthusiasm",
          "Inspiration",
          "Motivation",
          "Pride",
          "Thrilled",
          "Euphoria",
          "Love",
          "Passion"
        ] : language === "tr" ? [
          "Heyecan",
          "Ne\u015Fe",
          "Co\u015Fku",
          "\u0130lham",
          "Motivasyon",
          "Gurur",
          "Heyecanl\u0131",
          "\xD6fori",
          "A\u015Fk",
          "Tutku"
        ] : [
          "Odu\u0161evljenje",
          "Radost",
          "Entuzijazam",
          "Inspiracija",
          "Motivisanost",
          "Ponos",
          "Uzbu\u0111enje",
          "Euforija",
          "Zaljubljenost",
          "Strast"
        ],
        color: "text-[#FF9500] bg-[#FF9500] dark:bg-[#FF9F0A]/10 dark:bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-[#FF9500] dark:border-[#FF9F0A]/25 dark:border-[#FF9500]/20 dark:border-[#FF9F0A]/20",
        indicator: "\u{1F929}"
      };
    } else if (energy < 0 && pleasure >= 0) {
      return {
        quadrant: "GREEN / SAGE",
        title: isEn ? "\u{1F60C} Low Energy + High Pleasantness (Calm Positive)" : language === "tr" ? "\u{1F60C} D\xFC\u015F\xFCk Enerji + Y\xFCksek Ho\u015Fluk (Sakin Pozitif)" : "\u{1F60C} Niska energija + Visoka prijatnost (Mirna pozitivna stanja)",
        emotions: isEn ? [
          "Calmness",
          "Satisfaction",
          "Serenity",
          "Relaxed",
          "Gratitude",
          "Safety",
          "Acceptance",
          "Peace",
          "Quiet Happiness",
          "Comfort"
        ] : language === "tr" ? [
          "Sakinlik",
          "Memnuniyet",
          "Huzur",
          "Rahatlam\u0131\u015F",
          "\u015E\xFCkran",
          "G\xFCvenlik",
          "Kabullenme",
          "Bar\u0131\u015F",
          "Sessiz Mutluluk",
          "Konfor"
        ] : [
          "Smirenost",
          "Zadovoljstvo",
          "Spokoj",
          "Opu\u0161tenost",
          "Zahvalnost",
          "Sigurnost",
          "Prihvatanje",
          "Mir",
          "Sre\u0107a (tiha)",
          "Udobnost"
        ],
        color: "text-[#34C759] bg-[#34C759] dark:bg-[#30D158]/10 dark:bg-[#34C759]/10 dark:bg-[#30D158]/10 border-[#34C759] dark:border-[#30D158]/25 dark:border-[#34C759]/20 dark:border-[#30D158]/20",
        indicator: "\u{1F60C}"
      };
    } else if (energy >= 0 && pleasure < 0) {
      return {
        quadrant: "RED / AMBER",
        title: isEn ? "\u{1F621} High Energy + Low Pleasantness (Active Negative)" : language === "tr" ? "\u{1F621} Y\xFCksek Enerji + D\xFC\u015F\xFCk Ho\u015Fluk (Aktif Negatif)" : "\u{1F621} Visoka energija + Niska prijatnost (Aktivna negativna stanja)",
        emotions: isEn ? [
          "Anger",
          "Frustration",
          "Anxiety",
          "Panic",
          "Fear",
          "Jealousy",
          "Resentment",
          "Tension",
          "Overwhelmed",
          "Hatred"
        ] : language === "tr" ? [
          "\xD6fke",
          "Hayal K\u0131r\u0131kl\u0131\u011F\u0131",
          "Anksiyete",
          "Panik",
          "Korku",
          "K\u0131skan\xE7l\u0131k",
          "Darg\u0131nl\u0131k",
          "Gerginlik",
          "Bunalm\u0131\u015F",
          "Nefret"
        ] : [
          "Bes",
          "Frustracija",
          "Anksioznost",
          "Panika",
          "Strah",
          "Ljubomora",
          "Ogor\u010Denost",
          "Napetost",
          "Preplavljenost",
          "Mr\u017Enja"
        ],
        color: "text-[#FF3B30] bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 dark:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30] dark:border-[#FF453A]/25 dark:border-[#FF3B30]/20 dark:border-[#FF453A]/20",
        indicator: "\u{1F621}"
      };
    } else {
      return {
        quadrant: "BLUE / INDIGO",
        title: isEn ? "\u{1F614} Low Energy + Low Pleasantness (Withdrawn Negative)" : language === "tr" ? "\u{1F614} D\xFC\u015F\xFCk Enerji + D\xFC\u015F\xFCk Ho\u015Fluk (Negatifin Geri \xC7ekilmesi)" : "\u{1F614} Niska energija + Niska prijatnost (Povu\u010Dena negativna stanja)",
        emotions: isEn ? [
          "Sadness",
          "Depression",
          "Apathy",
          "Loneliness",
          "Emptiness",
          "Disappointment",
          "Guilt",
          "Shame",
          "Despair",
          "Resignation"
        ] : language === "tr" ? [
          "\xDCz\xFCnt\xFC",
          "Depresyon",
          "Apati",
          "Yaln\u0131zl\u0131k",
          "Bo\u015Fluk",
          "Hayal K\u0131r\u0131kl\u0131\u011F\u0131",
          "Su\xE7luluk",
          "Utan\xE7",
          "Umutsuzluk",
          "Boyun E\u011Fme"
        ] : [
          "Tuga",
          "Depresivnost",
          "Bezvoljnost",
          "Usamljenost",
          "Ose\u0107aj praznine",
          "Razo\u010Daranje",
          "Krivica",
          "Stid",
          "O\u010Daj",
          "Rezignacija"
        ],
        color: "text-[#007AFF] bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20 border-black/5 dark:border-white/5",
        indicator: "\u{1F614}"
      };
    }
  };
  const [isAnalyzing, setIsAnalyzing] = (0, import_react3.useState)(false);
  const [loadingProgress, setLoadingProgress] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => {
    let interval;
    if (isAnalyzing) {
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 1;
        });
      }, 120);
    } else {
      setLoadingProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);
  const [animationStatus, setAnimationStatus] = (0, import_react3.useState)("idle");
  const [analysisError, setAnalysisError] = (0, import_react3.useState)(null);
  const triggerHaptics = (type) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        switch (type) {
          case "light":
            navigator.vibrate(10);
            break;
          case "medium":
            navigator.vibrate(30);
            break;
          case "heavy":
            navigator.vibrate(60);
            break;
          case "success":
            navigator.vibrate([30, 50, 30]);
            break;
          case "warning":
            navigator.vibrate([40, 60, 40]);
            break;
          case "error":
            navigator.vibrate([60, 100, 60, 100]);
            break;
        }
      } catch (e) {
        console.warn("Haptics blocked inside iframe", e);
      }
    }
  };
  const [followUpQuestion, setFollowUpQuestion] = (0, import_react3.useState)(null);
  const [expandedContent, setExpandedContent] = (0, import_react3.useState)(null);
  const [viewMode, setViewMode] = (0, import_react3.useState)(() => {
    return safeStorage.getItem("morning_hub_layout_v2") || "slides";
  });
  const modulesScrollRef = (0, import_react3.useRef)(null);
  const [isRecording, setIsRecording] = (0, import_react3.useState)(false);
  const [recognition, setRecognition] = (0, import_react3.useState)(null);
  const [parsedData, setParsedData] = (0, import_react3.useState)(() => {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const saved = safeStorage.getItem(`kaizen_morning_reset_data_${todayStr}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [step, setStep] = (0, import_react3.useState)(() => {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const saved = safeStorage.getItem(`kaizen_morning_reset_data_${todayStr}`);
    return saved ? 5 : 1;
  });
  const [localPriorityOverrides, setLocalPriorityOverrides] = (0, import_react3.useState)({});
  (0, import_react3.useEffect)(() => {
    if (parsedData) {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dataToSave = {
        ...parsedData,
        selectedEmotion,
        confirmedDrivers,
        isTasksSynced,
        isGoalsSynced,
        isIdeasSynced,
        syncedGoals: Array.from(syncedGoals),
        syncedIdeas: Array.from(syncedIdeas),
        selectedTheme
      };
      safeStorage.setItem(`kaizen_morning_reset_data_${todayStr}`, JSON.stringify(dataToSave));
    }
  }, [parsedData, selectedEmotion, confirmedDrivers, isTasksSynced, isGoalsSynced, isIdeasSynced, syncedGoals, syncedIdeas, selectedTheme]);
  const [morningVaultExpanded, setMorningVaultExpanded] = (0, import_react3.useState)(false);
  const [copiedDumpId, setCopiedDumpId] = (0, import_react3.useState)("");
  const [selectedMorningView, setSelectedMorningView] = (0, import_react3.useState)("bento");
  const [mindMapViewStyle, setMindMapViewStyle] = (0, import_react3.useState)(
    "graph"
  );
  const [selectedMindMapNode, setSelectedMindMapNode] = (0, import_react3.useState)(null);
  const [activeMindMapCluster, setActiveMindMapCluster] = (0, import_react3.useState)("all");
  const [mindMapInput, setMindMapInput] = (0, import_react3.useState)("");
  const [vaultOpen, setVaultOpen] = (0, import_react3.useState)(false);
  const [vaultSearch, setVaultSearch] = (0, import_react3.useState)("");
  const [vaultFilter, setVaultFilter] = (0, import_react3.useState)("all");
  const isDimmed = (cluster) => {
    return activeMindMapCluster !== "all" && activeMindMapCluster !== cluster;
  };
  const truncateLabel = (text) => {
    if (!text) return "";
    if (text.length <= 16) return text;
    return text.substring(0, 14) + "...";
  };
  const [reframeLoading, setReframeLoading] = (0, import_react3.useState)(false);
  const [reframeResult, setReframeResult] = (0, import_react3.useState)(null);
  const handleSophiaReframe = async (worryText) => {
    if (!worryText || reframeLoading) return;
    setReframeLoading(true);
    setReframeResult(null);
    if (typeof window !== "undefined" && window.triggerHaptics) {
      window.triggerHaptics("medium");
    }
    try {
      const prompt = isEn ? `As Dr. Sophia Naumann, a clinical psychotherapist specializing in stress, perfectionism, and anxiety regulation, perform an instant, deeply empathetic, highly transformative CBT/REBT reframe for the following morning worry. Speak to me with deep reassurance, validate my feeling, but break down why this is a natural protective response, and offer a concrete, empowering, rational new lens. Worry: "${worryText}"` : language === "tr" ? `Stres, m\xFCkemmeliyet\xE7ilik ve kayg\u0131y\u0131 d\xFCzenleme konusunda uzmanla\u015Fm\u0131\u015F bir klinik psikoterapist olan Dr. Sophia Naumann, ertesi sabah endi\u015Fesi i\xE7in an\u0131nda, derinlemesine empatiye sahip, son derece d\xF6n\xFC\u015Ft\xFCr\xFCc\xFC bir BDT/REBT yeniden \xE7er\xE7eveleme ger\xE7ekle\u015Ftiriyor. Benimle derin bir g\xFCvenceyle konu\u015Fun, duygular\u0131m\u0131 do\u011Frulay\u0131n, ancak bunun neden do\u011Fal bir koruyucu tepki oldu\u011Funu a\xE7\u0131klay\u0131n ve somut, g\xFC\xE7lendirici, rasyonel yeni bir bak\u0131\u015F a\xE7\u0131s\u0131 sunun. Endi\u015Fe: "${worryText}"` : `Kao Dr. Sophia Naumann, klini\u010Dki psihoterapeut i ekspert za stres i perfekcionizam, uradi instant, duboko saose\u0107ajnu i transformativnu CBT/REBT kognitivnu reframe (preokret) za slede\u0107u jutarnju brigu. Govori toplo, potvrdi moje ose\u0107anje, ali mi objasni za\u0161to je to bezazlena za\u0161titna reakcija mog uma i ponudi mi mo\u0107nu racionalnu alternativu. Briga: "${worryText}"`;
      const response = await fetch(
        window.location.origin + "/api/advisor-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advisorId: "sofija",
            message: prompt,
            language
          })
        }
      );
      if (!response.ok) throw new Error("Network issue during reframe.");
      const resultData = await response.json();
      setReframeResult(resultData.response);
      if (typeof window !== "undefined" && window.triggerHaptics) {
        window.triggerHaptics("success");
      }
    } catch (err) {
      console.error("Reframe error:", err);
      setReframeResult(
        isEn ? "Sophia had trouble connecting. Take a long, deep breath: Your thoughts are just protective filters, you are safe." : language === "tr" ? "Sophia ba\u011Flanmada sorun ya\u015Fad\u0131. Uzun, derin bir nefes al\u0131n: D\xFC\u015F\xFCnceleriniz sadece koruyucu filtrelerdir, g\xFCvendesiniz." : "Nisam uspela da se pove\u017Eem sa psihoterapeutom. Udahni duboko: tvoje misli su samo stari filteri za\u0161tite, u potpunosti si bezbedan/na."
      );
      if (typeof window !== "undefined" && window.triggerHaptics) {
        window.triggerHaptics("error");
      }
    } finally {
      setReframeLoading(false);
    }
  };
  const renderFormattedBiohack = (text) => {
    if (!text) return null;
    const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "block space-y-2 text-left text-[12.5px] sm:text-[13px] text-black dark:text-[#EBEBF5]/60", children: paragraphs.map((para, idx) => {
      const isList = para.trim().startsWith("-") || para.trim().startsWith("\u2022") || /^\d+\./.test(para.trim());
      const parts = para.split(/(\*\*[^*]+\*\*)/g);
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "span",
        {
          className: `block leading-relaxed ${isList ? "pl-3 relative before:content-['\u2022'] before:absolute before:left-0 before:text-[#007AFF] before:font-bold" : ""}`,
          children: parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              const rawText = part.slice(2, -2);
              return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "strong",
                {
                  className: "font-bold text-[#007AFF] dark:text-[#0A84FF] mx-0.5",
                  children: rawText
                },
                pIdx
              );
            }
            return part;
          })
        },
        idx
      );
    }) });
  };
  const [selectedEmotion, setSelectedEmotion] = (0, import_react3.useState)("");
  const [confirmedDrivers, setConfirmedDrivers] = (0, import_react3.useState)([]);
  const [isTasksSynced, setIsTasksSynced] = (0, import_react3.useState)(false);
  const [isGoalsSynced, setIsGoalsSynced] = (0, import_react3.useState)(false);
  const [isIdeasSynced, setIsIdeasSynced] = (0, import_react3.useState)(false);
  const [syncedGoals, setSyncedGoals] = (0, import_react3.useState)(/* @__PURE__ */ new Set());
  const [syncedIdeas, setSyncedIdeas] = (0, import_react3.useState)(/* @__PURE__ */ new Set());
  const [actionFeedback, setActionFeedback] = (0, import_react3.useState)(() => {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const saved = safeStorage.getItem(`abcde_morning_actions_feedback_${today}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const updateActionFeedback = (key, value) => {
    setActionFeedback((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        safeStorage.setItem(`abcde_morning_actions_feedback_${today}`, JSON.stringify(updated));
      } catch (e) {
      }
      return updated;
    });
  };
  const handleDecomposeGoal = (goalText, id) => {
    let VisionInbox = [];
    try {
      const saved = safeStorage.getItem("abcde_vchamber_inbox");
      if (saved) VisionInbox = JSON.parse(saved);
    } catch (e) {
    }
    if (!VisionInbox.includes(goalText)) {
      VisionInbox.unshift(goalText);
      safeStorage.setItem("abcde_vchamber_inbox", JSON.stringify(VisionInbox));
    }
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn ? "Sent to Vision Chamber \u2713" : language === "tr" ? "G\xF6r\xFC\u015F Odas\u0131na G\xF6nderildi \u2713" : "Poslato u Strate\u0161ku Sobu \u2713";
    updateActionFeedback(goalText, msg);
    updateActionFeedback(id, msg);
  };
  const handleAddGoalAsTask = (goalText, id, category) => {
    if (syncedGoals.has(goalText)) return;
    onAddTask(
      (isEn ? "Goal: " : language === "tr" ? "Hedef: " : "Cilj: ") + goalText,
      goalText,
      category
    );
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn ? `Added to ABCDE Board (${category}) \u2713` : language === "tr" ? `ABCDE Board'a eklendi (${category}) \u2713` : `Dodato na ABCDE Tablu (${category}) \u2713`;
    updateActionFeedback(goalText, msg);
    updateActionFeedback(id, msg);
    setSyncedGoals((prev) => {
      const next = new Set(prev);
      next.add(goalText);
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const saved = safeStorage.getItem(`kaizen_morning_reset_data_${todayStr}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          data.syncedGoals = Array.from(next);
          safeStorage.setItem(`kaizen_morning_reset_data_${todayStr}`, JSON.stringify(data));
        } catch (e) {
        }
      }
      return next;
    });
    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };
  const handleReframeWorry = (worryText, id) => {
    let pending = [];
    try {
      const stored = safeStorage.getItem("abcde_pending_mindset_thoughts");
      if (stored) pending = JSON.parse(stored);
    } catch (e) {
    }
    pending.push(worryText);
    safeStorage.setItem(
      "abcde_pending_mindset_thoughts",
      JSON.stringify(pending)
    );
    let pendingTab = "Protocol";
    const wLower = String(worryText || "").toLowerCase();
    if (wLower.includes("uverenje") || wLower.includes("ne mogu") || wLower.includes("moram") || wLower.includes("uvek") || wLower.includes("nikad") || wLower.includes("strah") || wLower.includes("panik") || wLower.includes("katastrof") || wLower.includes("u\u017Eas")) {
      pendingTab = "rebt";
    } else if (wLower.includes("umor") || wLower.includes("iscrpljen") || wLower.includes("spavanje") || wLower.includes("energij") || wLower.includes("fokus") || wLower.includes("dopamin") || wLower.includes("mozak") || wLower.includes("telo") || wLower.includes("bol") || wLower.includes("zdravlj")) {
      pendingTab = "biohack";
    } else if (wLower.includes("dete") || wLower.includes("krivica") || wLower.includes("drugi ljudi") || wLower.includes("\u017Ertv") || wLower.includes("rekao") || wLower.includes("ljut") || wLower.includes("\u0161ef") || wLower.includes("koleg") || wLower.includes("roditelj") || wLower.includes("odnos") || wLower.includes("komunikacij")) {
      pendingTab = "ta";
    } else {
      pendingTab = "Protocol";
    }
    safeStorage.setItem("abcde_pending_mindset_tab", pendingTab);
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn ? "Sent to Cognitive Coach \u2713" : language === "tr" ? "Bili\u015Fsel Ko\xE7'a g\xF6nderildi \u2713" : "Poslato u Kognitivni Trener \u2713";
    updateActionFeedback(worryText, msg);
    updateActionFeedback(id, msg);
    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };
  const handleTrackWorry = (worryText, id) => {
    onAddTask(
      isEn ? `Resolve concern: ${worryText}` : language === "tr" ? `Endi\u015Feyi giderin: ${worryText}` : `Re\u0161i zabrinutost: ${worryText}`,
      isEn ? "Worry/anxiety identified in morning session. Design a buffer or protective measure." : language === "tr" ? "Sabah oturumunda belirlenen endi\u015Fe/endi\u015Fe. Bir tampon veya koruyucu \xF6nlem tasarlay\u0131n." : "Briga identifikovana u jutarnjoj analizi. Osmisliti za\u0161titne korake.",
      "B"
    );
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn ? "Added to ABCDE (B) \u2713" : language === "tr" ? "ABCDE'ye eklendi (B) \u2713" : "Dodato u ABCDE (B) \u2713";
    updateActionFeedback(worryText, msg);
    updateActionFeedback(id, msg);
    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };
  const handleDiscardWorry = (worryText, id) => {
    const msg = isEn ? "Mentally Released \u{1F32C}\uFE0F" : language === "tr" ? "Zihinsel Rahatlama \u{1F32C}\uFE0F" : "Mentalno Otpu\u0161teno \u{1F32C}\uFE0F";
    updateActionFeedback(worryText, msg);
    updateActionFeedback(id, msg);
    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: isEn ? "You've chosen to let this worry go." : language === "tr" ? "Bu endi\u015Feyi b\u0131rakmay\u0131 se\xE7tin." : "Odlu\u010Dili ste da otpustite ovu brigu.",
          type: "success"
        }
      })
    );
    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 600);
  };
  const handleSaveIdea = (ideaText, id, category) => {
    if (syncedIdeas.has(ideaText)) return;
    onAddTask(
      (isEn ? "Idea: " : language === "tr" ? "Fikir: " : "Ideja: ") + ideaText,
      ideaText,
      category
    );
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn ? `Saved to ABCDE Board (${category}) \u2713` : language === "tr" ? `ABCDE Board'a (${category}) kaydedildi \u2713` : `Sa\u010Duvano na ABCDE Tabli (${category}) \u2713`;
    updateActionFeedback(ideaText, msg);
    updateActionFeedback(id, msg);
    setSyncedIdeas((prev) => {
      const next = new Set(prev);
      next.add(ideaText);
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const saved = safeStorage.getItem(`kaizen_morning_reset_data_${todayStr}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          data.syncedIdeas = Array.from(next);
          safeStorage.setItem(`kaizen_morning_reset_data_${todayStr}`, JSON.stringify(data));
        } catch (e) {
        }
      }
      return next;
    });
    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 1500);
  };
  const handleElaborateIdea = (ideaText, id) => {
    let VisionInbox = [];
    try {
      const saved = safeStorage.getItem("abcde_vchamber_inbox");
      if (saved) VisionInbox = JSON.parse(saved);
    } catch (e) {
    }
    if (!VisionInbox.includes(ideaText)) {
      VisionInbox.unshift(ideaText);
      safeStorage.setItem("abcde_vchamber_inbox", JSON.stringify(VisionInbox));
    }
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn ? "Sent to Vision Chamber \u2713" : language === "tr" ? "G\xF6r\xFC\u015F Odas\u0131na G\xF6nderildi \u2713" : "Poslato u Strate\u0161ku Sobu \u2713";
    updateActionFeedback(ideaText, msg);
    updateActionFeedback(id, msg);
    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };
  const handleTrackWaiting = (waitingText, id) => {
    onAddTask(
      isEn ? `Follow up on: ${waitingText}` : language === "tr" ? `Takip: ${waitingText}` : `Uradi follow-up za: ${waitingText}`,
      isEn ? "Dependency (waiting for another person to deliver or complete)" : language === "tr" ? "Ba\u011F\u0131ml\u0131l\u0131k (ba\u015Fka bir ki\u015Finin teslim etmesini veya tamamlamas\u0131n\u0131 beklemek)" : "Zavisnost (\u010Dekanje da druga osoba zavr\u0161i ili isporu\u010Di)",
      "D"
    );
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn ? "Tracked in ABCDE (D) \u2713" : language === "tr" ? "ABCDE'de izleniyor (D) \u2713" : "Prati se u ABCDE (D) \u2713";
    updateActionFeedback(waitingText, msg);
    updateActionFeedback(id, msg);
    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };
  const handleSaveFutureTask = (futureText, id) => {
    onAddTask(
      futureText,
      isEn ? "Future task/backlog not intended for immediate today's focus." : language === "tr" ? "Gelecekteki g\xF6rev/biriktirme listesi, bug\xFCn\xFCn acil oda\u011F\u0131na y\xF6nelik de\u011Fildir." : "Budu\u0107i zadatak koji nije predvi\u0111en za dana\u0161nji neposredan fokus.",
      "E"
    );
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn ? "Added to ABCDE Board (E) \u2713" : language === "tr" ? "ABCDE Board'a (E) eklendi \u2713" : "Dodato na ABCDE Tablu (E) \u2713";
    updateActionFeedback(futureText, msg);
    updateActionFeedback(id, msg);
    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };
  const handleAddMindMapItem = (clusterType, textValue) => {
    if (!textValue.trim()) return;
    const updatedData = { ...parsedData };
    if (clusterType === "tasks") {
      const currentTasks = updatedData.tasks || [];
      const newTaskObj = {
        title: textValue,
        description: isEn ? "Custom task created directly from Neural Mind Map" : language === "tr" ? "Do\u011Frudan N\xF6ral Zihin Haritas\u0131ndan olu\u015Fturulan \xF6zel g\xF6rev" : "Prilago\u0111eni zadatak kreiran direktno iz Mape Uma",
        category: "A",
        status: "pending"
      };
      updatedData.tasks = [...currentTasks, newTaskObj];
    } else {
      const list = updatedData[clusterType] || [];
      updatedData[clusterType] = [...list, textValue];
    }
    setParsedData(updatedData);
    const listCount = (updatedData[clusterType === "tasks" ? "tasks" : clusterType] || []).length;
    const newIndex = Math.min(3, listCount) - 1;
    setSelectedMindMapNode({
      id: `node_${clusterType}_${newIndex}`,
      clusterType,
      title: textValue,
      description: clusterType === "tasks" ? isEn ? "Actions integrated. Ready for ABC priorities." : language === "tr" ? "Eylemler entegre edildi. ABC \xF6nceliklerine haz\u0131r." : "Prilago\u0111eni zadatak integrisan." : clusterType === "worries" ? isEn ? "Subjective limiting pattern. Reframe or send to REBT." : language === "tr" ? "\xD6znel s\u0131n\u0131rlama modeli. Yeniden \xE7er\xE7eveleyin veya REBT'ye g\xF6nderin." : "Kreativni preokret ove brige pomo\u0107u CBT Sophia." : clusterType === "ideas" ? isEn ? "Splendid creative idea node." : language === "tr" ? "Muhte\u015Fem yarat\u0131c\u0131 fikir d\xFC\u011F\xFCm\xFC." : "Sa\u010Duvana ideja za prevenciju monotonije." : isEn ? "Affirmed custom objective." : language === "tr" ? "Onaylanan \xF6zel hedef." : "Upisani cilj kognitivne dekompresije.",
      isPlaceholder: false
    });
    setMindMapInput("");
    if (typeof window !== "undefined" && window.triggerHaptics) {
      window.triggerHaptics("medium");
    }
  };
  const [resetsHistory, setResetsHistory] = (0, import_react3.useState)(() => {
    const saved = safeStorage.getItem("kaizen_morning_resets_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_HISTORY_TEMPLATE;
      }
    }
    return DEFAULT_HISTORY_TEMPLATE;
  });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = (0, import_react3.useState)(false);
  const [weeklyReview, setWeeklyReview] = (0, import_react3.useState)(null);
  const [isGeneratingReview, setIsGeneratingReview] = (0, import_react3.useState)(false);
  const [biohackTip, setBiohackTip] = (0, import_react3.useState)("");
  const [suggestedBiohackHabit, setSuggestedBiohackHabit] = (0, import_react3.useState)(null);
  const [isGeneratingBiohack, setIsGeneratingBiohack] = (0, import_react3.useState)(false);
  const [expandedCard, setExpandedCard] = (0, import_react3.useState)(null);
  const [worryCbtChoice, setWorryCbtChoice] = (0, import_react3.useState)(null);
  const [worryActionStep, setWorryActionStep] = (0, import_react3.useState)("");
  const [worryBreatheCount, setWorryBreatheCount] = (0, import_react3.useState)(-1);
  const [worryCbtCompleted, setWorryCbtCompleted] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
    setWorryCbtChoice(null);
    setWorryActionStep("");
    setWorryBreatheCount(-1);
    setWorryCbtCompleted(false);
  }, [expandedCard]);
  const fetchBiohackTip = async (needStr, currentTipStr) => {
    if (!needStr) return;
    setIsGeneratingBiohack(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6e4);
    try {
      const response = await fetch(
        window.location.origin + "/api/biohack-generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            need: needStr,
            currentTip: currentTipStr || "",
            language
          }),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        setBiohackTip(data.tip);
        if (data.suggestedMicrohabit) {
          setSuggestedBiohackHabit(data.suggestedMicrohabit);
          try {
            const aiRecsStr = safeStorage.getItem(
              "abcde_ai_recommended_habits"
            );
            const aiRecs = aiRecsStr ? JSON.parse(aiRecsStr) : [];
            const newRec = {
              id: "ai_rec_" + Date.now().toString(36),
              nameEn: language === "en" ? data.suggestedMicrohabit.name : "Biohack Integration",
              nameSr: language === "sr" ? data.suggestedMicrohabit.name : "Biohack Integracija",
              nameTr: language === "tr" ? data.suggestedMicrohabit.name : "Biohack Entegrasyonu",
              twoMinEn: language === "en" ? data.suggestedMicrohabit.twoMinVersion : "",
              twoMinSr: language === "sr" ? data.suggestedMicrohabit.twoMinVersion : "",
              twoMinTr: language === "tr" ? data.suggestedMicrohabit.twoMinVersion : "",
              whyEn: language === "en" ? data.tip : "",
              whySr: language === "sr" ? data.tip : "",
              whyTr: language === "tr" ? data.tip : "",
              area: "General / Razno",
              areaLabelEn: "\u{1F9E0} AI Dynamic Insight",
              areaLabelSr: "\u{1F9E0} AI Dijagnostika",
              areaLabelTr: "\u{1F9E0} AI Te\u015Fhisi"
            };
            aiRecs.unshift(newRec);
            safeStorage.setItem(
              "abcde_ai_recommended_habits",
              JSON.stringify(aiRecs.slice(0, 15))
            );
          } catch (e) {
            console.error("Failed to save ai recommended habit", e);
          }
        } else {
          setSuggestedBiohackHabit(null);
        }
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const savedResetToday = safeStorage.getItem(
          `kaizen_morning_reset_data_${todayStr}`
        );
        if (savedResetToday) {
          try {
            const dataObj = JSON.parse(savedResetToday);
            dataObj.savedBiohackTip = data.tip;
            dataObj.savedBiohackHabit = data.suggestedMicrohabit || null;
            safeStorage.setItem(
              `kaizen_morning_reset_data_${todayStr}`,
              JSON.stringify(dataObj)
            );
          } catch (e) {
            console.error(e);
          }
        }
      } else {
        setBiohackTip(
          language === "en" ? "Failed to connect to Biohacking engine. Please wait or reload." : language === "tr" ? "Biohacking motoruna ba\u011Flan\u0131lamad\u0131. L\xFCtfen bekleyin veya yeniden y\xFCkleyin." : "Nije uspostavljena veza sa AI neuro-sistemom. Pritisnite ikonicu da poku\u0161ate ponovo."
        );
        setSuggestedBiohackHabit(null);
      }
    } catch (e) {
      console.error("Error fetching biohack tip:", e);
      setBiohackTip(
        language === "en" ? "Failed to connect to Biohacking engine. Please wait or reload." : language === "tr" ? "Biohacking motoruna ba\u011Flan\u0131lamad\u0131. L\xFCtfen bekleyin veya yeniden y\xFCkleyin." : "Nije uspostavljena veza sa AI neuro-sistemom."
      );
    } finally {
      setIsGeneratingBiohack(false);
    }
  };
  const [resetCompletedToday, setResetCompletedToday] = (0, import_react3.useState)(
    () => {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      return safeStorage.getItem(`kaizen_morning_reset_done_${todayStr}`) === "true";
    }
  );
  (0, import_react3.useEffect)(() => {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const savedResetToday = safeStorage.getItem(
      `kaizen_morning_reset_data_${todayStr}`
    );
    if (savedResetToday) {
      try {
        const data = JSON.parse(savedResetToday);
        setParsedData(data);
        setSelectedTheme(data.selectedTheme || "Work");
        setSelectedEmotion(data.selectedEmotion || data.emotions?.[0] || "");
        setConfirmedDrivers(data.confirmedDrivers || data.drivers || []);
        setIsTasksSynced(data.isTasksSynced || false);
        setIsGoalsSynced(data.isGoalsSynced || false);
        setIsIdeasSynced(data.isIdeasSynced || false);
        if (data.syncedGoals) setSyncedGoals(new Set(data.syncedGoals));
        if (data.syncedIdeas) setSyncedIdeas(new Set(data.syncedIdeas));
        setStep(5);
      } catch (e) {
        console.error("Error loading today's saved reset:", e);
      }
    }
  }, []);
  (0, import_react3.useEffect)(() => {
    if (parsedData && parsedData.savedBiohackTip && !isGeneratingBiohack) {
      setBiohackTip(parsedData.savedBiohackTip);
      if (parsedData.savedBiohackHabit) {
        setSuggestedBiohackHabit(parsedData.savedBiohackHabit);
      }
    } else if (parsedData && parsedData.cognitive_chain?.need) {
      fetchBiohackTip(parsedData.cognitive_chain.need);
    } else {
      setBiohackTip("");
      setSuggestedBiohackHabit(null);
    }
  }, [parsedData, language]);
  const handleSaveName = () => {
    safeStorage.setItem("kaizen_morning_username", userName);
    setIsEditingName(false);
  };
  const handleAnalyzeBrainDump = async () => {
    if (brainDumpText.trim().length < 3) {
      setAnalysisError(
        isEn ? "Please write a bit more so the AI can understand your focus points (minimum 3 characters)." : language === "tr" ? "Yapay zekan\u0131n odak noktalar\u0131n\u0131z\u0131 anlayabilmesi i\xE7in l\xFCtfen biraz daha yaz\u0131n (minimum 3 karakter)." : "Molimo napi\u0161ite bar malo detalja kako bi AI mogao da razume va\u0161 fokus (minimum 3 karaktera)."
      );
      return;
    }
    setIsAnalyzing(true);
    setAnimationStatus("loading");
    triggerHaptics("medium");
    setAnalysisError(null);
    const actualTheme = selectedTheme === "Custom" ? customTheme || "General" : selectedTheme;
    let ideaVaultItems = [];
    const controller = new AbortController();
    try {
      const response = await fetch("/api/morning-reset-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brainDump: brainDumpText,
          theme: actualTheme,
          language,
          energyRating,
          pleasureRating,
          ideaVault: ideaVaultItems
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
        }
        throw new Error(errorData?.error || `Failed to analyze brain dump: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.details || data.error);
      }
      if (data.follow_up_question && typeof data.follow_up_question === "string" && data.follow_up_question.trim().length > 0) {
        setFollowUpQuestion(data.follow_up_question);
        setAnimationStatus("success");
        triggerHaptics("success");
        setTimeout(() => setAnimationStatus("idle"), 2500);
        setIsAnalyzing(false);
        return;
      }
      console.log("AI Analysis Success:", data);
      setAnalysisError(null);
      setFollowUpQuestion(null);
      const updatedData = { ...data, brainDumpText };
      setParsedData(updatedData);
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      safeStorage.setItem(`kaizen_morning_reset_data_${todayStr}`, JSON.stringify(updatedData));
      if (data.suggested_omni_prompts && Array.isArray(data.suggested_omni_prompts)) {
        try {
          safeStorage.setItem("omni_suggested_prompts", JSON.stringify(data.suggested_omni_prompts));
        } catch (e) {
        }
      }
      setSelectedEmotion(data.emotions?.[0] || "");
      setConfirmedDrivers(data.drivers || []);
      setAnimationStatus("success");
      triggerHaptics("success");
      setTimeout(() => setAnimationStatus("idle"), 2500);
      setStep(4);
    } catch (err) {
      console.error("Network/API error in handleAnalyzeBrainDump:", err);
      const isEn2 = language === "en";
      let finalMessage = isEn2 ? `The Cognitive AI Agent encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again later.` : language === "tr" ? `Bili\u015Fsel Yapay Zeka Arac\u0131s\u0131 bir hatayla kar\u015F\u0131la\u015Ft\u0131: ${err instanceof Error ? err.message : "Unknown error"}. L\xFCtfen daha sonra tekrar deneyin.` : `Kognitivni AI Agent je nai\u0161ao na gre\u0161ku: ${err instanceof Error ? err.message : "Nepoznata gre\u0161ka"}. Molimo poku\u0161ajte ponovo.`;
      if (err instanceof Error && err.name === "AbortError") {
        finalMessage = isEn2 ? "Deep cognitive parsing timed out (90s). Your input might be too long or complex." : language === "tr" ? "Derin bili\u015Fsel ayr\u0131\u015Ft\u0131rma zaman a\u015F\u0131m\u0131na u\u011Frad\u0131 (90'lar). Giri\u015Finiz \xE7ok uzun veya karma\u015F\u0131k olabilir." : "Vreme za analizu je isteklo (90s). Unos je mo\u017Eda preduga\u010Dak.";
      } else if (err instanceof Error && err.message.includes("VA\u0160 AI API KLJU\u010C JE OSTAO BEZ SREDSTAVA")) {
        finalMessage = err.message;
      } else if (err instanceof Error && (err.message.includes("quota") || err.message.includes("limit") || err.message.includes("429"))) {
        finalMessage = isEn2 ? "AI Quota limit reached! Please wait 1-2 minutes before trying again." : language === "tr" ? "AI Kota s\u0131n\u0131r\u0131na ula\u015F\u0131ld\u0131! Tekrar denemeden \xF6nce l\xFCtfen 1-2 dakika bekleyin." : "Dostignut je limit API zahteva (Kvote)! Molimo sa\u010Dekajte par minuta.";
      }
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: finalMessage,
            type: "error"
          }
        })
      );
      setAnimationStatus("idle");
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleSyncTasksToBoard = async () => {
    if (!parsedData) return;
    try {
      const allTasksToSync = [];
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      if (!isTasksSynced) {
        if (parsedData.tasks && parsedData.tasks.length > 0) {
          parsedData.tasks.forEach((t) => {
            allTasksToSync.push({
              title: t.title,
              description: t.description || "",
              category: t.category,
              explanation: t.explanation || ""
            });
          });
        }
        if (parsedData.waiting_for && parsedData.waiting_for.length > 0) {
          parsedData.waiting_for.forEach((wf) => {
            allTasksToSync.push({
              title: (isEn ? "Pending: " : language === "tr" ? "Ask\u0131da olmas\u0131:" : "Na \u010Dekanju: ") + wf,
              description: wf,
              category: "D",
              explanation: isEn ? "Marked as waiting for external input." : language === "tr" ? "Harici giri\u015F bekleniyor olarak i\u015Faretlendi." : "Ozna\u010Deno da zavisi od nekog drugog."
            });
          });
        }
        if (parsedData.not_today && parsedData.not_today.length > 0) {
          parsedData.not_today.forEach((nt) => {
            allTasksToSync.push({
              title: (isEn ? "Future: " : language === "tr" ? "Gelecek:" : "Dugoro\u010Dno: ") + nt,
              description: nt,
              category: "E",
              explanation: isEn ? "Marked to not be done today." : language === "tr" ? "Bug\xFCn yap\u0131lmayacak olarak i\u015Faretlendi." : "Odlo\u017Eeno za neki drugi dan."
            });
          });
        }
        setIsTasksSynced(true);
      }
      if (allTasksToSync.length > 0) {
        if (onAddMultipleTasks) {
          await onAddMultipleTasks(allTasksToSync);
        } else if (onAddTask) {
          allTasksToSync.forEach((t) => {
            onAddTask(t.title, t.description || "", t.category);
          });
        }
      }
      safeStorage.setItem(`kaizen_morning_reset_done_${todayStr}`, "true");
      const toastMessage = isEn ? "All tasks synced to ABCDE!" : language === "tr" ? "T\xFCm g\xF6revler ABCDE'ye e\u015Fitlendi!" : "Svi konkretni zadaci su raspore\u0111eni u ABCDE!";
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: toastMessage,
            type: "success"
          }
        })
      );
      const todayData = {
        ...parsedData,
        selectedTheme: selectedTheme === "Custom" ? customTheme : selectedTheme,
        selectedEmotion,
        confirmedDrivers,
        isTasksSynced: true,
        isGoalsSynced,
        isIdeasSynced,
        syncedGoals: Array.from(syncedGoals),
        syncedIdeas: Array.from(syncedIdeas)
      };
      safeStorage.setItem(
        `kaizen_morning_reset_data_${todayStr}`,
        JSON.stringify(todayData)
      );
    } catch (e) {
      console.error("Failed to sync tasks:", e);
    }
  };
  const handleSyncAllToBoard = async () => {
    if (!parsedData) return;
    try {
      if (!isTasksSynced) {
        await handleSyncTasksToBoard();
        setIsTasksSynced(true);
      }
      if (parsedData.goals && parsedData.goals.length > 0) {
        parsedData.goals.forEach((g, i) => {
          if (!syncedGoals.has(g)) {
            const cat = determineCategoryForGoalOrIdea(g, true) || "B";
            handleAddGoalAsTask(g, `goal_${i}`, cat);
          }
        });
        setIsGoalsSynced(true);
      }
      if (parsedData.ideas && parsedData.ideas.length > 0) {
        parsedData.ideas.forEach((id, i) => {
          if (!syncedIdeas.has(id)) {
            const cat = determineCategoryForGoalOrIdea(id, false) || "C";
            handleSaveIdea(id, `idea_${i}`, cat);
          }
        });
        setIsIdeasSynced(true);
      }
      const toastMessage = isEn ? "Complete mind-map organized in ABCDE!" : language === "tr" ? "T\xFCm zihin haritas\u0131 ABCDE'de d\xFCzenlendi!" : "Sve (zadaci, ciljevi i ideje) je raspore\u0111eno u ABCDE!";
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: toastMessage,
            type: "success"
          }
        })
      );
    } catch (e) {
      console.error("Failed to sync all elements:", e);
    }
  };
  const handleDeleteParsedItem = (category, index, e) => {
    e.stopPropagation();
    if (!parsedData || !parsedData[category]) return;
    const newData = { ...parsedData };
    newData[category] = [...newData[category]];
    newData[category].splice(index, 1);
    setParsedData(newData);
    if (typeof window !== "undefined" && window.triggerHaptics) {
      window.triggerHaptics("selection");
    }
  };
  const handleFinalizeReset = () => {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const finalResetData = {
      ...parsedData,
      selectedTheme: selectedTheme === "Custom" ? customTheme : selectedTheme,
      selectedEmotion,
      confirmedDrivers,
      isTasksSynced,
      isGoalsSynced,
      isIdeasSynced,
      syncedGoals: Array.from(syncedGoals),
      syncedIdeas: Array.from(syncedIdeas),
      completedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    safeStorage.setItem(`kaizen_morning_reset_done_${todayStr}`, "true");
    safeStorage.setItem(
      `kaizen_morning_reset_data_${todayStr}`,
      JSON.stringify(finalResetData)
    );
    setResetCompletedToday(true);
    const logItem = {
      date: todayStr,
      state: finalResetData.state,
      weather: finalResetData.weather,
      emotion: selectedEmotion,
      theme: selectedTheme === "Custom" ? customTheme : selectedTheme,
      brainDumpText: finalResetData.brainDumpText || "",
      aiResponse: finalResetData
    };
    const filteredHistory = resetsHistory.filter((h) => h.date !== todayStr);
    const updatedHistory = [...filteredHistory, logItem];
    setResetsHistory(updatedHistory);
    safeStorage.setItem(
      "kaizen_morning_resets_history",
      JSON.stringify(updatedHistory)
    );
    setStep(5);
    window.dispatchEvent(new Event("trigger-adrenaline"));
    window.dispatchEvent(new Event("companion-sync"));
    window.dispatchEvent(new Event("storage_sync"));
  };
  const handleGenerateWeeklyReview = async () => {
    setIsGeneratingReview(true);
    setWeeklyReview(null);
    try {
      const savedLogs = safeStorage.getItem("kaizen_morning_resets_history") || "[]";
      const parsedLogs = JSON.parse(savedLogs);
      const isEn2 = language === "en";
      const promptLogs = (Array.isArray(parsedLogs) ? parsedLogs : []).map(
        (l) => `- Day: ${l.date} | Theme: ${l.theme} | Mood Climate: ${l.weather} (${l.state}) | Selected Emotion: ${l.emotion}`
      ).join("\n");
      const prompt = `Perform a high-level cognitive audit of the user's weekly operation logs:
${promptLogs}

Generate a professional 4-part operating review containing:
1. WHAT GAVE ENERGY (What themes & metrics boosted user energy)
2. WHAT DRAINED ENERGY (Key blockers, storms or fog patterns)
3. WHAT TO REMOVE (Inefficiencies, bad habits, categories)
4. WHAT TO REPEAT (Successful loops, positive routines)

Provide the analysis in ${isEn2 ? "English" : language === "tr" ? "Turkish" : "Serbian"} with rich visual bullet points and formatting. Keep it elegant, clear and highly actionable.`;
      const response = await fetch(
        window.location.origin + "/api/advisor-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advisorId: "marta",
            // Let mentor Sistemski Savetnik build the holistic operational audit
            message: prompt,
            language
          })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Could not generate review");
      setWeeklyReview(data.text);
    } catch (e) {
      console.error(e);
      setWeeklyReview(
        isEn ? "Failed to compile weekly review. Please perform more morning resets or try again." : language === "tr" ? "Haftal\u0131k inceleme derlenemedi. L\xFCtfen daha fazla sabah s\u0131f\u0131rlamas\u0131 yap\u0131n veya tekrar deneyin." : "Nije uspelo sastavljanje nedeljnog izve\u0161taja. Odradite vi\u0161e jutarnjih reseta pa poku\u0161ajte ponovo."
      );
    } finally {
      setIsGeneratingReview(false);
    }
  };
  const handleDeleteVaultItem = (item) => {
    if (item.type === "morning") {
      const updated = resetsHistory.filter((r) => r.date + "-morning" !== item.id);
      setResetsHistory(updated);
      safeStorage.setItem("kaizen_morning_resets_history", JSON.stringify(updated));
    } else {
      const keyMap = {
        nlp: "mindset_nlp_history_v2",
        rebt: "mindset_rebt_history_v2",
        biohack: "mindset_biohack_history_v2",
        ta: "mindset_ta_history_v2"
      };
      const key = keyMap[item.type];
      if (key) {
        const raw = safeStorage.getItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            const updated = list.filter((l, i) => item.type + "-" + i + "-" + l.timestamp !== item.id);
            safeStorage.setItem(key, JSON.stringify(updated));
          } catch (e) {
            console.error("Error parsing/filtering vault item", e);
          }
        }
      }
    }
    triggerHaptics("medium");
    setVaultOpen(false);
    setTimeout(() => setVaultOpen(true), 10);
  };
  const getAllVaultItems = () => {
    let combined = [];
    try {
      const nlp = JSON.parse(
        safeStorage.getItem("mindset_nlp_history_v2") || "[]"
      );
      (Array.isArray(nlp) ? nlp : []).forEach((item, i) => {
        combined.push({
          id: `nlp-${i}-${item.timestamp}`,
          type: "nlp",
          date: new Date(item.timestamp).toISOString().split("T")[0],
          userPrompt: item.promptText,
          aiResponse: item.aiResponse,
          label: "NLP Engine",
          theme: ""
        });
      });
    } catch (e) {
    }
    try {
      const rebt = JSON.parse(
        safeStorage.getItem("mindset_rebt_history_v2") || "[]"
      );
      (Array.isArray(rebt) ? rebt : []).forEach((item, i) => {
        combined.push({
          id: `rebt-${i}-${item.timestamp}`,
          type: "rebt",
          date: new Date(item.timestamp).toISOString().split("T")[0],
          userPrompt: item.promptText,
          aiResponse: item.aiResponse,
          label: "REBT Analysis",
          theme: ""
        });
      });
    } catch (e) {
    }
    try {
      const biohack = JSON.parse(
        safeStorage.getItem("mindset_biohack_history_v2") || "[]"
      );
      (Array.isArray(biohack) ? biohack : []).forEach((item, i) => {
        combined.push({
          id: `biohack-${i}-${item.timestamp}`,
          type: "biohack",
          date: new Date(item.timestamp).toISOString().split("T")[0],
          userPrompt: item.promptText,
          aiResponse: item.aiResponse,
          label: "Biohacking Request",
          theme: ""
        });
      });
    } catch (e) {
    }
    try {
      const ta = JSON.parse(
        safeStorage.getItem("mindset_ta_history_v2") || "[]"
      );
      (Array.isArray(ta) ? ta : []).forEach((item, i) => {
        combined.push({
          id: `ta-${i}-${item.timestamp}`,
          type: "ta",
          date: new Date(item.timestamp).toISOString().split("T")[0],
          userPrompt: item.promptText,
          aiResponse: item.aiResponse,
          label: "TA Session",
          theme: ""
        });
      });
    } catch (e) {
    }
    return combined.filter((item) => {
      if (vaultFilter !== "all" && item.type !== vaultFilter) return false;
      if (vaultSearch.trim() !== "") {
        const term = vaultSearch.toLowerCase();
        return typeof item.userPrompt === "string" && item.userPrompt.toLowerCase().includes(term) || typeof item.aiResponse === "string" && item.aiResponse.toLowerCase().includes(term);
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  const calculateBurnoutRisk = () => {
    const recentLogs = resetsHistory.slice(-7);
    if (recentLogs.length === 0)
      return {
        risk: "LOW",
        score: 10,
        msgSr: "Nedovoljno podataka za analizu sagorevanja. Nastavite sa jutarnjim resetima.",
        msgEn: "Insufficient data to assess burnout. Complete more daily resets."
      };
    const redBlueDays = recentLogs.filter(
      (l) => l.state === "OVERLOADED" || l.state === "DRAINED"
    ).length;
    const percentage = Math.round(
      redBlueDays / Math.max(recentLogs.length, 1) * 100
    );
    if (percentage >= 70) {
      return {
        risk: "HIGH",
        score: percentage,
        msgSr: "\u26A0\uFE0F VISOK RIZIK OD SAGOREVANJA (BURNOUT)! Imate preko 70% dana pod optere\u0107enjem ili bez energije u proteklih 7 dana. AI preporu\u010Duje hitno preusmeravanje na podmodul Dnevna regeneracija i mikrorutine sa niskim naporom.",
        msgEn: "\u26A0\uFE0F CRITICAL BURNOUT RISK! Over 70% of your past week was spent overloaded or drained. AI recommends immediately switching into Recovery protocol under Consistency Micro-Routines."
      };
    } else if (percentage >= 40) {
      return {
        risk: "MEDIUM",
        score: percentage,
        msgSr: "SREDNJI RIZIK OD SAGOREVANJA. Prisutni su povremeni talasi kognitivne preoptere\u0107enosti. Primenite 5-minutni reset disanja danas za regulaciju tonusa.",
        msgEn: "MODERATE BURNOUT RISK. Cognitive overload spikes are occurring. Try incorporating more short breathing resets today to regulate work triggers."
      };
    } else {
      return {
        risk: "LOW",
        score: Math.max(percentage, 12),
        msgSr: "NIZAK RIZIK OD SAGOREVANJA. Va\u0161 kognitivni fokus i regenerativni krugovi su stabilni. Nastavite sa pame\u0107u!",
        msgEn: "LOW BURNOUT RISK. Your cognitive stamina and recovery systems are highly aligned. Keep up the high-performance momentum!"
      };
    }
  };
  const burnout = calculateBurnoutRisk();
  const handleRestartReset = () => {
    const keysToRemove = [];
    for (let i = 0; i < safeStorage.length; i++) {
      const key = safeStorage.key(i);
      if (key && (key.startsWith("kaizen_morning_reset_done_") || key.startsWith("kaizen_morning_reset_data_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => safeStorage.removeItem(k));
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const filteredHistory = resetsHistory.filter((h) => h.date !== todayStr);
    setResetsHistory(filteredHistory);
    safeStorage.setItem(
      "kaizen_morning_resets_history",
      JSON.stringify(filteredHistory)
    );
    setBrainDumpText("");
    setFollowUpQuestion(null);
    setParsedData(null);
    setResetCompletedToday(false);
    setIsTasksSynced(false);
    setSelectedTheme("board");
    setStep(1);
    window.dispatchEvent(new Event("companion-sync"));
    window.dispatchEvent(new Event("storage_sync"));
  };
  const themeOptions = [
    {
      id: "board",
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckSquare, { className: "w-6 h-6 text-[#007AFF] dark:text-[#0A84FF]" }),
      labelSr: "Prioriteti ABCDE Matrix",
      labelEn: "ABCDE Priorities Board",
      descSr: "Glavna matrica sa gvozdenom disciplinom prioriteta.",
      descEn: "Main matrix with iron-clad discipline priorities.",
      color: " border-[#007AFF]/20 dark:border-[#0A84FF]/20/50 dark:border-[#007AFF]/20 dark:border-[#0A84FF]/20/40 hover:border-[#007AFF]/20 dark:border-[#0A84FF]/20"
    },
    {
      id: "Vision",
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Sparkles, { className: "w-6 h-6 text-[#FF2D55] dark:text-[#FF375F]" }),
      labelSr: "Komora Strate\u0161ke Perspektive",
      labelEn: "Strategic Perspective Chamber",
      descSr: "Uskladite ideje kroz vizionarski, pragmati\u010Dni i analiti\u010Dki ugao.",
      descEn: "Refine ideas across high-level vision, pragmatic execution, and objective scrutiny.",
      color: " border-[#FF2D55]/20 dark:border-[#FF375F]/20/50 dark:border-[#FF2D55]/20 dark:border-[#FF375F]/20/40 hover:border-[#FF2D55]/20 dark:border-[#FF375F]/20"
    },
    {
      id: "wheel",
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.PieChart, { className: "w-6 h-6 text-[#FF9500] dark:text-[#FF9F0A]" }),
      labelSr: "To\u010Dak \u017Eivota",
      labelEn: "Wheel of Life Balance",
      descSr: "Izbalansiranost kognitivnih stubova \u017Eivota.",
      descEn: "Visual balance across core life dimensions.",
      color: " border-[#FF9500]/20 dark:border-[#FF9F0A]/20 dark:border-[#FF9500]/20 dark:border-[#FF9F0A]/20 hover:border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
    },
    {
      id: "pareto",
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Filter, { className: "w-6 h-6 text-[#34C759] dark:text-[#30D158]" }),
      labelSr: "Pareto 80/20 analitika",
      labelEn: "Pareto 80/20 Analyzer",
      descSr: "Prona\u0111ite 20% klju\u010Dnih radnji za 80% ishoda.",
      descEn: "Isolate the 20% high-leverage efforts.",
      color: " border-[#34C759]/20 dark:border-[#30D158]/20 dark:border-[#34C759]/20 dark:border-[#30D158]/20 hover:border-[#34C759]/20 dark:border-[#30D158]/20"
    },
    {
      id: "progress",
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Activity, { className: "w-6 h-6 text-[#AF52DE] dark:text-[#BF5AF2]" }),
      labelSr: "Mikrorutine & Doslednost",
      labelEn: "Micro-Routines & Consistency",
      descSr: "Dizajnirajte usmerene dnevne navike i gradite stabilan napredak.",
      descEn: "Anchor tiny daily actions with structured triggers for compound growth.",
      color: " border-[#AF52DE]/20 dark:border-[#BF5AF2]/20/50 dark:border-[#AF52DE]/20 dark:border-[#BF5AF2]/20/40 hover:border-[#AF52DE]/20 dark:border-[#BF5AF2]/20"
    },
    {
      id: "habitat",
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Cat, { className: "w-6 h-6 text-[#FF3B30] dark:text-[#FF453A]" }),
      labelSr: "Svetili\u0161te i pas vodi\u010D",
      labelEn: "Habit Pet Sanctuary",
      descSr: "Igrajte se i brinite o svom kognitivnom ljubimcu.",
      descEn: "Care for your cognitive digital pet companion.",
      color: " border-[#FF3B30]/20 dark:border-[#FF453A]/20/50 dark:border-[#FF3B30]/20 dark:border-[#FF453A]/20/40 hover:border-[#FF3B30]/20 dark:border-[#FF453A]/20"
    },
    // { id: "dopamine", icon: "🍬", labelSr: "Dopaminska matrica", labelEn: "Dopamine Rewards", descSr: "Sistem nagrađivanja za obavljanje teških zadataka.", descEn: "Gamified reward points matrix to fuel drive.", color: " border-[#00C7BE]/20 dark:border-[#32ADE6]/20/50 dark:border-[#00C7BE]/20 dark:border-[#32ADE6]/20/40 hover:border-[#00C7BE]/20 dark:border-[#32ADE6]/20" },
    {
      id: "mindset",
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Brain, { className: "w-6 h-6 text-[#FF3B30] dark:text-[#FF453A]" }),
      labelSr: "Trener uverenja",
      labelEn: "Mindset Reflector",
      descSr: "Suo\u010Dite se i uklonite ograni\u010Davaju\u0107a uverenja.",
      descEn: "Identify and reflect on limiting beliefs.",
      color: " border-[#FF3B30]/20 dark:border-[#FF453A]/20 dark:border-[#FF3B30]/20 dark:border-[#FF453A]/20 hover:border-[#FF3B30]/20 dark:border-[#FF453A]/20"
    },
    {
      id: "braindump_inbox",
      icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Layers, { className: "w-6 h-6 text-[#5AC8FA] dark:text-[#64D2FF]" }),
      labelSr: "Inbox za pra\u017Enjenje",
      labelEn: "Brain Dump Inbox",
      descSr: "Gde nesre\u0111ene misli \u010Dekaju pravu proceduru.",
      descEn: "Temporary cache holding unorganized thoughts.",
      color: " border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5"
    }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "w-full", id: "morning-ai-hub-root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1 text-left", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white dark:bg-[#1C1C1E] dark:text-white rounded-md text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Sparkles, { className: "w-2.5 h-2.5" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "KAIZEN SYSTEM CORE" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "text-xl font-semibold text-black dark:text-white flex items-center gap-2 font-sans", children: [
          "\u{1F9E0}",
          " ",
          isEn ? "COGNITIVE COMMAND CENTER" : language === "tr" ? "B\u0130L\u0130\u015ESEL KOMUTA MERKEZ\u0130" : "KOGNITIVNI KOMANDNI CENTAR"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium", children: isEn ? "The central operational control center mapping mind clutter to action protocols." : language === "tr" ? "Merkezi operasyonel kontrol merkezi, zihin kar\u0131\u015F\u0131kl\u0131\u011F\u0131n\u0131 eylem protokolleriyle e\u015Fle\u015Ftiriyor." : "Centralni operativni sistem aplikacije - izaberite akcione protokole kroz analizu uma." })
      ] }),
      resetCompletedToday && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2 self-start sm:self-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[13px] bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#34C759] border border-[#34C759]/20 dark:border-[#30D158]/20 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-2 h-2 rounded-full bg-[#34C759] dark:bg-[#30D158] transition-opacity" }),
          isEn ? "TODAY'S RESET COMMITTED" : language === "tr" ? "BUG\xDCN\xDCN SIFIRLANMASI KABUL ED\u0130LD\u0130" : "JUTARNJI RESET AKTIVAN"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            onClick: handleRestartReset,
            className: "p-1.5 hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#2C2C2E] dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white dark:hover:text-white rounded-lg transition-all cursor-pointer",
            title: isEn ? "Restart Morning Reset" : language === "tr" ? "Sabah S\u0131f\u0131rlamay\u0131 Yeniden Ba\u015Flat" : "Ponovi reset",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.RefreshCw, { className: "w-3.5 h-3.5" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "relative", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_react4.AnimatePresence, { mode: "wait", children: [
      step === 1 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        import_react4.motion.div,
        {
          initial: { opacity: 0, y: 15 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -15 },
          className: "space-y-6 text-left",
          id: "morning-screen-1",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-3 text-left p-4 bg-white dark:bg-[#1C1C1E]/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] border border-[#007AFF]/10 relative", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[11px] text-[#007AFF] font-bold uppercase tracking-wide", children: isEn ? "Brain Dump" : language === "tr" ? "Beyin D\xF6k\xFCm\xFC" : "Pra\u017Enjenje uma" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-1 h-1 rounded-full bg-[#007AFF]/30" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[11px] text-[#8E8E93] font-medium", children: isEn ? "Morning Reset" : language === "tr" ? "Sabah S\u0131f\u0131rlamas\u0131" : "Jutarnji reset" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-lg font-bold text-black dark:text-white", children: isEn ? "Clear Your Mind" : language === "tr" ? "Zihninizi Bo\u015Falt\u0131n" : "Oslobodite svoj um" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[12px] text-[#8E8E93] dark:text-[#EBEBF5]/70 font-medium leading-relaxed", children: isEn ? "Type what's on your mind. AI will organize it." : language === "tr" ? "Akl\u0131n\u0131zdakileri yaz\u0131n. Yapay zeka d\xFCzenleyecektir." : "Upi\u0161ite \u0161ta vam je na umu. AI \u0107e to organizovati." })
              ] }),
              followUpQuestion && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                import_react4.motion.div,
                {
                  initial: { opacity: 0, y: 5 },
                  animate: { opacity: 1, y: 0 },
                  className: "p-3 bg-[#007AFF]/10 dark:bg-[#1C1C1E]/30 border border-black/5 dark:border-white/5 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-semibold rounded-xl flex items-start gap-3",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Brain, { className: "w-5 h-5 mt-0.5 shrink-0 text-[#007AFF]" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "block text-[12px] font-semibold text-[#0A84FF] mb-0.5", children: isEn ? "Clarification needed:" : language === "tr" ? "A\xE7\u0131klama gerekli:" : "Potrebno poja\u0161njenje:" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[14px]", children: followUpQuestion })
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "relative", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "textarea",
                  {
                    value: brainDumpText,
                    onChange: (e) => setBrainDumpText(e.target.value),
                    placeholder: isEn ? "What's on your mind today? Tasks, worries, ideas..." : language === "tr" ? "Bug\xFCn akl\u0131n\u0131zda ne var? G\xF6revler, endi\u015Feler, fikirler..." : "\u0160ta vam je na umu danas? Zadaci, brige, ideje...",
                    className: "w-full h-48 sm:h-64 resize-y min-h-[150px] shadow-sm p-4 pr-14 bg-white dark:bg-[#1C1C1E] shadow-[0_2px_8px_rgba(0,0,0,0.04)]/80 dark:bg-[#1C1C1E]/80 border border-black/5 dark:border-white/5 rounded-xl text-[15px] leading-relaxed font-medium placeholder:text-[#8E8E93] dark:placeholder:text-[#EBEBF5]/40 dark:text-[#EBEBF5]/80 outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all duration-300 text-black dark:text-white",
                    disabled: isAnalyzing
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  VoiceInputNode,
                  {
                    language,
                    isEvening,
                    onTranscript: (text) => {
                      setBrainDumpText((prev) => {
                        const cleanPrev = prev.trim();
                        return cleanPrev ? `${cleanPrev} ${text.trim()} ` : `${text.trim()} `;
                      });
                    },
                    onStartRecording: () => setIsRecording(true),
                    onStopRecording: () => setIsRecording(false)
                  }
                )
              ] }),
              isRecording && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "text-[13px] font-medium text-[#FF3B30] dark:text-[#FF453A] transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3B30] dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 rounded-xl max-w-max", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-2 h-2 bg-[#FF3B30] dark:bg-[#FF453A] rounded-full transition-opacity" }),
                isEn ? "Listening... Speak clearly. Click microphone to stop." : language === "tr" ? "Dinliyorum... A\xE7\u0131k\xE7a konu\u015Fun. Durdurmak i\xE7in mikrofona t\u0131klay\u0131n." : "Slu\u0161am... Govorite jasno. Kliknite na mikrofon da zaustavite."
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between items-center text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[#3C3C43] dark:text-[#EBEBF5]/80", children: isEn ? "CHARACTERS:" : language === "tr" ? "KARAKTERLER:" : "ZNAKOVI:" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "span",
                    {
                      className: `${brainDumpText.length >= 500 ? "text-[#34C759] font-semibold" : brainDumpText.length >= 150 ? "text-[#FF9500]" : "text-[#3C3C43] dark:text-[#EBEBF5]/80"}`,
                      children: brainDumpText.length
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[#555555] dark:text-[#EBEBF5]/60", children: "/" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold", children: [
                    "150+ ",
                    isEn ? "recommended" : language === "tr" ? "tavsiye edilen" : "preporu\u010Deno"
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-24 sm:w-36 h-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-full overflow-hidden shrink-0", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "div",
                  {
                    className: `h-full transition-all duration-350 ${brainDumpText.length >= 500 ? "bg-[#34C759] dark:bg-[#30D158]" : brainDumpText.length >= 150 ? "bg-[#FF9500] dark:bg-[#FF9F0A]" : "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10"}`,
                    style: {
                      width: `${Math.min(brainDumpText.length / 500 * 100, 100)}%`
                    }
                  }
                ) })
              ] })
            ] }),
            resetsHistory && resetsHistory.some((h) => h.brainDumpText) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-4.5 bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)]/40 border border-[#007AFF]/10 rounded-2xl space-y-3 shadow-sm", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                onClick: () => setVaultOpen(true),
                className: "w-full flex items-center justify-between text-left text-xs font-bold text-black dark:text-white cursor-pointer",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.BookOpen, { className: "w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Vault: Past Morning Prompts & Reset Dumps" : language === "tr" ? "Vault: Ge\xE7mi\u015F Sabah \u0130stemleri ve D\xF6k\xFCmleri S\u0131f\u0131rlama" : "Trezor: Raniji jutarnji upisi i kognitivni upiti" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "px-1.5 py-0.5 bg-[#007AFF]/15 text-[#007AFF] rounded-md text-[10px] font-bold", children: resetsHistory.filter((h) => h.brainDumpText).length })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[#8E8E93] dark:text-[#EBEBF5]/60 text-[10px] font-bold", children: isEn ? "Open Vault" : language === "tr" ? "Apps Kasas\u0131'n\u0131 a\xE7" : "Otvori Trezor" })
                ]
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col sm:flex-row justify-between items-center gap-3.5 pt-4 border-t border-black/5 dark:border-white/5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-[13px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 leading-normal text-center sm:text-left", children: isEn ? "\u2022 COGNITIVE HARVEST STAGE \u2022" : language === "tr" ? "\u2022 B\u0130L\u0130\u015ESEL HASAT A\u015EAMASI \u2022" : "\u2022 FAZA DEKLATERA I PRA\u017DNJENJA UMA \u2022" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3 w-full sm:w-auto justify-end", children: [
                brainDumpText.trim().length > 0 && !isAnalyzing && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setBrainDumpText("");
                      triggerHaptics("medium");
                    },
                    className: "px-4.5 py-3 border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:hover:bg-white dark:bg-[#1C1C1E]/5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Trash2, { className: "w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Clear" : language === "tr" ? "Temizlemek" : "Isprazni" })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      if (brainDumpText.trim().length < 3) {
                        window.dispatchEvent(
                          new CustomEvent("trigger-toast", {
                            detail: {
                              message: isEn ? "Please write a bit more so the AI can understand your focus points (minimum 3 characters)." : language === "tr" ? "Yapay zekan\u0131n odak noktalar\u0131n\u0131z\u0131 anlayabilmesi i\xE7in l\xFCtfen biraz daha yaz\u0131n (minimum 3 karakter)." : "Molimo napi\u0161ite bar malo detalja kako bi AI mogao da razume va\u0161 fokus (minimum 3 karaktera)."
                            }
                          })
                        );
                        return;
                      }
                      setStep(2);
                      triggerHaptics("light");
                    },
                    className: "px-8 py-3.5 bg-[#007AFF] text-white rounded-[14px] text-[15px] font-semibold cursor-pointer flex items-center gap-2 group shadow-sm transition-all hover:bg-[#007AFF]/90",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Continue to energy check" : language === "tr" ? "Enerji kontrol\xFCne devam edin" : "Nastavi na procenu energije" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.ArrowRight, { className: "w-4 h-4 text-white group-hover:translate-x-1 transition-transform" })
                    ]
                  }
                )
              ] })
            ] })
          ]
        },
        "unified-morning-workspace"
      ),
      step === 2 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        import_react4.motion.div,
        {
          initial: { opacity: 0, y: 15 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -15 },
          className: "space-y-6 text-left",
          id: "morning-screen-2-new",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "div",
              {
                className: "p-5 bg-white dark:bg-[#1C1C1E]/80 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-black/5 dark:border-white/5 space-y-4 my-2 transition-opacity",
                id: "ruler-mood-assessment",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between border-b border-black/5 dark:border-white/5/40 pb-2.5", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-xs font-semibold text-black dark:text-white", children: isEn ? "\u{1F4CA} ENERGY & PLEASANTNESS RATING" : language === "tr" ? "\u{1F4CA} ENERJ\u0130 VE KEY\u0130F DERECES\u0130" : "\u{1F4CA} PROCENA ENERGIJE I PRIJATNOSTI" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium", children: isEn ? "Dr. Marc Brackett's famous Mood Meter framework" : language === "tr" ? "Dr. Marc Brackett'in \xFCnl\xFC Ruh Hali \xD6l\xE7er \xE7er\xE7evesi" : "Nau\u010Dni model Mood Meter (dr Marc Brackett)" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          const elem = document.getElementById("ruler-info-panel");
                          if (elem) {
                            elem.classList.toggle("hidden");
                          }
                        },
                        className: "px-2.5 py-1 text-[13px] font-medium text-[#007AFF] bg-[#007AFF]/10 dark:text-[#0A84FF] dark:bg-white/5 rounded-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer",
                        children: isEn ? "Learn More \u{1F4A1}" : language === "tr" ? "Daha Fazla Bilgi Edinin \u{1F4A1}" : "Saznaj vi\u0161e \u{1F4A1}"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "div",
                    {
                      id: "ruler-info-panel",
                      className: "hidden text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4 rounded-xl leading-relaxed space-y-2 mb-4",
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "font-medium text-black dark:text-white", children: isEn ? "Why Energy & Pleasantness?" : language === "tr" ? "Neden Enerji ve Keyif?" : "Za\u0161to procenjujemo Energiju i Prijatnost?" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: isEn ? "Every human emotion is a mixture of physical energy (high or low) and subjective pleasantness (negative or positive). By mapping these values on a -5 to +5 grid, we place ourselves precisely on the scientific Mood Meter." : language === "tr" ? "Her insani duygu, fiziksel enerjinin (y\xFCksek veya d\xFC\u015F\xFCk) ve \xF6znel ho\u015Fnutlu\u011Fun (olumsuz veya olumlu) bir kar\u0131\u015F\u0131m\u0131d\u0131r. Bu de\u011Ferleri -5'ten +5'e kadar bir \u0131zgarada haritaland\u0131rarak kendimizi tam olarak bilimsel Ruh Hali \xD6l\xE7er'e yerle\u015Ftiririz." : "Svaka ljudska emocija je spoj fizi\u010Dke energije (od niske do visoke) i subjektivnog ose\u0107aja prijatnosti (neprijatno do prijatno). Unosom vrednosti od -5 do +5 precizno mapiramo va\u0161e trenutno neurolo\u0161ko stanje." }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "font-medium text-black dark:text-white pt-1", children: isEn ? "Scientific Regulation Strategies:" : language === "tr" ? "Bilimsel D\xFCzenleme Stratejileri:" : "Nau\u010Dne strategije regulacije emocija:" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("ul", { className: "list-disc pl-4 space-y-1", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("strong", { children: [
                              isEn ? "\u{1F534} High Energy + Low Pleasantness" : language === "tr" ? "\u{1F534} Y\xFCksek Enerji + D\xFC\u015F\xFCk Ho\u015Fluk" : "\u{1F534} Aktivna Negativna",
                              " ",
                              "(Anksioznost, Bes):"
                            ] }),
                            " ",
                            isEn ? "Regulate via physiological sighs (double inhale, slow exhale) and safe physical outlet." : language === "tr" ? "Fizyolojik i\xE7 \xE7eki\u015Fler (\xE7ift nefes alma, yava\u015F nefes verme) ve g\xFCvenli fiziksel \xE7\u0131k\u0131\u015F yoluyla d\xFCzenleme yap\u0131n." : "Reguli\u0161ite fiziolo\u0161kim uzdahom (dvostruki udah na nos, dug izdah na usta) i sklanjanjem sa stimulansa."
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("strong", { children: [
                              isEn ? "\u26AB Low Energy + Low Pleasantness" : language === "tr" ? "\u26AB D\xFC\u015F\xFCk Enerji + D\xFC\u015F\xFCk Ho\u015Fluk" : "\u26AB Povu\u010Dena Negativna",
                              " ",
                              "(Tuga, Bezvoljnost):"
                            ] }),
                            " ",
                            isEn ? "Regulate via self-compassion, physical movement (even short walks), and small micro-routines." : language === "tr" ? "Kendinize \u015Fefkat g\xF6stererek, fiziksel hareketlerle (k\u0131sa y\xFCr\xFCy\xFC\u015Fler bile) ve k\xFC\xE7\xFCk mikro rutinlerle kendinizi d\xFCzenleyin." : "Reguli\u0161ite saose\u0107anjem prema sebi, blagim fizi\u010Dkim kretanjem (kratka \u0161etnja) ili sitnim mikro-zadacima."
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("strong", { children: [
                              isEn ? "\u{1F535} Low Energy + High Pleasantness" : language === "tr" ? "\u{1F535} D\xFC\u015F\xFCk Enerji + Y\xFCksek Keyif" : "\u{1F535} Mirna Pozitivna",
                              " ",
                              "(Zadovoljstvo, Spokoj):"
                            ] }),
                            " ",
                            isEn ? "Ideal state for focus, core strategic planning, and reflection. Appreciate and anchor this state." : language === "tr" ? "Odaklanma, temel stratejik planlama ve yans\u0131tma i\xE7in ideal durum. Bu durumu takdir edin ve sabitleyin." : "Idealno stanje za fokus, strate\u0161ko planiranje i refleksiju. Zabele\u017Eite zahvalnost da ga usidrite."
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("strong", { children: [
                              isEn ? "\u{1F7E2} High Energy + High Pleasantness" : language === "tr" ? "\u{1F7E2} Y\xFCksek Enerji + Y\xFCksek Keyif" : "\u{1F7E2} Aktivna Pozitivna",
                              " ",
                              "(Radost, Motivisanost):"
                            ] }),
                            " ",
                            isEn ? "Excellent for collaboration, creative ideation, and action taking. Channel active energy immediately!" : language === "tr" ? "\u0130\u015Fbirli\u011Fi, yarat\u0131c\u0131 fikir ve eyleme ge\xE7mek i\xE7in m\xFCkemmeldir. Aktif enerjiyi hemen kanalize edin!" : "Odli\u010Dno za timski rad, kreativne ideje i akciju. Odmah usmerite ovu energiju na prioritet!"
                          ] })
                        ] })
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pt-2 space-y-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 tracking-wide uppercase", children: isEn ? "QUICK PRESETS (TAP TO SELECT):" : language === "tr" ? "HIZLI \xD6N AYARLAR (SE\xC7MEK \u0130\xC7\u0130N DOKUNUN):" : "BRZI PRESETI STANJA (NEUROLO\u0160KI PRESETI):" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex flex-wrap gap-2", children: [
                      {
                        labelSr: "\u{1F50B} Iscrpljenost",
                        labelEn: "\u{1F50B} Drained",
                        e: -4,
                        p: -2
                      },
                      {
                        labelSr: "\u{1F9D8} Spokoj & Mir",
                        labelEn: "\u{1F9D8} Seranity",
                        e: -3,
                        p: 4
                      },
                      {
                        labelSr: "\u{1F680} Fokus & Strast",
                        labelEn: "\u{1F680} Passionate",
                        e: 4,
                        p: 3
                      },
                      {
                        labelSr: "\u{1F6A8} Pod stresom",
                        labelEn: "\u{1F6A8} Under Stress",
                        e: 3,
                        p: -4
                      },
                      {
                        labelSr: "\u{1F610} Neutralno",
                        labelEn: "\u{1F610} Balanced",
                        e: 0,
                        p: 0
                      }
                    ].map((pre, idx) => {
                      const isActive = energyRating === pre.e && pleasureRating === pre.p;
                      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            setEnergyRating(pre.e);
                            setPleasureRating(pre.p);
                            setHasInteractedEnergy(true);
                            setHasInteractedPleasure(true);
                            setMoodConfirmed(true);
                            triggerHaptics("light");
                          },
                          className: `px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 cursor-pointer border ${isActive ? "bg-[#007AFF] text-white border-[#007AFF] shadow-sm" : "bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5"}`,
                          children: isEn ? pre.labelEn : pre.labelSr
                        },
                        idx
                      );
                    }) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 pt-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)]/40 dark:bg-[#000000]/20 rounded-xl border border-black/5 dark:border-white/5 space-y-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between items-center text-[13px]", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "font-bold text-black dark:text-white flex items-center gap-1.5", children: [
                          "\u26A1 ",
                          isEn ? "Energy Level" : language === "tr" ? "Enerji Seviyesi" : "Nivo Fiziolo\u0161ke Energije"
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "span",
                          {
                            className: `px-2 py-0.5 rounded-md text-xs font-bold ${energyRating >= 0 ? "bg-[#FF9500]/15 text-[#FF9500]" : "bg-[#007AFF]/15 text-[#007AFF]"}`,
                            children: energyRating > 0 ? `+${energyRating}` : energyRating
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => {
                              setEnergyRating((prev) => Math.max(-5, prev - 1));
                              setHasInteractedEnergy(true);
                              setMoodConfirmed(true);
                              triggerHaptics("light");
                            },
                            className: "w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-sm text-black dark:text-white select-none hover:bg-black/5 active:scale-90 cursor-pointer shadow-sm",
                            children: "\u2212"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex-1 relative flex items-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "input",
                          {
                            type: "range",
                            min: "-5",
                            max: "5",
                            step: "1",
                            value: energyRating,
                            onChange: (e) => {
                              setEnergyRating(Number(e.target.value));
                              setHasInteractedEnergy(true);
                              setMoodConfirmed(true);
                            },
                            className: "w-full accent-[#FF9500] h-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-lg cursor-pointer"
                          }
                        ) }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => {
                              setEnergyRating((prev) => Math.min(5, prev + 1));
                              setHasInteractedEnergy(true);
                              setMoodConfirmed(true);
                              triggerHaptics("light");
                            },
                            className: "w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-sm text-black dark:text-white select-none hover:bg-black/5 active:scale-90 cursor-pointer shadow-sm",
                            children: "+"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between text-[11px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "-5 Fatigue" : language === "tr" ? "-5 Yorgunluk" : "-5 Iscrpljeno" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "+5 Charge" : language === "tr" ? "+5 Y\xFCk" : "+5 Prepuno" })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-2 bg-white/60 dark:bg-[#1C1C1E]/60 border border-black/5 dark:border-white/5 rounded-lg text-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[12px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80", children: energyRating <= -4 ? isEn ? "\u{1F50B} Extreme Fatigue" : language === "tr" ? "\u{1F50B} A\u015F\u0131r\u0131 Yorgunluk" : "\u{1F50B} Potpuna iscrpljenost i duboki umor" : energyRating <= -1 ? isEn ? "\u{1FAAB} Low Battery State" : language === "tr" ? "\u{1FAAB} D\xFC\u015F\xFCk Pil Durumu" : "\u{1FAAB} Smanjena energija, bazi\u010Dni umor" : energyRating === 0 ? isEn ? "\u{1F610} Baseline Line State" : language === "tr" ? "\u{1F610} Temel \xC7izgi Durumu" : "\u{1F610} Neutralno, mirno fizi\u010Dko stanje" : energyRating <= 3 ? isEn ? "\u26A1 Active & Awake" : language === "tr" ? "\u26A1 Aktif ve Uyan\u0131k" : "\u26A1 Aktivno, budno i kognitivno spremno" : isEn ? "\u{1F525} Peak Vitality Output" : language === "tr" ? "\u{1F525} Zirve Canl\u0131l\u0131k \xC7\u0131k\u0131\u015F\u0131" : "\u{1F525} Maksimalna vitalnost i visoka snaga" }) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)]/40 dark:bg-[#000000]/20 rounded-xl border border-black/5 dark:border-white/5 space-y-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between items-center text-[13px]", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "font-bold text-black dark:text-white flex items-center gap-1.5", children: [
                          "\u{1F3AD} ",
                          isEn ? "Pleasantness" : language === "tr" ? "Ho\u015Fluk" : "Biolo\u0161ka Prijatnost"
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "span",
                          {
                            className: `px-2 py-0.5 rounded-md text-xs font-bold ${pleasureRating >= 0 ? "bg-[#34C759]/15 text-[#34C759]" : "bg-[#FF3B30]/15 text-[#FF3B30]"}`,
                            children: pleasureRating > 0 ? `+${pleasureRating}` : pleasureRating
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => {
                              setPleasureRating((prev) => Math.max(-5, prev - 1));
                              setHasInteractedPleasure(true);
                              setMoodConfirmed(true);
                              triggerHaptics("light");
                            },
                            className: "w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-sm text-black dark:text-white select-none hover:bg-black/5 active:scale-90 cursor-pointer shadow-sm",
                            children: "\u2212"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex-1 relative flex items-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "input",
                          {
                            type: "range",
                            min: "-5",
                            max: "5",
                            step: "1",
                            value: pleasureRating,
                            onChange: (e) => {
                              setPleasureRating(Number(e.target.value));
                              setHasInteractedPleasure(true);
                              setMoodConfirmed(true);
                            },
                            className: "w-full accent-[#34C759] h-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-lg cursor-pointer"
                          }
                        ) }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => {
                              setPleasureRating((prev) => Math.min(5, prev + 1));
                              setHasInteractedPleasure(true);
                              setMoodConfirmed(true);
                              triggerHaptics("light");
                            },
                            className: "w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-sm text-black dark:text-white select-none hover:bg-black/5 active:scale-90 cursor-pointer shadow-sm",
                            children: "+"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between text-[11px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "-5 Stressor" : language === "tr" ? "-5 Stres etkeni" : "-5 Stresor" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "+5 Harmony" : language === "tr" ? "+5 Armoni" : "+5 Harmonija" })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-2 bg-white/60 dark:bg-[#1C1C1E]/60 border border-black/5 dark:border-white/5 rounded-lg text-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[12px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80", children: pleasureRating <= -4 ? isEn ? "\u{1F621} High Stress & Discomfort" : language === "tr" ? "\u{1F621} Y\xFCksek Stres ve Rahats\u0131zl\u0131k" : "\u{1F621} Visok stresor i nemir (Tenzija)" : pleasureRating <= -1 ? isEn ? "\u{1F61E} Discomfort & Pressure" : language === "tr" ? "\u{1F61E} Rahats\u0131zl\u0131k ve Bask\u0131" : "\u{1F61E} Blaga neprijatnost i pritisak" : pleasureRating === 0 ? isEn ? "\u{1F610} Neutral Balance" : language === "tr" ? "\u{1F610} N\xF6tr Denge" : "\u{1F610} Neutralna hormonska ravnote\u017Ea" : pleasureRating <= 3 ? isEn ? "\u{1F60C} Pleasant & Calm" : language === "tr" ? "\u{1F60C} Keyifli ve Sakin" : "\u{1F60C} Prijatnost i spokoj (Smirenost)" : isEn ? "\u{1F496} Peak Synergy State" : language === "tr" ? "\u{1F496} Sinerjinin Zirve Durumu" : "\u{1F496} Potpuna harmonija i stabilnost (Flow)" }) })
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    import_react4.motion.div,
                    {
                      className: "my-2",
                      animate: { x: [-2, 2, -2] },
                      transition: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "button",
                        {
                          type: "button",
                          onClick: () => setShowMoodMatrix(!showMoodMatrix),
                          className: "w-full py-2.5 px-4 flex items-center justify-between rounded-xl bg-[#007AFF]/5 active:opacity-70 dark:hover:bg-white/10 dark:bg-white/5 transition-colors border border-black/5 dark:border-white/5 group cursor-pointer",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-medium text-[#007AFF] dark:text-[#EBEBF5]/60", children: isEn ? "\u{1F50D} SHOW DETAILED GRID & EMOTIONS LIST" : language === "tr" ? "\u{1F50D} DETAYLI IZGARA VE DUYGULAR L\u0130STES\u0130N\u0130 G\xD6STER" : "\u{1F50D} PRIKA\u017DI DETALJNU MATRICU I LISTU EMOCIJA" }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              "span",
                              {
                                className: `transition-transform duration-350 ${showMoodMatrix ? "rotate-180" : ""}`,
                                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                  "svg",
                                  {
                                    className: "w-4 h-4 text-[#007AFF]",
                                    fill: "none",
                                    viewBox: "0 0 24 24",
                                    stroke: "currentColor",
                                    children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                      "path",
                                      {
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                        strokeWidth: 2.5,
                                        d: "M19 9l-7 7-7-7"
                                      }
                                    )
                                  }
                                )
                              }
                            )
                          ]
                        }
                      )
                    }
                  ),
                  showMoodMatrix && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    import_react4.motion.div,
                    {
                      initial: { opacity: 0, height: 0 },
                      animate: { opacity: 1, height: "auto" },
                      className: "space-y-4 pt-1",
                      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col md:flex-row gap-6 items-center w-full p-4 bg-white dark:bg-[#1C1C1E]/60 rounded-xl border border-black/5 dark:border-white/5", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "relative w-40 h-40 shrink-0 bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)]/50 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl overflow-hidden mx-auto", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "absolute inset-0 grid grid-cols-2 grid-rows-2", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              "div",
                              {
                                className: `border-r border-b border-black/5 dark:border-white/20 transition-colors duration-500 ${energyRating >= 0 && pleasureRating < 0 ? "bg-[#FF3B30] dark:bg-[#FF453A]/25 z-0" : ""}`
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              "div",
                              {
                                className: `border-b border-black/5 dark:border-white/20 transition-colors duration-500 ${energyRating >= 0 && pleasureRating >= 0 ? "bg-[#FF9500] dark:bg-[#FF9F0A]/25 z-0" : ""}`
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              "div",
                              {
                                className: `border-r border-black/5 dark:border-white/20 transition-colors duration-500 ${energyRating < 0 && pleasureRating < 0 ? "bg-[#007AFF]/25 z-0" : ""}`
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              "div",
                              {
                                className: `transition-colors duration-500 ${energyRating < 0 && pleasureRating >= 0 ? "bg-[#34C759] dark:bg-[#30D158]/25 z-0" : ""}`
                              }
                            )
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute top-1/2 left-0 w-full h-[1px] bg-black/5 dark:bg-white/5" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute top-0 left-1/2 h-full w-[1px] bg-black/5 dark:bg-white/5" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute top-1/2 left-0 w-full text-center -translate-y-[150%] text-[8px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-[0.1em] pointer-events-none", children: isEn ? "Pleasantness" : language === "tr" ? "Ho\u015Fluk" : "Prijatnost" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            "div",
                            {
                              className: "absolute top-0 left-1/2 h-full flex items-center -translate-x-[150%] text-[8px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-[0.1em] pointer-events-none",
                              style: { writingMode: "vertical-rl" },
                              children: isEn ? "Energy" : language === "tr" ? "Enerji" : "Energija"
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            import_react4.motion.div,
                            {
                              className: "absolute w-3.5 h-3.5 rounded-full border-[2px] border-white z-10",
                              animate: {
                                left: `${(pleasureRating + 5) / 10 * 100}%`,
                                top: `${100 - (energyRating + 5) / 10 * 100}%`,
                                x: "-50%",
                                y: "-50%",
                                backgroundColor: energyRating >= 0 ? pleasureRating >= 0 ? "#f59e0b" : "#ef4444" : pleasureRating >= 0 ? "#10b981" : "#6366f1"
                              },
                              transition: {
                                type: "spring",
                                stiffness: 250,
                                damping: 25
                              },
                              children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute inset-0 rounded-full transition-opacity opacity-50 bg-inherit w-full h-full" })
                            }
                          )
                        ] }),
                        (() => {
                          const group = getDynamicEmotionGroup(
                            energyRating,
                            pleasureRating
                          );
                          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex-1 space-y-2 text-left", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2 font-semibold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 tracking-wide", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-base leading-none", children: group.indicator }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                "span",
                                {
                                  className: isEvening ? "text-[#3C3C43] dark:text-[#EBEBF5]/80" : "text-black dark:text-white",
                                  children: group.title
                                }
                              )
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex flex-wrap gap-1", children: group.emotions.map((emo) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              "span",
                              {
                                className: "text-[13px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80",
                                children: emo
                              },
                              emo
                            )) }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-normal", children: isEn ? "\u{1F4A1} Emotions corresponding to your self-rating values on Dr. Marc Brackett's scientific quadrant." : language === "tr" ? "\u{1F4A1} Dr. Marc Brackett'in bilimsel kadran\u0131nda kendi derecelendirme de\u011Ferlerinize kar\u015F\u0131l\u0131k gelen duygular." : "\u{1F4A1} Emocije koje nau\u010Dno odgovaraju unetom koeficijentu na kognitivnom Mood Meteru." })
                          ] });
                        })()
                      ] })
                    }
                  )
                ]
              }
            ),
            analysisError && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              import_react4.motion.div,
              {
                initial: { opacity: 0, y: 5 },
                animate: { opacity: 1, y: 0 },
                className: "p-3 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10/30 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] text-xs font-semibold rounded-xl flex items-center gap-2",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.AlertTriangle, { className: "w-3.5 h-3.5 text-[#FF3B30] shrink-0" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: analysisError })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col sm:flex-row justify-between items-center gap-3.5 pt-4 border-t border-black/5 dark:border-white/20", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setStep(1);
                      triggerHaptics("light");
                    },
                    className: "text-xs font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-[#EBEBF5]/80 dark:hover:text-white flex items-center gap-1 cursor-pointer py-2 px-3 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/5 rounded-xl transition-all",
                    children: [
                      "\u2190 ",
                      isEn ? "Back to dump text" : language === "tr" ? "D\xF6k\xFCm metnine geri d\xF6n" : "Nazad na unos teksta"
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: () => setIsHistoryModalOpen(true),
                    className: "text-xs font-bold text-[#007AFF] hover:bg-[#007AFF]/10 dark:text-[#0A84FF] dark:hover:bg-[#0A84FF]/10 flex items-center gap-1 cursor-pointer py-2 px-3 rounded-xl transition-all",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.BookOpen, { className: "w-3.5 h-3.5" }),
                      isEn ? "Archive" : language === "tr" ? "Ar\u015Fiv" : "Arhiva unosa"
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3 w-full sm:w-auto justify-end", children: [
                brainDumpText.trim().length > 0 && !isAnalyzing && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  import_react4.motion.button,
                  {
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 },
                    onClick: () => {
                      setBrainDumpText("");
                      triggerHaptics("medium");
                    },
                    className: "px-4.5 py-3 border border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5 dark:hover:border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:hover:bg-[#1C1C1E] rounded-xl text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Trash2, { className: "w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Clear" : language === "tr" ? "Temizlemek" : "Isprazni" })
                    ]
                  }
                ),
                hasInteractedEnergy && hasInteractedPleasure && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  import_react4.motion.button,
                  {
                    type: "button",
                    onClick: handleAnalyzeBrainDump,
                    disabled: isAnalyzing,
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 },
                    whileTap: { scale: 0.95 },
                    whileHover: { scale: !isAnalyzing ? 1.02 : 1 },
                    transition: { duration: 0.3 },
                    className: "px-8 py-3.5 bg-[#007AFF] text-white disabled:opacity-60 disabled:bg-[#007AFF]/50 rounded-[14px] text-[15px] font-semibold cursor-pointer flex items-center gap-2 group shadow-sm transition-all hover:bg-[#007AFF]/90",
                    id: "btn-analyze-mind",
                    children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_react4.AnimatePresence, { mode: "wait", children: [
                      animationStatus === "loading" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        import_react4.motion.div,
                        {
                          initial: { opacity: 0, scale: 0.8 },
                          animate: { opacity: 1, scale: 1 },
                          exit: { opacity: 0, scale: 0.8 },
                          className: "flex items-center gap-2",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.RefreshCw, { className: "w-3.5 h-3.5 animate-spin text-[#007AFF]" }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Refining Map..." : language === "tr" ? "Harita hassasla\u015Ft\u0131r\u0131l\u0131yor..." : "Mapiranje..." })
                          ]
                        },
                        "loading"
                      ),
                      animationStatus === "success" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        import_react4.motion.div,
                        {
                          initial: { opacity: 0, scale: 0.8 },
                          animate: { opacity: 1, scale: 1 },
                          exit: { opacity: 0, scale: 0.8 },
                          className: "flex items-center gap-2 text-[#34C759] font-semibold",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              import_lucide_react2.Check,
                              {
                                className: "w-3.5 h-3.5 text-[#34C759]",
                                strokeWidth: 2.5
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Mind Synced!" : language === "tr" ? "Zihin Senkronize Edildi!" : "Um sinhronizovan!" })
                          ]
                        },
                        "success"
                      ),
                      animationStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        import_react4.motion.div,
                        {
                          initial: { opacity: 0, scale: 0.8 },
                          animate: { opacity: 1, scale: 1 },
                          exit: { opacity: 0, scale: 0.8 },
                          className: "flex items-center gap-2 text-[#FF3B30] font-semibold",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                              import_lucide_react2.X,
                              {
                                className: "w-3.5 h-3.5 text-[#FF3B30]",
                                strokeWidth: 2.5
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Error" : language === "tr" ? "Hata" : "Gre\u0161ka" })
                          ]
                        },
                        "error"
                      ),
                      animationStatus === "idle" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        import_react4.motion.div,
                        {
                          initial: { opacity: 0, scale: 0.8 },
                          animate: { opacity: 1, scale: 1 },
                          exit: { opacity: 0, scale: 0.8 },
                          className: "flex items-center gap-2",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Brain, { className: "w-4 h-4 text-[#007AFF] group-hover:scale-110 transition-transform" }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Analyze My Mind" : language === "tr" ? "Akl\u0131m\u0131 Analiz Et" : "Analiziraj moj um" })
                          ]
                        },
                        "idle"
                      )
                    ] })
                  }
                )
              ] })
            ] }),
            isAnalyzing && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_react4.motion.div,
              {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                className: "fixed inset-0 bg-[#0d0c13]/70 backdrop-blur-md flex items-center justify-center p-6 z-55",
                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "max-w-sm w-full bg-[#13111c] border border-white/5/80 rounded-xl p-8 text-center space-y-6 relative", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#007AFF]/10 rounded-full filter blur-xl transition-opacity pointer-events-none" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mx-auto w-12 h-12 border-dashed border-black/5 dark:border-white/5 border-t-transparent rounded-full animate-spin flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Sparkles, { className: "w-4 h-4 text-[#0A84FF] transition-opacity" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-2 relative z-10", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-sm font-semibold text-white font-sans", children: isEn ? "Cognitive Analysis Engine Active" : language === "tr" ? "Bili\u015Fsel Analiz Motoru Etkin" : "Kognitivni Analizator Aktivan" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold h-8 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "transition-opacity", children: brainDumpText.length < 200 ? isEn ? "\u2022 Mapping Brackett energy quadrant..." : language === "tr" ? "\u2022 Brackett enerji \xE7eyre\u011Finin haritalanmas\u0131..." : "\u2022 Mapiranje kognitivne energije..." : isEn ? "\u2022 Decrypting limiting mindset belief patterns..." : language === "tr" ? "\u2022 S\u0131n\u0131rlay\u0131c\u0131 zihniyet inan\xE7 kal\u0131plar\u0131n\u0131n \u015Fifresini \xE7\xF6zmek..." : "\u2022 Detekcija podvesnih obrazaca uverenja..." }) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-full bg-[#1C1C1E] dark:bg-[#3A3A3C] h-1.5 rounded-full overflow-hidden relative", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "div",
                    {
                      style: { width: `${loadingProgress}%` },
                      className: "bg-white dark:bg-[#1C1C1E] h-full rounded-full transition-all duration-150 ease-linear"
                    }
                  ) })
                ] })
              }
            )
          ]
        },
        "energy-mood-workspace"
      ),
      false,
      false,
      step === 4 && parsedData && !isAnalyzing && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        import_react4.motion.div,
        {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
          className: "space-y-6 text-left",
          id: "morning-screen-4",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#FF9500] block font-medium uppercase tracking-wide", children: isEn ? "STEP 03 OF 03 \u2022 BRACKETT MODEL" : language === "tr" ? "ADIM 03 / 03 \u2022 BRACKETT MODEL\u0130" : "KORAK 03 Od 03 \u2022 BRACKETT MODEL" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "text-lg font-semibold text-black dark:text-white tracking-wide", children: isEn ? "Today's Emotional Weather" : language === "tr" ? "Bug\xFCn\xFCn Duygusal Havas\u0131" : "Va\u0161a dana\u0161nja emotivna prognostika" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold", children: isEn ? "Confirm your baseline weather registry before looking at the tasks breakdown." : language === "tr" ? "G\xF6revlerin d\xF6k\xFCm\xFCne bakmadan \xF6nce temel hava durumu kay\u0131tlar\u0131n\u0131z\u0131 do\u011Frulay\u0131n." : "Potvrdite svoje bazi\u010Dno raspolo\u017Eenje i uzro\u010Dnike pre detaljnog pregleda planova." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-4 sm:p-6 md:col-span-2 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden text-black dark:text-white", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 relative z-10 w-full", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-16 h-16 rounded-xl bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 border border-black/5 dark:border-white/20 flex items-center justify-center text-xl text-[#3C3C43] select-none shrink-0", children: getWeatherEmoji(parsedData.weather) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1 min-w-0 flex-1", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[13px] font-semibold text-[#5856D6] block whitespace-normal break-words", children: [
                    "\u{1F50B} ENERGY: ",
                    parsedData.energy_score,
                    "% | \u{1F321}\uFE0F CLIMATE CLARITY: ",
                    parsedData.climate_score,
                    "%"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-xl font-semibold text-white flex items-center gap-1.5", children: parsedData.weather }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-xs text-[#555555] dark:text-[#EBEBF5]/60 font-medium max-w-sm leading-relaxed", children: [
                    parsedData.state === "OVERLOADED" && (isEn ? "Your cognitive engine is fueled up, but workload density has spiked. Focus on close loops first." : language === "tr" ? "Bili\u015Fsel motorunuz g\xFC\xE7lendi ancak i\u015F y\xFCk\xFC yo\u011Funlu\u011Fu artt\u0131. \xD6nce yak\u0131n d\xF6ng\xFClere odaklan\u0131n." : "Va\u0161a energija je visoka, ali ste preplavljeni zadacima. Prioritet je zatvaranje otvorenih krugova."),
                    parsedData.state === "DRAINED" && (isEn ? "Your energy bank is running low, feeling fuzzy. Pace operations through micro modifications." : language === "tr" ? "Enerji bankan\u0131z azal\u0131yor, bulan\u0131k hissediyorsunuz. Mikro de\u011Fi\u015Fikliklerle operasyonlara h\u0131z kazand\u0131r\u0131n." : "Zaliha energije je niska, ose\u0107ate maglu. Smanjite optere\u0107enje i gradite male dobitke."),
                    parsedData.state === "BALANCED" && (isEn ? "Calm operational environment. Highly optimal baseline for long-term strategic life analysis." : language === "tr" ? "Sakin \xE7al\u0131\u015Fma ortam\u0131. Uzun vadeli stratejik ya\u015Fam analizi i\xE7in son derece optimal temel \xE7izgi." : "Mirna svest. Odli\u010Dan nivo za stabilno, dugoro\u010Dno \u017Eivotno planiranje i harmoniju."),
                    parsedData.state === "FOCUSED" && (isEn ? "Optimal battery alignment! You are vital, motivated and clear-headed. Execute peak goals." : language === "tr" ? "Optimum pil hizalamas\u0131! Hayat dolu, motive ve a\xE7\u0131k fikirli birisin. Zirve hedeflerini ger\xE7ekle\u015Ftirin." : "Izvanredno stanje snage! Jasna glava i pogon. Iskoristite vrhunac za najte\u017Ee ciljeve.")
                  ] })
                ] })
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-6 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl flex flex-col justify-between h-auto gap-4 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block font-medium", children: isEn ? "Brackett Register" : language === "tr" ? "Brackett Kay\u0131t Ol" : "Matrica Brackett" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h5", { className: "text-xs font-semibold tracking-wide text-black dark:text-white", children: isEn ? "Operational Quadrant" : language === "tr" ? "Operasyonel \xC7eyrek" : "Operativni kvadrant" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-2 pt-1 text-[#3C3C43] dark:text-[#EBEBF5]/80", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "State Indicator:" : language === "tr" ? "Durum G\xF6stergesi:" : "Identifikator stanja:" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[#007AFF] dark:text-[#0A84FF] font-semibold", children: parsedData.state })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Quadrant Tag:" : language === "tr" ? "\xC7eyrek Etiketi:" : "Naziv kvadranta:" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[#FF9500] font-semibold", children: parsedData.quadrant })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-full h-1 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "div",
                  {
                    className: "h-full bg-[#007AFF]",
                    style: { width: `${parsedData.energy_score || 50}%` }
                  }
                ) })
              ] })
            ] }),
            parsedData.cognitive_chain && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-5 sm:p-6 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Sparkles, { className: "w-4 h-4 text-[#007AFF] transition-opacity" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#5856D6] dark:text-[#5E5CE6] block font-medium", children: isEn ? "AI COGNITIVE TRANSLATION LOOP" : language === "tr" ? "Yapay Zeka Bili\u015Fsel \xC7eviri D\xF6ng\xFCs\xFC" : "AI KOGNITIVNI LANAC TRANSLACIJE" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 rounded-xl space-y-1 relative", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold block", children: isEn ? "1. EMOTION SIGNAL" : language === "tr" ? "1. DUYGU S\u0130NYAL\u0130" : "1. EMOCIONALNI SIGNAL" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "text-xs font-semibold text-[#FF3B30] dark:text-[#FF3B30] flex items-center gap-1.5 pt-1", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-2 h-2 rounded-full bg-[#FF3B30] dark:bg-[#FF453A] transition-opacity shrink-0" }),
                    parsedData.cognitive_chain?.emotion || selectedEmotion || parsedData.emotions?.[0]
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-semibold leading-relaxed pt-1", children: isEn ? "Emotion is just an initial operational signal, never the final output." : language === "tr" ? "Duygu yaln\u0131zca bir ba\u015Flang\u0131\xE7 \u200B\u200Boperasyonel sinyalidir, asla nihai \xE7\u0131kt\u0131 de\u011Fildir." : "Emocija je samo po\u010Detni operativni signal, nikada krajnji ishod." })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 rounded-xl space-y-1 relative", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold block", children: isEn ? "2. DETECTED ROOT CAUSE" : language === "tr" ? "2. TESP\u0130T ED\u0130LEN K\xD6K SEBEP" : "2. DETEKTOVANI UZROK" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-xs font-semibold text-black dark:text-white leading-tight pt-1", children: parsedData.cognitive_chain?.root_cause || (isEn ? "Internal clutter" : language === "tr" ? "\u0130\xE7 kar\u0131\u015F\u0131kl\u0131k" : "Mentalni nered") }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-semibold leading-relaxed", children: isEn ? "The real structural or situational driver behind your current mental friction." : language === "tr" ? "Mevcut zihinsel s\xFCrt\xFC\u015Fmelerinizin ard\u0131ndaki ger\xE7ek yap\u0131sal veya durumsal etken." : "Skriveni logisti\u010Dki, situacioni ili mentalni pokreta\u010D trenja." })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 rounded-xl space-y-1 relative", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold block", children: isEn ? "3. COGNITIVE NEED" : language === "tr" ? "3. B\u0130L\u0130\u015ESEL \u0130HT\u0130YA\xC7" : "3. KOGNITIVNA POTREBA" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "text-xs font-semibold text-[#5856D6] dark:text-[#5E5CE6] pt-1", children: [
                    "\u2726",
                    " ",
                    parsedData.cognitive_chain?.need || (isEn ? "Clarity" : language === "tr" ? "Netlik" : "Jasno\u0107a")
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-semibold leading-relaxed pt-1", children: isEn ? "What your brain genuinely requires to release tension." : language === "tr" ? "Beyninizin gerginli\u011Fi serbest b\u0131rakmak i\xE7in ger\xE7ekten neye ihtiyac\u0131 var?" : "Kognitivni uslov koji va\u0161 mozak mora ispuniti da se opusti." })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20 border border-black/5 dark:border-white/20 rounded-xl flex flex-col justify-between space-y-1 relative", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-semibold block", children: isEn ? "4. IDEAL INTERVENTION" : language === "tr" ? "4. \u0130DEAL M\xDCDAHALE" : "4. NAJBOLJA INTERVENCIJA" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "text-xs font-semibold text-[#34C759] dark:text-[#34C759] pt-1", children: [
                      "\u{1F449}",
                      " ",
                      parsedData.cognitive_chain?.intervention_name || (isEn ? "Priority Board" : language === "tr" ? "\xD6ncelik Kurulu" : "Prioritetna tabla")
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-semibold leading-relaxed", children: isEn ? "The optimal targeted system module for fast and secure relief." : language === "tr" ? "H\u0131zl\u0131 ve g\xFCvenli yard\u0131m i\xE7in en uygun hedefe y\xF6nelik sistem mod\xFCl\xFC." : "Operativni modul koji re\u0161ava koren problem." })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      onClick: () => {
                        if (parsedData.recommendedModule === "mindset") {
                          safeStorage.setItem(
                            "abcde_pending_mindset_tab",
                            parsedData.recommended_framework === "biohacking" ? "biohack" : parsedData.recommended_framework
                          );
                          if (parsedData?.mindset?.ta_insight) {
                            safeStorage.setItem(
                              "abcde_pending_ta_insight",
                              parsedData.mindset.ta_insight
                            );
                          }
                          window.dispatchEvent(
                            new CustomEvent("switch-tab", {
                              detail: {
                                tab: "mindset",
                                thought: parsedData?.brainDump || parsedData?.mindset?.details || ""
                              }
                            })
                          );
                        } else {
                          onNavigateToTab(
                            parsedData.recommendedModule
                          );
                        }
                      },
                      className: "w-full mt-2 py-2 bg-[#007AFF] active:opacity-70 font-semibold rounded-lg text-[13px] text-white text-center transition-all cursor-pointer flex items-center justify-center gap-1",
                      children: [
                        "\u26A1 ",
                        isEn ? "EXECUTE MODULE" : language === "tr" ? "MOD\xDCL\xDC Y\xDCR\xDCT" : "OTVORI MODUL"
                      ]
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 bg-[#007AFF]/10 dark:bg-[#1C1C1E]/10 border border-black/5 dark:border-white/5/40 rounded-xl flex items-start sm:items-center gap-3.5 font-sans", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-8 h-8 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 border border-black/5 dark:border-white/5 flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF] shrink-0 text-[17px] font-semibold", children: "\u{1F4A1}" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-0.5 text-left", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-semibold text-[#007AFF] dark:text-[#EBEBF5]/60 tracking-wide block", children: isEn ? "System Dynamic Insights" : language === "tr" ? "Sistem Dinamik \u0130\xE7g\xF6r\xFCleri" : "Sistemska kognitivna preporuka" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed font-semibold", children: parsedData.cognitive_chain?.action_guideline || (isEn ? "Evaluate your tasks." : language === "tr" ? "G\xF6revlerinizi de\u011Ferlendirin." : "Pregledajte svoje zadatke.") })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark: dark: border border-black/5 dark:border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start gap-4", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xl select-none pt-0.5", children: "\u{1F9EC}" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1 text-left", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-semibold block select-none", children: isEn ? "BIOLOGICAL HYPER-RESET ADVICE (BIOHACK)" : language === "tr" ? "B\u0130YOLOJ\u0130K H\u0130PER-RESET TAVS\u0130YES\u0130 (BIOHACK)" : "BIOLO\u0160KI SAVET ZA RESET POTREBE (BIOHACKING)" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold leading-relaxed", children: isGeneratingBiohack ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "flex items-center gap-2 text-[#007AFF] transition-opacity", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Loader2, { className: "w-3.5 h-3.5 animate-spin" }),
                      isEn ? "Assembling cutting-edge cognitive biohack..." : language === "tr" ? "Son teknoloji bili\u015Fsel biyohack'i bir araya getiriyoruz..." : "Lansiramo neuronau\u010Dni biohack..."
                    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                      renderFormattedBiohack(
                        biohackTip || (isEn ? "Load custom biohack using refresh icon" : language === "tr" ? "Yenileme simgesini kullanarak \xF6zel biohack y\xFCkleyin" : "U\u010Ditaj personalizovani biohak klikom na ikonicu.")
                      ),
                      suggestedBiohackHabit && !isGeneratingBiohack && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "button",
                        {
                          onClick: () => {
                            onAddTask(
                              `\u26A1 Biohack: ${suggestedBiohackHabit.name}`,
                              `${isEn ? "Micro-routine:" : language === "tr" ? "Mikro rutin:" : "Mikrorutina:"} ${suggestedBiohackHabit.twoMinVersion}`,
                              "B"
                            );
                            window.dispatchEvent(
                              new CustomEvent("trigger-toast", {
                                detail: {
                                  message: isEn ? "Added micro-routine to today's plan! \u{1F4D1}" : language === "tr" ? "Bug\xFCnk\xFC plana mikro rutin eklendi! \u{1F4D1}" : "Dodata mikrorutina dana\u0161njem planu! \u{1F4D1}",
                                  type: "success"
                                }
                              })
                            );
                          },
                          className: "mt-3 px-3 py-1.5 bg-[#007AFF] text-white rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-colors active:scale-95",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckSquare, { className: "w-3.5 h-3.5" }),
                            isEn ? "Add Micro-routine to Today" : language === "tr" ? "Bug\xFCne Mikro Rutin Ekle" : "Dodaj mikrorutinu u dana\u0161nji plan"
                          ]
                        }
                      )
                    ] }) })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    onClick: () => fetchBiohackTip(
                      parsedData.cognitive_chain?.need || "Clarity",
                      biohackTip
                    ),
                    disabled: isGeneratingBiohack,
                    className: "p-2 sm:p-2.5 rounded-xl bg-[#007AFF]/10 dark:bg-white/5 dark:text-[#0A84FF] active:opacity-70 dark:active:opacity-70 transition-colors shrink-0 flex items-center justify-center gap-1.5 self-end md:self-auto font-semibold text-[13px] text-white active:scale-95 cursor-pointer",
                    title: isEn ? "Get another/different biohack tip" : language === "tr" ? "Ba\u015Fka/farkl\u0131 bir biohack ipucu al\u0131n" : "Daj mi jo\u0161 jedan savet",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        import_lucide_react2.RefreshCw,
                        {
                          className: `w-3.5 h-3.5 ${isGeneratingBiohack ? "animate-spin" : ""}`
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "GIVE ME MORE" : language === "tr" ? "BANA DAHA FAZLASINI VER" : "DAJ MI JO\u0160" })
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-0.5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block", children: isEn ? "Which word feels closest right now?" : language === "tr" ? "\u015Eu anda hangi kelime sana en yak\u0131n geliyor?" : "Koja re\u010D najpreciznije opisuje trenutni ose\u0107aj?" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-semibold leading-none", children: isEn ? "Select one emotional state for your daily logs." : language === "tr" ? "G\xFCnl\xFCk g\xFCnl\xFCkleriniz i\xE7in bir duygusal durum se\xE7in." : "Izaberite jedno primarno raspolo\u017Eenje za dana\u0161nji kognitivni registar." })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex flex-wrap gap-2.5", children: parsedData.emotions?.map((em) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  onClick: () => setSelectedEmotion(em),
                  className: `px-4 py-2.5 rounded-xl border text-xs font-semibold tracking-wide cursor-pointer transition-all ${selectedEmotion === em ? "bg-[#FF9500] dark:bg-[#FF9F0A] text-white border-[#FF9500] dark:border-[#FF9F0A]/10 scale-102" : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/5"}`,
                  children: em
                },
                em
              )) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-0.5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block", children: isEn ? "Likely Drivers & Trigger Causes" : language === "tr" ? "Olas\u0131 S\xFCr\xFCc\xFCler ve Tetikleyici Nedenler" : "Detektovani uzro\u010Dnici i okida\u010Di stanja" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-semibold leading-none", children: isEn ? "Confirm or toggle likely factors for your cognitive strain today." : language === "tr" ? "Bug\xFCn bili\u015Fsel zorlanman\u0131z i\xE7in olas\u0131 fakt\xF6rleri onaylay\u0131n veya de\u011Fi\u015Ftirin." : "Potvrdite ili izmenite uzroke koji uti\u010Du na raspolo\u017Eenje i nivo stresa." })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: parsedData.drivers?.map((drv) => {
                const isChecked = confirmedDrivers.includes(drv);
                return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      if (isChecked) {
                        setConfirmedDrivers(
                          confirmedDrivers.filter((d) => d !== drv)
                        );
                      } else {
                        setConfirmedDrivers([...confirmedDrivers, drv]);
                      }
                    },
                    className: `p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${isChecked ? "bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20 border-black/5 dark:border-white/5 text-[#007AFF] dark:text-[#0A84FF] font-semibold" : "bg-white dark:bg-[#000000] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold"}`,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xs tracking-wide", children: drv }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "span",
                        {
                          className: `w-4 items-center justify-center flex h-4 rounded border text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 ${isChecked ? "bg-[#007AFF] border-black/5 dark:border-white/5 text-white" : "border-black/5 dark:border-white/5"}`,
                          children: isChecked ? "\u2713" : ""
                        }
                      )
                    ]
                  },
                  drv
                );
              }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  onClick: () => setStep(1),
                  className: "text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1 cursor-pointer",
                  children: [
                    "\u2190 ",
                    isEn ? "Back" : language === "tr" ? "Geri" : "Nazad"
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  onClick: () => setStep(5),
                  className: "px-6 py-2.5 bg-[#1C1C1E] dark:bg-[#3A3A3C] dark:text-white text-white hover:opacity-95 active:scale-97 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "View Parsed Results" : language === "tr" ? "Ayr\u0131\u015Ft\u0131r\u0131lm\u0131\u015F Sonu\xE7lar\u0131 G\xF6r\xFCnt\xFCle" : "Slede\u0107e: Pregledaj rezultate" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.ArrowRight, { className: "w-3.5 h-3.5" })
                  ]
                }
              )
            ] })
          ]
        },
        "weather-screen"
      ),
      step === 5 && parsedData && !isAnalyzing && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        import_react4.motion.div,
        {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          className: "space-y-6",
          id: "morning-screen-5",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "text-[22px] font-bold text-black dark:text-white tracking-tight leading-none mb-1", children: isEn ? "Brain Architecture" : language === "tr" ? "Beyin Mimarisi" : "Arhitektura tvog uma" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium", children: isEn ? "Strategic extraction from your morning dump" : language === "tr" ? "Sabah d\xF6k\xFCm\xFCn\xFCzden stratejik \xE7\u0131karma" : "Strate\u0161ki izve\u0161taj tvog jutarnjeg toka misli" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 self-stretch sm:self-auto", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "button",
                  {
                    onClick: () => setSelectedMorningView("bento"),
                    className: `flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${selectedMorningView === "bento" ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-[#007AFF]" : "text-[#8E8E93]"}`,
                    children: isEn ? "Bento Grid" : language === "tr" ? "Izgara" : "Bento Pregled"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "button",
                  {
                    onClick: () => setSelectedMorningView("mindmap"),
                    className: `flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${selectedMorningView === "mindmap" ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-[#007AFF]" : "text-[#8E8E93]"}`,
                    children: isEn ? "Visual Map" : language === "tr" ? "Zihin Haritas\u0131" : "Vizuelna Mapa"
                  }
                )
              ] })
            ] }),
            selectedMorningView === "mindmap" ? (
              /* Visual Mind Map View */
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                import_react4.motion.div,
                {
                  initial: { opacity: 0, scale: 0.98 },
                  animate: { opacity: 1, scale: 1 },
                  className: "relative min-h-[520px] bg-white dark:bg-[#000000] rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden shadow-2xl p-6 flex flex-col items-center justify-center",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#007AFF_1px,transparent_1px)] [background-size:20px_20px]" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      import_react4.motion.div,
                      {
                        animate: { y: [0, -5, 0] },
                        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                        className: "z-10 w-24 h-24 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0A84FF] shadow-xl shadow-[#007AFF]/30 flex flex-col items-center justify-center text-white text-center p-2 relative",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute -inset-2 rounded-full border border-[#007AFF]/20 animate-ping opacity-30" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1", children: "CORE" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-black leading-tight", children: parsedData.cognitive_chain?.need || "Clarity" })
                        ]
                      }
                    ),
                    [
                      { label: isEn ? "Tasks" : language === "tr" ? "G\xF6revler" : "Zadaci", color: "#5856D6", data: parsedData.tasks, angle: -45, icon: "\u{1F4CB}" },
                      { label: isEn ? "Worries" : language === "tr" ? "Endi\u0161eler" : "Brige", color: "#FF3B30", data: parsedData.worries, angle: 45, icon: "\u{1F9E0}" },
                      { label: isEn ? "Ideas" : language === "tr" ? "Fikirler" : "Ideje", color: "#FF9500", data: parsedData.ideas, angle: 135, icon: "\u{1F4A1}" },
                      { label: isEn ? "Goals" : language === "tr" ? "Hedefler" : "Ciljevi", color: "#007AFF", data: parsedData.goals, angle: 225, icon: "\u{1F3AF}" }
                    ].map((branch, i) => {
                      const radius = 140;
                      const x = Math.cos(branch.angle * Math.PI / 180) * radius;
                      const y = Math.sin(branch.angle * Math.PI / 180) * radius;
                      const count = branch.data?.length || 0;
                      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "absolute flex items-center justify-center", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { className: "absolute w-80 h-80 pointer-events-none", style: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          import_react4.motion.line,
                          {
                            initial: { pathLength: 0, opacity: 0 },
                            animate: { pathLength: 1, opacity: 0.2 },
                            transition: { duration: 1, delay: 0.2 + i * 0.1 },
                            x1: "160",
                            y1: "160",
                            x2: 160 + x,
                            y2: 160 + y,
                            stroke: branch.color,
                            strokeWidth: "2",
                            strokeDasharray: "4 4"
                          }
                        ) }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          import_react4.motion.div,
                          {
                            initial: { opacity: 0, scale: 0 },
                            animate: { opacity: 1, scale: 1, x, y },
                            whileHover: { scale: 1.05 },
                            className: "w-16 h-16 rounded-2xl bg-white dark:bg-[#1C1C1E] border-2 shadow-lg flex flex-col items-center justify-center gap-1 transition-all",
                            style: { borderColor: branch.color + "20" },
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-lg", children: branch.icon }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[10px] font-black text-[#3C3C43] dark:text-white leading-none", children: count })
                            ]
                          }
                        ),
                        branch.data?.slice(0, 3).map((item, j) => {
                          const subAngle = branch.angle + (j - 1) * 20;
                          const subRadius = radius + 40;
                          const sx = Math.cos(subAngle * Math.PI / 180) * subRadius;
                          const sy = Math.sin(subAngle * Math.PI / 180) * subRadius;
                          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            import_react4.motion.div,
                            {
                              initial: { opacity: 0 },
                              animate: { opacity: 1, x: sx, y: sy },
                              transition: { delay: 0.5 + i * 0.1 + j * 0.1 },
                              className: "absolute w-1.5 h-1.5 rounded-full shadow-sm",
                              style: { backgroundColor: branch.color }
                            },
                            j
                          );
                        })
                      ] }, i);
                    }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "absolute bottom-10 left-1/2 -translate-x-1/2 text-center space-y-2", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest animate-pulse", children: isEn ? "Interactive Map" : language === "tr" ? "Etkile\u015Fimli Harita" : "Interaktivna mapa" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[12px] text-[#3C3C43] dark:text-[#EBEBF5]/60 max-w-[200px] leading-tight", children: isEn ? "Strategic clusters identified. Switch to Bento view for actions." : language === "tr" ? "Stratejik k\xFCmeler belirlendi. Eylemler i\xE7in Bento g\xF6r\xFCn\xFCm\xFCne ge\xE7in." : "Identifikovani su strate\u0161ki klasteri. Pre\u0111i na Bento pregled za akcije." })
                    ] })
                  ]
                }
              )
            ) : (
              /* Bento Grid View - Polished Apple HIG Style */
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-6 w-full", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-5 bg-gradient-to-r from-[#007AFF]/5 via-[#34C759]/5 to-[#FF9500]/5 dark:from-[#0A84FF]/10 dark:via-[#30D158]/5 dark:to-[#FF9F0A]/5 border border-black/5 dark:border-white/5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] rounded-2xl space-y-4", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col lg:flex-row lg:items-center justify-between gap-4", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1 text-left", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-2 h-2 rounded-full bg-[#007AFF] animate-pulse" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[11px] text-[#007AFF] dark:text-[#0A84FF] font-bold uppercase tracking-widest block", children: isEn ? "Global Brain Map Sync" : language === "tr" ? "Global Beyin Haritas\u0131 Senkronizasyonu" : "Globalna Sinhronizacija Kognitivne Mape" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-sm font-bold text-black dark:text-white leading-snug", children: isEn ? "Sync and Arrange Everything" : language === "tr" ? "Her \u015Eeyi Senkronize Et ve D\xFCzenle" : "Rasporedi sve odjednom" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#3C3C43]/80 dark:text-[#EBEBF5]/65 leading-relaxed max-w-2xl font-semibold", children: isEn ? "Automatically maps all tasks, recommended goals and ideas to the ABCDE Priority Board." : language === "tr" ? "T\xFCm g\xF6revleri, \xF6nerilen hedefleri ve fikirleri otomatik olarak ABCDE \xD6ncelik Tablosuna e\u015Fler." : "Automatski uvozi zadatke, preporu\u010Dene ciljeve i ideje u odgovaraju\u0107e sekcije ABCDE prioriteta." })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-wrap items-center gap-2.5 shrink-0", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleSyncTasksToBoard(),
                        disabled: isTasksSynced,
                        className: `px-4 py-2.5 rounded-xl font-bold text-[11px] cursor-pointer border transition-all flex items-center justify-center gap-2 whitespace-nowrap ${isTasksSynced ? "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20" : "bg-white dark:bg-[#1C1C1E] text-black dark:text-white border-black/10 dark:border-white/10 hover:bg-black/5 shadow-sm active:scale-95"}`,
                        children: [
                          isTasksSynced ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Check, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckSquare, { className: "w-3.5 h-3.5" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Only Tasks" : language === "tr" ? "Sadece G\xF6revler" : "Samo zadatke" })
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleSyncAllToBoard(),
                        disabled: isTasksSynced && syncedGoals.size === (parsedData.goals?.length || 0) && syncedIdeas.size === (parsedData.ideas?.length || 0),
                        className: `px-5 py-3 rounded-xl font-bold text-[11px] cursor-pointer border transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-[#007AFF] hover:bg-[#007AFF]/90 active:scale-95 text-white border-transparent shadow-md disabled:opacity-50 disabled:grayscale disabled:pointer-events-none`,
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Sparkles, { className: "w-3.5 h-3.5" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Arrange All (Tasks, Goals, Ideas)" : language === "tr" ? "Hepsini D\xFCzenle (G\xF6revler, Hedefler, Fikirler)" : "Rasporedi sve (Zadaci, ciljevi, ideje)" })
                        ]
                      }
                    )
                  ] })
                ] }) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0 w-full", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-3.5", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "div",
                      {
                        onClick: () => setExpandedCard({
                          type: isEn ? "Cognitive Need" : language === "tr" ? "Bili\u015Fsel \u0130htiya\xE7" : "Kognitivna Potreba",
                          title: parsedData.cognitive_chain?.need || (isEn ? "Clarity and Control" : language === "tr" ? "Netlik ve Kontrol" : "Jasno\u0107a i kontrola"),
                          description: isEn ? "Biological reset focus based on your current state." : language === "tr" ? "Mevcut durumunuza g\xF6re biyolojik s\u0131f\u0131rlama oda\u011F\u0131." : "Fokus biolo\u0161kog reseta na osnovu va\u0161eg stanja."
                        }),
                        className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#000000]/40 p-3.5 rounded-xl border border-white/50 dark:border-white/5 cursor-pointer hover:border-[#007AFF]/50 transition-colors",
                        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start gap-3 text-left", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-2xl select-none pt-0.5", children: "\u{1F9EC}" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-semibold block select-none", children: isEn ? "BIOLOGICAL RESET CORE (COGNITIVE BIOHACK)" : language === "tr" ? "B\u0130YOLOJ\u0130K RESET \xC7EK\u0130RDE\u011E\u0130 (KOGN\u0130T\u0130F B\u0130OHACK)" : "BIOLO\u0160KI RESET (KOGNITIVNI BIOHAKING)" }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-xs font-semibold text-black dark:text-white tracking-wide", children: isEn ? `Solving Need: ${parsedData.cognitive_chain?.need || "Clarity"}` : language === "tr" ? `\xC7\xF6z\xFCm \u0130htiyac\u0131: ${parsedData.cognitive_chain?.need || "Clarity"}` : `Re\u0161enje za potrebu: ${parsedData.cognitive_chain?.need || "Jasno\u0107a"}` })
                          ] })
                        ] })
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-4 bg-white dark:bg-[#000000]/70 rounded-xl border border-black/5 dark:border-white/5/80", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-relaxed text-left", children: isGeneratingBiohack ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "flex items-center gap-2 text-[#007AFF] transition-opacity font-medium", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Loader2, { className: "w-4 h-4 animate-spin" }),
                      isEn ? "Poking the cognitive neuroscience advisor for more customized solutions..." : language === "tr" ? "Daha ki\u015Fiselle\u015Ftirilmi\u015F \xE7\xF6z\xFCmler i\xE7in bili\u015Fsel sinirbilim dan\u0131\u015Fman\u0131n\u0131 d\xFCrtmek..." : "Kontaktiramo neuronau\u010Dnog savetnika u potrazi za novim biohaking re\u0161enjima..."
                    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "div",
                        {
                          className: "cursor-pointer hover:opacity-80 transition-opacity",
                          onClick: (e) => {
                            e.stopPropagation();
                            setExpandedCard({
                              type: isEn ? "Biohack Advice" : language === "tr" ? "Biohack Tavsiyeleri" : "Biohaking Savet",
                              description: biohackTip || (isEn ? "Wait for generation..." : language === "tr" ? "Nesli bekle..." : "Sa\u010Dekaj da se generi\u0161e..."),
                              explanation: isEn ? "Drawn from current biological profile." : language === "tr" ? "Mevcut biyolojik profilden al\u0131nm\u0131\u015Ft\u0131r." : "Zasnovano na unetom nivou energije."
                            });
                          },
                          children: renderFormattedBiohack(
                            biohackTip || (isEn ? "Generating dynamic, high-potency biohack based on your current pleasantness & energy state..." : language === "tr" ? "Mevcut keyif ve enerji durumunuza dayal\u0131 olarak dinamik, y\xFCksek etkili biyolojik hack olu\u015Fturuluyor..." : "Generi\u0161emo kognitivni biohak u skladu sa unetim nivoima energije i prijatnosti...")
                          )
                        }
                      ),
                      suggestedBiohackHabit && !isGeneratingBiohack && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "button",
                        {
                          onClick: (e) => {
                            e.stopPropagation();
                            onAddTask(
                              `\u26A1 Biohack: ${suggestedBiohackHabit.name}`,
                              `${isEn ? "Micro-routine:" : language === "tr" ? "Mikro rutin:" : "Mikrorutina:"} ${suggestedBiohackHabit.twoMinVersion}`,
                              "B"
                            );
                            window.dispatchEvent(
                              new CustomEvent("trigger-toast", {
                                detail: {
                                  message: isEn ? "Added micro-routine to today's plan! \u{1F4D1}" : language === "tr" ? "Bug\xFCnk\xFC plana mikro rutin eklendi! \u{1F4D1}" : "Dodata mikrorutina dana\u0161njem planu! \u{1F4D1}",
                                  type: "success"
                                }
                              })
                            );
                          },
                          className: "mt-3 px-3 py-1.5 bg-[#007AFF] text-white rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-colors active:scale-95",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckSquare, { className: "w-3.5 h-3.5" }),
                            isEn ? "Add Micro-routine to Today" : language === "tr" ? "Bug\xFCne Mikro Rutin Ekle" : "Dodaj mikrorutinu u dana\u0161nji plan"
                          ]
                        }
                      )
                    ] }) }) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-3 md:col-span-2 lg:col-span-2 min-w-0", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h4", { className: "text-[13px] font-semibold text-[#5856D6] dark:text-[#5E5CE6] flex items-center gap-1.5 leading-none", children: [
                      "\u{1F4CB}",
                      " ",
                      isEn ? "Concrete Action Tasks" : language === "tr" ? "Somut Eylem G\xF6revleri" : "Konkretni zadaci za re\u0161avanje",
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] px-1.5 py-0.5 bg-[#007AFF]/10 dark:bg-[#1C1C1E] text-[#007AFF] dark:text-[#0A84FF] rounded-sm", children: parsedData.tasks?.length || 0 })
                    ] }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-2 max-h-56 overflow-y-auto pr-1", children: parsedData.tasks && parsedData.tasks.length > 0 ? parsedData.tasks.map((t, idx) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      "div",
                      {
                        onClick: () => setExpandedCard({
                          type: isEn ? "Task" : language === "tr" ? "G\xF6rev" : "Zadatak",
                          title: t.title,
                          category: `Kat ${t.category}`,
                          description: t.description,
                          explanation: t.explanation
                        }),
                        className: "p-2.5 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 rounded-xl space-y-1 font-sans text-left cursor-pointer hover:border-[#007AFF]/50 transition-colors min-w-0",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start justify-between gap-2 min-w-0", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xs font-medium text-black dark:text-white leading-snug break-words", children: t.title }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2 shrink-0", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => {
                                    if (isTasksSynced) return;
                                    e.stopPropagation();
                                    const cats = ["A", "B", "C", "D", "E"];
                                    const newTasks = [...parsedData.tasks];
                                    const currentIdx = cats.indexOf(newTasks[idx].category) !== -1 ? cats.indexOf(newTasks[idx].category) : 0;
                                    newTasks[idx].category = cats[(currentIdx + 1) % cats.length];
                                    setParsedData({
                                      ...parsedData,
                                      tasks: newTasks
                                    });
                                  },
                                  className: `text-[13px] font-semibold text-white px-2 py-0.5 rounded transition-transform ${!isTasksSynced ? "cursor-pointer hover:scale-105 active:scale-95" : ""} ${t.category === "A" ? "bg-[#FF3B30] dark:bg-[#FF453A]" : t.category === "B" ? "bg-[#FF9500] dark:bg-[#FF9F0A]" : t.category === "C" ? "bg-[#34C759] dark:bg-[#30D158]" : "bg-[#8E8E93] dark:bg-[#5C5C5E]"}`,
                                  title: !isTasksSynced ? isEn ? "Click to change priority" : language === "tr" ? "\xD6nceli\u011Fi de\u011Fi\u015Ftirmek i\xE7in t\u0131klay\u0131n" : "Klikni za promenu prioriteta" : void 0,
                                  children: isEn ? `Cat ${t.category}` : language === "tr" ? `Kedi ${t.category}` : `Kat ${t.category}`
                                }
                              ),
                              !isTasksSynced && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    const newTasks = [...parsedData.tasks];
                                    newTasks.splice(idx, 1);
                                    setParsedData({
                                      ...parsedData,
                                      tasks: newTasks
                                    });
                                  },
                                  className: "p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md transition-colors",
                                  title: isEn ? "Mark as reviewed" : language === "tr" ? "\u0130ncelendi olarak i\u015Faretle" : "Ozna\u010Di kao pregledano (Ukloni)",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckCircle, { className: "w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] transition-colors" })
                                }
                              )
                            ] })
                          ] }),
                          t.description && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-semibold text-black dark:text-[#EBEBF5]/85 leading-relaxed", children: t.description }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 italic leading-snug font-semibold", children: [
                            "\u21B3 ",
                            t.explanation
                          ] })
                        ]
                      },
                      idx
                    )) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      import_react4.motion.div,
                      {
                        initial: { opacity: 0, scale: 0.96 },
                        animate: { opacity: 1, scale: 1 },
                        className: "text-center py-8 px-4 bg-white/45 dark:bg-[#000000]/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            import_react4.motion.div,
                            {
                              animate: {
                                rotate: [0, 5, -5, 0],
                                scale: [1, 1.05, 1]
                              },
                              transition: {
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              },
                              className: "inline-block text-2xl",
                              children: "\u{1F54A}\uFE0F"
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold italic", children: isEn ? "No concrete tasks extracted." : language === "tr" ? "Hi\xE7bir somut g\xF6rev \xE7\u0131kar\u0131lmad\u0131." : "Nisu uo\u010Deni konkretni zadaci." })
                        ]
                      }
                    ) }),
                    !isTasksSynced && parsedData.tasks && parsedData.tasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleSyncTasksToBoard(),
                        className: "w-full mt-3 py-2.5 bg-[#007AFF] active:opacity-70 font-semibold rounded-xl text-[13px] text-white text-center transition-all cursor-pointer shadow-sm hover:transform hover:scale-[1.01]",
                        children: isEn ? "Arrange Daily Tasks" : language === "tr" ? "G\xFCnl\xFCk G\xF6revleri D\xFCzenle" : "Rasporedi dnevne zadatke"
                      }
                    ),
                    isTasksSynced && parsedData.tasks && parsedData.tasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "w-full mt-3 py-2.5 bg-[#34C759]/10 text-[#34C759] font-semibold rounded-xl text-[13px] text-center flex items-center justify-center gap-1.5 border border-[#34C759]/20", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Check, { className: "w-4 h-4" }),
                      isEn ? "Tasks Synced Successfully" : language === "tr" ? "G\xF6revler Ba\u015Far\u0131yla E\u015Fitlendi" : "Zadaci uspe\u0161no raspore\u0111eni!"
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-3", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h4", { className: "text-[13px] font-semibold text-[#34C759] flex items-center gap-1.5 leading-none", children: [
                      "\u{1F3AF} ",
                      isEn ? "Multi-step Goals" : language === "tr" ? "\xC7ok Ad\u0131ml\u0131 Hedefler" : "Dugoro\u010Dni ciljevi"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-2 max-h-56 overflow-y-auto pr-1", children: parsedData.goals && parsedData.goals.length > 0 ? parsedData.goals.map((g, i) => {
                      const feedbackId = `goal_${i}`;
                      const feedback = actionFeedback[g] || actionFeedback[feedbackId];
                      const cat = determineCategoryForGoalOrIdea(g, true) || "B";
                      const isSynced = syncedGoals.has(g);
                      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "div",
                        {
                          className: "group relative flex flex-col gap-3 p-4 bg-white/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-2xl transition-all duration-300 shadow-sm",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start gap-2.5", children: [
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${cat === "A" ? "bg-[#FF3B30]" : cat === "B" ? "bg-[#FF9500]" : cat === "C" ? "bg-[#34C759]" : cat === "D" ? "bg-[#007AFF]" : "bg-[#8E8E93]"}` }),
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col gap-1", children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[14px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7] leading-tight", children: g }),
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center gap-1.5", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#8E8E93] uppercase tracking-tighter", children: [
                                    isEn ? "Recommended" : language === "tr" ? "\xD6nerilen" : "Preporu\u010Deno",
                                    ": ",
                                    cat
                                  ] }) })
                                ] })
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => handleDeleteParsedItem("goals", i, e),
                                  className: "p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all opacity-40 hover:opacity-100",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.X, { className: "w-3.5 h-3.5" })
                                }
                              )
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex flex-col gap-3 pt-3 border-t border-black/5 dark:border-white/5", children: isSynced ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-center gap-2 py-3.5 px-4 bg-[#34C759]/10 dark:bg-[#30D158]/10 rounded-xl border border-[#34C759]/20 animate-in zoom-in-95 duration-500", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckCircle, { className: "w-4 h-4 text-[#34C759]" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-bold text-[#34C759]", children: feedback || (isEn ? "Goal Synced \u2713" : language === "tr" ? "Hedef E\u015Fitlendi \u2713" : "Cilj sinhronizovan \u2713") })
                            ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-3", children: [
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: (e) => {
                                      e.stopPropagation();
                                      handleAddGoalAsTask(g, feedbackId, localPriorityOverrides[feedbackId] || cat);
                                    },
                                    className: "w-full py-3 px-4 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold text-[14px] rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckSquare, { className: "w-4 h-4" }),
                                      isEn ? `Add to Board (Priority ${localPriorityOverrides[feedbackId] || cat})` : language === "tr" ? `Panoya Ekle (\xD6ncelik ${localPriorityOverrides[feedbackId] || cat})` : `Dodaj na tablu (Prioritet ${localPriorityOverrides[feedbackId] || cat})`
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pt-1", children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center justify-between px-1 mb-1.5", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[10px] font-black text-[#8E8E93] dark:text-[#EBEBF5]/40 uppercase tracking-widest", children: isEn ? "Custom Priority" : language === "tr" ? "\xD6zel \xD6ncelik" : "Promeni prioritet" }) }),
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center gap-1.5", children: ["A", "B", "C", "D", "E"].map((catCode) => {
                                    const currentPriority = localPriorityOverrides[feedbackId] || cat;
                                    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: (e) => {
                                          e.stopPropagation();
                                          setLocalPriorityOverrides((prev) => ({ ...prev, [feedbackId]: catCode }));
                                        },
                                        className: `flex-1 h-8 flex items-center justify-center text-[12px] font-black rounded-lg border transition-all cursor-pointer ${catCode === currentPriority ? "bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20" : "bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/60 border-transparent hover:border-black/10 dark:hover:border-white/10"}`,
                                        children: catCode
                                      },
                                      catCode
                                    );
                                  }) })
                                ] })
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    handleDecomposeGoal(g, feedbackId);
                                  },
                                  className: "w-full h-10 flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#FF2D55] font-bold text-[13px] rounded-xl border border-black/5 dark:border-white/5 transition-all active:scale-[0.98]",
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Sparkles, { className: "w-3.5 h-3.5 text-[#FF2D55]" }),
                                    isEn ? "Send to Strategic Vision" : language === "tr" ? "Stratejik Vizyona G\xF6nder" : "Po\u0161alji u Strate\u0161ku Viziju"
                                  ]
                                }
                              ),
                              feedback && !isSynced && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-center pt-1 animate-in fade-in duration-300", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "inline-block px-2.5 py-1 bg-black/5 dark:bg-white/5 text-[#34C759] text-[10px] font-bold rounded-full", children: feedback }) })
                            ] }) })
                          ]
                        },
                        i
                      );
                    }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      import_react4.motion.div,
                      {
                        initial: { opacity: 0, scale: 0.96 },
                        animate: { opacity: 1, scale: 1 },
                        className: "text-center py-8 px-4 bg-white/45 dark:bg-[#000000]/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            import_react4.motion.div,
                            {
                              animate: { y: [0, -3, 0], scale: [1, 1.08, 1] },
                              transition: {
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                              },
                              className: "inline-block text-2xl",
                              children: "\u{1F3AF}"
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs font-semibold italic", children: isEn ? "No general goals extracted." : language === "tr" ? "Hi\xE7bir genel hedef \xE7\u0131kar\u0131lmad\u0131." : "Nema op\u0161tih ciljeva." })
                        ]
                      }
                    ) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-3", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h4", { className: "text-[13px] font-semibold text-[#FF3B30] flex items-center gap-1.5 leading-none", children: [
                      "\u{1F9E0} ",
                      isEn ? "Anxieties & Worries" : language === "tr" ? "Kayg\u0131lar ve Endi\u015Feler" : "Brige i anksioznost"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-2 max-h-56 overflow-y-auto pr-1", children: parsedData.worries && parsedData.worries.length > 0 ? parsedData.worries.map((w, i) => {
                      const feedbackId = `worry_${i}`;
                      const feedback = actionFeedback[feedbackId];
                      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "div",
                        {
                          onClick: () => setExpandedCard({
                            type: isEn ? "Worry" : language === "tr" ? "Endi\u015Felenmek" : "Briga / Anksioznost",
                            description: w
                          }),
                          className: "p-2.5 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 rounded-xl space-y-2 cursor-pointer hover:border-[#FF3B30]/50 transition-colors group",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start justify-between gap-2 text-xs font-semibold pointer-events-none", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start gap-2", children: [
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[#FF3B30] text-sm leading-none", children: "\u{1F9E0}" }),
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-tight", children: w })
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => handleDeleteParsedItem("worries", i, e),
                                  className: "p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto",
                                  title: isEn ? "Mark as reviewed" : language === "tr" ? "\u0130ncelendi olarak i\u015Faretle" : "Ozna\u010Di kao pregledano (Ukloni)",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckCircle, { className: "w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] transition-colors" })
                                }
                              )
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex flex-col gap-2 pt-2 border-t border-black/5 dark:border-white/5", children: feedback ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-semibold text-[#34C759] dark:text-[#34C759] bg-[#34C759]/10 dark:bg-[#30D158]/10 px-3 py-1.5 rounded-lg text-center w-full block", children: feedback }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 w-full", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    handleReframeWorry(w, feedbackId);
                                  },
                                  className: "p-2 bg-white dark:bg-[#1C1C1E] hover:bg-[#AF52DE]/10 dark:hover:bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#AF52DE] dark:hover:text-[#AF52DE] dark:text-[#BF5AF2] font-medium rounded-xl border border-black/5 dark:border-white/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 group",
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[13px] text-inherit flex items-center gap-1 font-semibold", children: [
                                      "\u{1F9D8}",
                                      " ",
                                      isEn ? "AI Cognitive Coach" : language === "tr" ? "Yapay Zeka Bili\u015Fsel Ko\xE7u" : "AI Kognitivni Trener"
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] sm:text-[13px] font-medium text-inherit opacity-85 leading-tight px-1 transition-colors", children: isEn ? "Transform mental block automatically" : language === "tr" ? "Zihinsel blo\u011Fu otomatik olarak d\xF6n\xFC\u015Ft\xFCr\xFCn" : "Automatski otkloni ovu mentalnu blokadu" })
                                  ]
                                }
                              ),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    handleDiscardWorry(w, feedbackId);
                                  },
                                  className: "p-2 bg-white dark:bg-[#1C1C1E] hover:bg-[#34C759]/10 dark:hover:bg-[#30D158]/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] dark:hover:text-[#30D158] font-medium rounded-xl border border-black/5 dark:border-white/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 group",
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[13px] text-inherit flex items-center gap-1 font-semibold", children: [
                                      "\u{1F32C}\uFE0F",
                                      " ",
                                      isEn ? "Let Go (Control)" : language === "tr" ? "B\u0131rak (Kontrol)" : "Otpusti (Zona Kontrole)"
                                    ] }),
                                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] sm:text-[13px] font-medium text-inherit opacity-85 leading-tight px-1 transition-colors", children: isEn ? "Acknowledge and consciously release it" : language === "tr" ? "Kabul edin ve bilin\xE7li olarak b\u0131rak\u0131n" : "Svesno prihvati i otpusti iz svesti" })
                                  ]
                                }
                              )
                            ] }) })
                          ]
                        },
                        i
                      );
                    }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      import_react4.motion.div,
                      {
                        initial: { opacity: 0, scale: 0.96 },
                        animate: { opacity: 1, scale: 1 },
                        className: "text-center py-8 px-4 bg-white/45 dark:bg-[#000000]/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            import_react4.motion.div,
                            {
                              animate: {
                                scale: [1, 1.1, 1],
                                opacity: [0.8, 1, 0.8]
                              },
                              transition: {
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut"
                              },
                              className: "inline-block text-2xl",
                              children: "\u{1F324}\uFE0F"
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs font-semibold italic", children: isEn ? "Thoughts are fully worry-free!" : language === "tr" ? "D\xFC\u015F\xFCnceler tamamen endi\u015Fesizdir!" : "Miran um bez uo\u010Denih briga!" })
                        ]
                      }
                    ) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-3", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h4", { className: "text-[13px] font-semibold text-[#FF9500] flex items-center gap-1.5 leading-none", children: [
                      "\u{1F4A1} ",
                      isEn ? "Inspirations & Ideas" : language === "tr" ? "\u0130lham ve Fikirler" : "Seme novih ideja"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-2 max-h-56 overflow-y-auto pr-1", children: parsedData.ideas && parsedData.ideas.length > 0 ? parsedData.ideas.map((id, i) => {
                      const feedbackId = `idea_${i}`;
                      const feedback = actionFeedback[id] || actionFeedback[feedbackId];
                      const cat = determineCategoryForGoalOrIdea(id, false) || "C";
                      const isSynced = syncedIdeas.has(id);
                      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "div",
                        {
                          className: "group relative flex flex-col gap-3 p-4 bg-white/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-2xl transition-all duration-300 shadow-sm",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start gap-2.5", children: [
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${cat === "A" ? "bg-[#FF3B30]" : cat === "B" ? "bg-[#FF9500]" : cat === "C" ? "bg-[#34C759]" : cat === "D" ? "bg-[#007AFF]" : "bg-[#8E8E93]"}` }),
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col gap-1", children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[14px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7] leading-tight", children: id }),
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center gap-1.5", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#8E8E93] uppercase tracking-tighter", children: [
                                    isEn ? "Recommended" : language === "tr" ? "\xD6nerilen" : "Preporu\u010Deno",
                                    ": ",
                                    cat
                                  ] }) })
                                ] })
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => handleDeleteParsedItem("ideas", i, e),
                                  className: "p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all opacity-40 hover:opacity-100",
                                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.X, { className: "w-3.5 h-3.5" })
                                }
                              )
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex flex-col gap-3 pt-3 border-t border-black/5 dark:border-white/5", children: isSynced ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-center gap-2 py-3.5 px-4 bg-[#34C759]/10 dark:bg-[#30D158]/10 rounded-xl border border-[#34C759]/20 animate-in zoom-in-95 duration-500", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckCircle, { className: "w-4 h-4 text-[#34C759]" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-bold text-[#34C759]", children: feedback || (isEn ? "Idea Saved \u2713" : language === "tr" ? "Fikir Kaydedildi \u2713" : "Ideja sa\u010Duvana \u2713") })
                            ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-3", children: [
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: (e) => {
                                      e.stopPropagation();
                                      handleSaveIdea(id, feedbackId, localPriorityOverrides[feedbackId] || cat);
                                    },
                                    className: "w-full py-3 px-4 bg-[#FF9500] hover:bg-[#FF9500]/90 text-white font-bold text-[14px] rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                                    children: [
                                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckSquare, { className: "w-4 h-4" }),
                                      isEn ? `Add to Board (Priority ${localPriorityOverrides[feedbackId] || cat})` : language === "tr" ? `Panoya Ekle (\xD6ncelik ${localPriorityOverrides[feedbackId] || cat})` : `Dodaj na tablu (Prioritet ${localPriorityOverrides[feedbackId] || cat})`
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pt-1", children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center justify-between px-1 mb-1.5", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[10px] font-black text-[#8E8E93] dark:text-[#EBEBF5]/40 uppercase tracking-widest", children: isEn ? "Custom Priority" : language === "tr" ? "\xD6zel \xD6ncelik" : "Promeni prioritet" }) }),
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center gap-1.5", children: ["A", "B", "C", "D", "E"].map((catCode) => {
                                    const currentPriority = localPriorityOverrides[feedbackId] || cat;
                                    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: (e) => {
                                          e.stopPropagation();
                                          setLocalPriorityOverrides((prev) => ({ ...prev, [feedbackId]: catCode }));
                                        },
                                        className: `flex-1 h-8 flex items-center justify-center text-[12px] font-black rounded-lg border transition-all cursor-pointer ${catCode === currentPriority ? "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20" : "bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/60 border-transparent hover:border-black/10 dark:hover:border-white/10"}`,
                                        children: catCode
                                      },
                                      catCode
                                    );
                                  }) })
                                ] })
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                "button",
                                {
                                  type: "button",
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    handleElaborateIdea(id, feedbackId);
                                  },
                                  className: "w-full h-10 flex items-center justify-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#FF9500] dark:text-[#FF9F0A] font-bold text-[13px] rounded-xl border border-black/5 dark:border-white/5 transition-all active:scale-[0.98]",
                                  children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Sparkles, { className: "w-3.5 h-3.5" }),
                                    isEn ? "Send to Vision Chamber" : language === "tr" ? "Vizyon Odas\u0131na G\xF6nder" : "Po\u0161alji u Sobu Vizije"
                                  ]
                                }
                              ),
                              feedback && !isSynced && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-center pt-1 animate-in fade-in duration-300", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "inline-block px-2.5 py-1 bg-black/5 dark:bg-white/5 text-[#FF9500] text-[10px] font-bold rounded-full", children: feedback }) })
                            ] }) })
                          ]
                        },
                        i
                      );
                    }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      import_react4.motion.div,
                      {
                        initial: { opacity: 0, scale: 0.96 },
                        animate: { opacity: 1, scale: 1 },
                        className: "text-center py-8 px-4 bg-white/45 dark:bg-[#000000]/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                            import_react4.motion.div,
                            {
                              animate: { rotate: [0, 15, -15, 0] },
                              transition: {
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              },
                              className: "inline-block text-2xl",
                              children: "\u{1F4A1}"
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs font-semibold italic", children: isEn ? "No creative seeds extracted." : language === "tr" ? "Hi\xE7bir yarat\u0131c\u0131 tohum \xE7\u0131kar\u0131lmad\u0131." : "Nema zabele\u017Eenih ideja." })
                        ]
                      }
                    ) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 rounded-xl space-y-4", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-2", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h4", { className: "text-[13px] font-semibold text-[#32ADE6] flex items-center gap-1.5 leading-none", children: [
                        "\u23F3",
                        " ",
                        isEn ? "Waiting For (Others)" : language === "tr" ? "Bekliyorum (Di\u011Ferleri)" : "Zavisnosti (\u010Cekam druge)"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-2 max-h-24 overflow-y-auto pr-1", children: parsedData.waiting_for && parsedData.waiting_for.length > 0 ? parsedData.waiting_for.map(
                        (wf, i) => {
                          const feedbackId = `waiting_${i}`;
                          const feedback = actionFeedback[feedbackId];
                          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                            "div",
                            {
                              className: "p-2 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5/40 rounded-xl space-y-1.5 text-[13px] font-semibold group",
                              children: [
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between text-[#3C3C43] dark:text-[#EBEBF5]/80", children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-1.5 truncate", children: [
                                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u23F3" }),
                                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "truncate", children: wf })
                                  ] }),
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: (e) => handleDeleteParsedItem("waiting_for", i, e),
                                      className: "p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0",
                                      title: isEn ? "Mark as reviewed" : language === "tr" ? "\u0130ncelendi olarak i\u015Faretle" : "Ozna\u010Di kao pregledano (Ukloni)",
                                      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckCircle, { className: "w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] transition-colors" })
                                    }
                                  )
                                ] }),
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex pt-1 border-t border-black/5 dark:border-white/5", children: feedback ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-semibold text-[#34C759] dark:text-[#34C759]", children: feedback }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => handleTrackWaiting(wf, feedbackId),
                                    className: "px-2 py-1 bg-white dark:bg-[#1C1C1E] hover:bg-[#32ADE6]/10 dark:hover:bg-[#32ADE6]/10 dark:bg-[#64D2FF]/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#32ADE6] dark:hover:text-[#32ADE6] font-semibold rounded-lg border border-black/10 dark:border-white/10 text-xs tracking-wide cursor-pointer",
                                    children: [
                                      "\u23F3",
                                      " ",
                                      isEn ? "Track waiting in (D)" : language === "tr" ? "(D)'de bekleyen par\xE7a" : "Prebaci na \u010Dekanje (D)"
                                    ]
                                  }
                                ) })
                              ]
                            },
                            i
                          );
                        }
                      ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        import_react4.motion.div,
                        {
                          initial: { opacity: 0 },
                          animate: { opacity: 1 },
                          className: "text-center py-4 bg-white/45 dark:bg-[#000000]/30 rounded-xl border border-black/5 dark:border-white/5/40",
                          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "italic text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold", children: isEn ? "No pending blocks on others." : language === "tr" ? "Ba\u015Fkalar\u0131nda bekleyen blok yok." : "Nema stavki na \u010Dekanju." })
                        }
                      ) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-2 pt-2 border-t border-dashed border-black/5 dark:border-white/5", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h4", { className: "text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1.5 leading-none", children: [
                        "\u{1F4C5}",
                        " ",
                        isEn ? "Future (Not Today)" : language === "tr" ? "Gelecek (Bug\xFCn De\u011Fil)" : "Dugoro\u010Dno (Ne za danas)"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-2 max-h-24 overflow-y-auto pr-1", children: parsedData.not_today && parsedData.not_today.length > 0 ? parsedData.not_today.map((nt, i) => {
                        const feedbackId = `future_${i}`;
                        const feedback = actionFeedback[feedbackId];
                        return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            className: "p-2 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5/40 rounded-xl space-y-1.5 text-[13px] font-semibold group",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between text-[#3C3C43] dark:text-[#EBEBF5]/80", children: [
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-1.5 truncate", children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u{1F4C5}" }),
                                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "truncate", children: nt })
                                ] }),
                                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: (e) => handleDeleteParsedItem("not_today", i, e),
                                    className: "p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0",
                                    title: isEn ? "Mark as reviewed" : language === "tr" ? "\u0130ncelendi olarak i\u015Faretle" : "Ozna\u010Di kao pregledano (Ukloni)",
                                    children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.CheckCircle, { className: "w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] transition-colors" })
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex pt-1 border-t border-black/5 dark:border-white/5", children: feedback ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-semibold text-[#34C759] dark:text-[#34C759]", children: feedback }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => handleSaveFutureTask(nt, feedbackId),
                                  className: "px-2 py-1 bg-white dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white dark:hover:text-white font-semibold rounded-lg border border-black/10 dark:border-white/10 text-xs tracking-wide cursor-pointer",
                                  children: [
                                    "\u{1F4C5}",
                                    " ",
                                    isEn ? "Add to Backlog (E)" : language === "tr" ? "\u0130\u015F Listesine Ekle (E)" : "Sa\u010Duvaj u Backlog (E)"
                                  ]
                                }
                              ) })
                            ]
                          },
                          i
                        );
                      }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        import_react4.motion.div,
                        {
                          initial: { opacity: 0 },
                          animate: { opacity: 1 },
                          className: "text-center py-4 bg-white/45 dark:bg-[#000000]/30 rounded-xl border border-black/5 dark:border-white/5/40",
                          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "italic text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold", children: isEn ? "Everything is for immediate focus." : language === "tr" ? "Her \u015Fey an\u0131nda odaklanmak i\xE7indir." : "Sve stavke su za neposredan fokus." })
                        }
                      ) })
                    ] })
                  ] }),
                  parsedData.mindset && !isAnalyzing && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-[#AF52DE]/30 dark:border-[#BF5AF2]/30 rounded-xl space-y-4 text-left relative overflow-hidden mt-6 mb-2 shadow-sm", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2 px-3 py-1 bg-[#5B21B6]/10 border border-[#AF52DE]/20 dark:border-[#BF5AF2]/20 rounded-full text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold self-start w-fit", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.ShieldAlert, { className: "w-3 text-[#AF52DE] dark:text-[#BF5AF2]" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "LIMITING COGNITIVE BELIEF SYSTEM ALERT" : language === "tr" ? "B\u0130L\u0130\u015ESEL \u0130NAN\xC7 S\u0130STEM\u0130N\u0130N SINIRLANDIRILMASI UYARISI" : "UPOZORENJE NA LIMITIRAJU\u0106A UVERENJA" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1.5 flex flex-col", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold block leading-none", children: [
                        "\u{1F50D}",
                        " ",
                        isEn ? "DETECTED BELIEF SCHEMAS" : language === "tr" ? "TESP\u0130T ED\u0130LEN \u0130NAN\xC7 \u015EEMALARI" : "DETEKTOVANI MENTALNI OBRASCI",
                        ": ",
                        parsedData.mindset.pattern,
                        " (",
                        parsedData.mindset.confidence,
                        "%",
                        " ",
                        isEn ? "Confidence" : language === "tr" ? "Kendinden emin" : "Pouzdanost",
                        ")"
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h3", { className: "text-lg font-semibold text-[#FF3B30] dark:text-[#FF453A] leading-tight font-sans", children: [
                        parsedData.mindset.pattern === "Perfectionism" && (isEn ? "The Perfectionist Paralysis Pattern" : language === "tr" ? "M\xFCkemmeliyet\xE7i Fel\xE7 Modeli" : "Obrazac perfekcionisti\u010Dke paralize"),
                        parsedData.mindset.pattern === "Self-Doubt" && (isEn ? "The Imposter Syndrome / Self-Doubt Loop" : language === "tr" ? "Sahtekarl\u0131k Sendromu / Kendinden \u015E\xFCphe Etme D\xF6ng\xFCs\xFC" : "Zamka sumnje u sopstvene sposobnosti"),
                        parsedData.mindset.pattern === "Fear of Failure" && (isEn ? "The Protectionist Mechanism / Fear of Failure" : language === "tr" ? "Korumac\u0131 Mekanizma / Ba\u015Far\u0131s\u0131zl\u0131k Korkusu" : "Strah od neuspeha i bezbedna zona"),
                        parsedData.mindset.pattern !== "Perfectionism" && parsedData.mindset.pattern !== "Self-Doubt" && parsedData.mindset.pattern !== "Fear of Failure" && parsedData.mindset.pattern
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      "div",
                      {
                        onClick: () => setExpandedCard({
                          type: isEn ? "Cognitive AI Insight" : language === "tr" ? "Bili\u015Fsel Yapay Zeka \u0130\xE7g\xF6r\xFCs\xFC" : "Kognitivni AI Mentor",
                          title: isEn ? "Mentor's Advice" : language === "tr" ? "Mentorun Tavsiyesi" : "Savet",
                          description: parsedData.mindset.details
                        }),
                        className: "p-4 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[#3C3C43] dark:text-[#EBEBF5]/80 rounded-xl font-semibold text-xs space-y-1 font-sans cursor-pointer hover:border-[#FF9500]/50 transition-colors",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "font-semibold text-[#FF9500] block mb-1", children: [
                            "\u{1F9E0}",
                            " ",
                            isEn ? "Cognitive Mentor suggests:" : language === "tr" ? "Bili\u015Fsel Mentor \u015Funlar\u0131 \xF6nerir:" : "Kognitivni AI Mentor savetuje:"
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[#007AFF] dark:text-[#0A84FF]", children: parsedData.mindset.details })
                        ]
                      }
                    ),
                    parsedData.mindset.ta_insight && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      "div",
                      {
                        onClick: () => setExpandedCard({
                          type: isEn ? "Deep Mental Insight" : language === "tr" ? "Derin Zihinsel \u0130\xE7g\xF6r\xFC" : "Mentalni Model - Dubinski Uvid",
                          title: isEn ? "Deep Insight" : language === "tr" ? "Derin \u0130\xE7g\xF6r\xFC" : "Uvid u Obrasce",
                          description: parsedData.mindset.ta_insight
                        }),
                        className: "p-4 bg-[#F2F2F7] dark:bg-[#000000] border border-black/5 dark:border-white/5 text-[#AF52DE] dark:text-[#D894FF] rounded-xl font-semibold text-[13px] space-y-1 font-sans cursor-pointer hover:border-[#AF52DE]/30 transition-colors shadow-sm",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "font-semibold text-[#AF52DE] dark:text-[#D894FF] mb-1 text-[13px] flex items-center justify-between w-full", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "flex items-center gap-1.5", children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Brain, { className: "w-3.5 h-3.5" }),
                              " ",
                              isEn ? "Deep Mental Insight" : language === "tr" ? "Derin Zihinsel \u0130\xE7g\xF6r\xFC" : "Mentalni Model (Dubinski Uvid)"
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[11px] uppercase font-bold text-[#AF52DE]/60 dark:text-[#D894FF]/60", children: "\u{1F50D} ZOOM" })
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[#3C3C43] dark:text-[#EBEBF5]/80", children: parsedData.mindset.ta_insight })
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                      "button",
                      {
                        onClick: () => {
                          const msg = `[Automatski uvoz iz Sistema] Detektovan obrazac: ${parsedData.mindset.pattern}. Uvid: ${parsedData.mindset.ta_insight}`;
                          safeStorage.setItem(
                            "abcde_pending_mindset_thoughts",
                            JSON.stringify([msg])
                          );
                          safeStorage.setItem(
                            "abcde_pending_mindset_tab",
                            "Protocol"
                          );
                          onNavigateToTab("mindset");
                        },
                        className: "w-full mt-2 py-2.5 bg-[#AF52DE] active:opacity-70 font-semibold rounded-xl text-[13px] text-white text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Wand2, { className: "w-4 h-4" }),
                          isEn ? "Process in Cognitive AI Mentor" : language === "tr" ? "Bili\u015Fsel Yapay Zeka Mentorunda S\xFCre\xE7" : "Obradi u Kognitivnom AI Mentoru"
                        ]
                      }
                    )
                  ] }),
                  parsedData.frameworks_data && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pt-2 space-y-4", children: [
                    parsedData.frameworks_data.rebt && parsedData.frameworks_data.rebt.irrational_belief && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/20 rounded-xl space-y-3.5 text-left animate-in fade-in", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2.5", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xl select-none", children: "\u{1F9D8}" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-semibold block select-none", children: "COGNITIVE RESTRUCTURING SYSTEM" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-xs font-semibold text-black dark:text-white tracking-wide", children: isEn ? "Albert Ellis's REBT Cognitive Reframing" : language === "tr" ? "Albert Ellis'in REBT Bili\u015Fsel Yeniden \xC7er\xE7evelemesi" : "Racionalno-emotivna kognitivna rekonstrukcija (REBT)" })
                        ] })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-semibold leading-relaxed", children: isEn ? "Deconstruct disabling irrational demands ('musts' & 'shoulds') into constructive, high-resilience commitments." : language === "tr" ? "Mant\u0131ks\u0131z talepleri ('zorunluluklar' ve 'zorunluluklar') yap\u0131c\u0131, y\xFCksek diren\xE7li taahh\xFCtlere d\xF6n\xFC\u015Ft\xFCr\xFCn." : "Razlo\u017Eite blokiraju\u0107e iracionalne zahteve ('moram' i 'trebam') u visoko otporne, realisti\u010Dne akcije." }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3.5 pt-1.5 pb-2 -mx-5.5 px-5.5 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible md:snap-none select-none font-sans", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            onClick: () => setExpandedContent({
                              title: isEn ? "A - Event (Trigger)" : language === "tr" ? "A - Olay (Tetikleyici)" : "A - Doga\u0111aj (Okida\u010D)",
                              description: parsedData.frameworks_data.rebt.activating_event,
                              bgColor: "bg-white dark:bg-[#000000]",
                              borderColor: "border-black/5 dark:border-white/20",
                              textColor: "text-[#3C3C43] dark:text-[#EBEBF5]/80",
                              darkTextColor: "text-[#3C3C43] dark:text-[#EBEBF5]/80"
                            }),
                            className: "w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-white dark:bg-[#000000] border border-black/5 dark:border-white/20 space-y-1 cursor-pointer transition-transform active:scale-95",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-5.5 h-5.5 rounded-lg bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)]0/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold text-xs flex items-center justify-center", children: "A" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold", children: isEn ? "Event (Trigger)" : language === "tr" ? "Olay (Tetikleyici)" : "Doga\u0111aj (Okida\u010D)" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug line-clamp-4", children: parsedData.frameworks_data.rebt.activating_event })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            onClick: () => setExpandedContent({
                              title: isEn ? "B - Irrational Belief" : language === "tr" ? "B - Mant\u0131ks\u0131z \u0130nan\xE7" : "B - Iracionalno uverenje",
                              description: parsedData.frameworks_data.rebt.irrational_belief,
                              bgColor: "bg-[#FF3B30]/5 dark:bg-[#FF453A]/5",
                              borderColor: "border-[#FF3B30]/30 dark:border-[#FF453A]/15",
                              textColor: "text-[#FF3B30]",
                              darkTextColor: "text-[#FF3B30] dark:text-[#FF453A]"
                            }),
                            className: "w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#FF3B30]/5 dark:bg-[#FF453A]/5 border border-[#FF3B30]/30 dark:border-[#FF453A]/15 space-y-1 cursor-pointer transition-transform active:scale-95",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-5.5 h-5.5 rounded-lg bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] font-semibold text-xs flex items-center justify-center", children: "B" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#FF3B30] font-semibold", children: isEn ? "Irrational Belief" : language === "tr" ? "Mant\u0131ks\u0131z \u0130nan\xE7" : "Iracionalno uverenje" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs font-medium text-[#FF3B30] dark:text-[#FF453A] leading-snug line-clamp-4", children: parsedData.frameworks_data.rebt.irrational_belief })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            onClick: () => setExpandedContent({
                              title: isEn ? "C - Consequences" : language === "tr" ? "C - Sonu\xE7lar" : "C - Posledice",
                              description: parsedData.frameworks_data.rebt.consequences,
                              bgColor: "bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5",
                              borderColor: "border-[#FF9500]/30 dark:border-[#FF9F0A]/15",
                              textColor: "text-[#FF9500]",
                              darkTextColor: "text-[#FF9500] dark:text-[#FF9F0A]"
                            }),
                            className: "w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5 border border-[#FF9500]/30 dark:border-[#FF9F0A]/15 space-y-1 cursor-pointer transition-transform active:scale-95",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-5.5 h-5.5 rounded-lg bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] font-semibold text-xs flex items-center justify-center", children: "C" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#FF9500] font-semibold", children: isEn ? "Consequences" : language === "tr" ? "Sonu\xE7lar" : "Posledice" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs font-medium text-[#FF9500] dark:text-[#FF9F0A] leading-snug line-clamp-4", children: parsedData.frameworks_data.rebt.consequences })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            onClick: () => setExpandedContent({
                              title: isEn ? "D - Disputing (Debate)" : language === "tr" ? "D - Tart\u0131\u015Fma (Tart\u0131\u015Fma)" : "D - Osporavanje (Debata)",
                              description: `"${parsedData.frameworks_data.rebt.disputing}"`,
                              bgColor: "bg-[#007AFF]/5",
                              borderColor: "border-black/5 dark:border-white/5",
                              textColor: "text-[#007AFF] dark:text-[#0A84FF]",
                              darkTextColor: "text-[#007AFF] dark:text-[#0A84FF] italic"
                            }),
                            className: "w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#007AFF]/5 border border-black/5 dark:border-white/5 space-y-1 cursor-pointer transition-transform active:scale-95",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-5.5 h-5.5 rounded-lg bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] font-semibold text-xs flex items-center justify-center", children: "D" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#007AFF] font-semibold", children: isEn ? "Disputing (Debate)" : language === "tr" ? "Tart\u0131\u015Fma (Tart\u0131\u015Fma)" : "Osporavanje (Debata)" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-xs font-medium text-[#007AFF] dark:text-[#0A84FF] leading-snug italic line-clamp-4", children: [
                                '"',
                                parsedData.frameworks_data.rebt.disputing,
                                '"'
                              ] })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            onClick: () => setExpandedContent({
                              title: isEn ? "E - Effective Belief" : language === "tr" ? "E - Etkili \u0130nan\xE7" : "E - Novo zdravo uverenje",
                              description: parsedData.frameworks_data.rebt.effective_belief,
                              bgColor: "bg-[#34C759]/5 dark:bg-[#30D158]/5",
                              borderColor: "border-[#34C759]/30 dark:border-[#30D158]/15",
                              textColor: "text-[#34C759] dark:text-[#30D158]",
                              darkTextColor: "text-[#34C759] dark:text-[#30D158]"
                            }),
                            className: "w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#34C759]/5 dark:bg-[#30D158]/5 border border-[#34C759]/30 dark:border-[#30D158]/15 space-y-1 cursor-pointer transition-transform active:scale-95",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-5.5 h-5.5 rounded-lg bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] font-semibold text-xs flex items-center justify-center", children: "E" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#34C759] font-semibold", children: isEn ? "Effective Belief" : language === "tr" ? "Etkili \u0130nan\xE7" : "Novo zdravo uverenje" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs font-medium text-[#34C759] dark:text-[#30D158] leading-snug line-clamp-4", children: parsedData.frameworks_data.rebt.effective_belief })
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                        "button",
                        {
                          onClick: () => {
                            const msg = `\u017Delim da primenim REBT na slede\u0107i problem:
Okida\u010D: ${parsedData.frameworks_data.rebt.activating_event}
Iracionalno Uverenje: ${parsedData.frameworks_data.rebt.irrational_belief}
Mo\u017Ee\u0161 li mi pomo\u0107i da ovo detaljnije obradim?`;
                            safeStorage.setItem(
                              "abcde_pending_mindset_thoughts",
                              JSON.stringify([msg])
                            );
                            safeStorage.setItem(
                              "abcde_pending_mindset_tab",
                              "rebt"
                            );
                            onNavigateToTab("mindset");
                          },
                          className: "w-full mt-3 py-2.5 bg-[#007AFF] active:opacity-70 font-semibold rounded-xl text-[13px] text-white text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm",
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Wand2, { className: "w-4 h-4" }),
                            isEn ? "Deep-Dive in REBT Coach" : language === "tr" ? "REBT Ko\xE7una Derin Bak\u0131\u015F" : "Detaljnije u REBT Treneru"
                          ]
                        }
                      )
                    ] }),
                    parsedData.frameworks_data.protocol && parsedData.frameworks_data.protocol.potential_failure && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/20 rounded-xl space-y-3.5 text-left animate-in fade-in", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2.5", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xl select-none", children: "\u{1F6E1}\uFE0F" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold block select-none", children: "PRE-MORTEM ANTI-FRAGILITY" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-xs font-semibold text-black dark:text-white tracking-wide", children: isEn ? "Anti-Fragility Master Plan" : language === "tr" ? "K\u0131r\u0131lganl\u0131\u011Fa Kar\u015F\u0131 Master Plan" : "Plan Izdr\u017Eljivosti i Odbrane" })
                        ] })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3.5 pt-1.5 pb-2 -mx-5.5 px-5.5 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible md:snap-none select-none font-sans", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            onClick: () => setExpandedContent({
                              title: isEn ? "What could go wrong?" : language === "tr" ? "Ne yanl\u0131\u015F gidebilir?" : "\u0160ta mo\u017Ee krenuti po zlu?",
                              description: parsedData.frameworks_data.protocol.potential_failure,
                              bgColor: "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10",
                              borderColor: "border-[#FF3B30]/20 dark:border-[#FF453A]/20",
                              textColor: "text-[#FF3B30]",
                              darkTextColor: "text-[#FF3B30] dark:text-[#FF3B30]"
                            }),
                            className: "w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 space-y-1 cursor-pointer transition-transform active:scale-95",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#FF3B30] font-semibold", children: isEn ? "What could go wrong?" : language === "tr" ? "Ne yanl\u0131\u015F gidebilir?" : "\u0160ta mo\u017Ee krenuti po zlu?" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs font-medium text-[#FF3B30] dark:text-[#FF3B30] leading-snug line-clamp-4", children: parsedData.frameworks_data.protocol.potential_failure })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            onClick: () => setExpandedContent({
                              title: isEn ? "Preventative Action" : language === "tr" ? "\xD6nleyici Faaliyet" : "Preventivna akcija",
                              description: parsedData.frameworks_data.protocol.preventative_action,
                              bgColor: "bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20",
                              borderColor: "border-black/5 dark:border-white/20",
                              textColor: "text-[#007AFF]",
                              darkTextColor: "text-[#007AFF] dark:text-[#0A84FF]"
                            }),
                            className: "w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20 border border-black/5 dark:border-white/20 space-y-1 cursor-pointer transition-transform active:scale-95",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#007AFF] font-semibold", children: isEn ? "Preventative Action" : language === "tr" ? "\xD6nleyici Faaliyet" : "Preventivna akcija" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs font-medium text-[#007AFF] dark:text-[#0A84FF] leading-snug line-clamp-4", children: parsedData.frameworks_data.protocol.preventative_action })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                          "div",
                          {
                            onClick: () => setExpandedContent({
                              title: isEn ? "Recovery Plan" : language === "tr" ? "Kurtarma Plan\u0131" : "Plan oporavka",
                              description: parsedData.frameworks_data.protocol.recovery_plan,
                              bgColor: "bg-[#34C759]/10 dark:bg-[#30D158]/10",
                              borderColor: "border-[#34C759]/20 dark:border-[#30D158]/20",
                              textColor: "text-[#34C759]",
                              darkTextColor: "text-[#34C759] dark:text-[#34C759]"
                            }),
                            className: "w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 space-y-1 cursor-pointer transition-transform active:scale-95",
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#34C759] font-semibold", children: isEn ? "Recovery Plan" : language === "tr" ? "Kurtarma Plan\u0131" : "Plan oporavka" }),
                              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs font-medium text-[#34C759] dark:text-[#34C759] leading-snug line-clamp-4", children: parsedData.frameworks_data.protocol.recovery_plan })
                            ]
                          }
                        )
                      ] })
                    ] }),
                    parsedData.frameworks_data.biohacking && parsedData.frameworks_data.biohacking.protocol_name && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/20 rounded-xl space-y-3.5 text-left animate-in fade-in", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2.5", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xl select-none", children: "\u{1F9EC}" }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] text-[#34C759] dark:text-[#34C759] font-semibold block select-none", children: "PHYSIOLOGICAL PROTOCOL" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-xs font-semibold text-black dark:text-white tracking-wide", children: isEn ? "Targeted Biohack" : language === "tr" ? "Hedefli Biyolojik Sald\u0131r\u0131" : "Ciljani biohakerski protokol" })
                        ] })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "mt-3 space-y-3 bg-white dark:bg-[#000000] p-4 border border-black/5 dark:border-white/5 rounded-xl", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#34C759] px-2 py-1 rounded-md text-xs font-semibold", children: parsedData.frameworks_data.biohacking.protocol_name }) }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80", children: isEn ? "Why it helps" : language === "tr" ? "Neden yard\u0131mc\u0131 olur?" : "Za\u0161to ovo poma\u017Ee" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-sm font-sans italic text-[#3C3C43] dark:text-[#EBEBF5]/80", children: [
                            '"',
                            parsedData.frameworks_data.biohacking.why_it_helps,
                            '"'
                          ] })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pt-2 border-t border-black/5 dark:border-white/5", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] text-[#007AFF] font-semibold mb-1", children: isEn ? "How to execute" : language === "tr" ? "Nas\u0131l y\xFCr\xFCt\xFCl\xFCr" : "Kako da ovo izvede\u0161" }),
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm font-semibold text-black dark:text-white whitespace-pre-line leading-relaxed", children: parsedData.frameworks_data.biohacking.how_to_do_it })
                        ] })
                      ] })
                    ] })
                  ] })
                ] })
              ] })
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  onClick: () => {
                    if (resetCompletedToday) {
                      setStep(5);
                    } else {
                      setStep(4);
                    }
                  },
                  className: "text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1 cursor-pointer",
                  children: [
                    "\u2190 ",
                    isEn ? "Back" : language === "tr" ? "Geri" : "Nazad"
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    onClick: () => setVaultOpen(true),
                    className: "px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 text-amber-600 dark:text-[#FF9500] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all",
                    children: [
                      "\u{1F5C4}\uFE0F ",
                      isEn ? "Vault" : language === "tr" ? "Kasa" : "Trezor"
                    ]
                  }
                ),
                resetCompletedToday ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    onClick: () => {
                      if (window.confirm(
                        isEn ? "Are you sure you want to redo today's reset?" : language === "tr" ? "Bug\xFCnk\xFC s\u0131f\u0131rlamay\u0131 yeniden yapmak istedi\u011Finizden emin misiniz?" : "Da li ste sigurni da \u017Eelite ponovo da pokrenete dana\u0161nji reset?"
                      )) {
                        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
                        safeStorage.removeItem(
                          `kaizen_morning_reset_done_${todayStr}`
                        );
                        safeStorage.removeItem(
                          `kaizen_morning_reset_data_${todayStr}`
                        );
                        setResetCompletedToday(false);
                        setStep(1);
                        setBrainDumpText("");
                        setEnergyRating(0);
                        setPleasureRating(0);
                        setParsedData(null);
                      }
                    },
                    className: "px-4 py-2 bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#D1D1D6] dark:hover:bg-[#3A3A3C] text-black dark:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all",
                    children: [
                      "\u{1F504} ",
                      isEn ? "Redo Reset" : language === "tr" ? "Yeniden S\u0131f\u0131rla" : "Ponovi reset"
                    ]
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                  "button",
                  {
                    onClick: () => handleFinalizeReset(),
                    className: "px-6 py-2.5 bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#1C1C1E] dark:bg-[#FF9F0A] hover:text-white transition-all cursor-pointer text-xs font-semibold text-black dark:text-white rounded-xl flex items-center gap-1",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Finish & Save" : language === "tr" ? "Bitir ve Kaydet" : "Zavr\u0161i i Sa\u010Duvaj" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.ArrowRight, { className: "w-3.5 h-3.5" })
                    ]
                  }
                )
              ] })
            ] })
          ]
        },
        "map-screen"
      )
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.AnimatePresence, { children: expandedContent && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "fixed inset-0 z-[200] flex items-center justify-center p-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_react4.motion.div,
        {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          onClick: () => setExpandedContent(null),
          className: "absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        import_react4.motion.div,
        {
          initial: { opacity: 0, scale: 0.95, y: 10 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.95, y: 10 },
          transition: { type: "spring", stiffness: 300, damping: 30 },
          className: `relative z-10 w-full max-w-sm p-6 rounded-2xl border shadow-2xl bg-white dark:bg-[#1C1C1E] ${expandedContent.borderColor} space-y-4`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "h3",
              {
                className: `text-lg font-semibold ${expandedContent.textColor}`,
                children: expandedContent.title
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "p",
              {
                className: `text-base leading-relaxed max-w-[280px] md:max-w-none break-words text-black dark:text-white`,
                children: expandedContent.description
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                onClick: () => setExpandedContent(null),
                className: "mt-6 w-full py-3 bg-black/5 dark:bg-white/10 rounded-xl font-bold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 active:scale-95 transition-transform",
                children: isEn ? "Close" : language === "tr" ? "Kapal\u0131" : "Zatvori"
              }
            )
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.AnimatePresence, { children: vaultOpen && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "fixed inset-0 z-[100] flex justify-end", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_react4.motion.div,
        {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          onClick: () => setVaultOpen(false),
          className: "absolute inset-0 bg-black/40 backdrop-blur-sm"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_react4.motion.div,
        {
          initial: { x: "100%" },
          animate: { x: 0 },
          exit: { x: "100%" },
          transition: { type: "spring", damping: 30, stiffness: 300 },
          className: "w-screen max-w-md md:max-w-xl relative z-10",
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "h-full flex flex-col bg-white dark:bg-[#1C1C1E] shadow-2xl border-l border-black/10 dark:border-white/10 overflow-hidden rounded-l-2xl", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-5.5 border-b border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#000000]/40 flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xl", children: "\u{1F5C4}\uFE0F" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "text-sm font-bold text-black dark:text-white", children: isEn ? "Cognitive Prompt Vault" : language === "tr" ? "Bili\u015Fsel \u0130stem Kasas\u0131" : "Kognitivni Trezor Upita" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[10px] sm:text-[11px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60", children: isEn ? "Browse & review past prompts and AI solutions" : language === "tr" ? "Ge\xE7mi\u015F istemlere ve yapay zeka \xE7\xF6z\xFCmlerine g\xF6z at\u0131n ve inceleyin" : "Pregledajte ranije upite i AI re\u0161enja" })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  onClick: () => setVaultOpen(false),
                  className: "p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-[#1C1C1E] dark:hover:text-white transition-all cursor-pointer",
                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.X, { className: "w-5 h-5" })
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 space-y-3 bg-[#EFEFF4]/50 dark:bg-[#121214]/50 border-b border-black/5 dark:border-white/5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "relative", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "absolute inset-y-0 left-3 flex items-center pointer-events-none", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Search, { className: "w-3.5 h-3.5 text-[#8E8E93] dark:text-[#EBEBF5]/60" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "input",
                  {
                    type: "text",
                    value: vaultSearch,
                    onChange: (e) => setVaultSearch(e.target.value),
                    placeholder: isEn ? "Search inside past history..." : language === "tr" ? "Ge\xE7mi\u015F tarihin i\xE7inde arama yap\u0131n..." : "Pretra\u017Ei u istoriji...",
                    className: "w-full pl-9 pr-4 py-2 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/5 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007AFF] placeholder-[#8E8E93]"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex flex-wrap gap-1.5 pt-1", children: ["all", "morning", "nlp", "rebt", "ta", "biohack"].map(
                (f) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "button",
                  {
                    onClick: () => setVaultFilter(f),
                    className: `px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${vaultFilter === f ? "bg-[#007AFF] border-[#007AFF] text-white" : "bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white"}`,
                    children: f.toUpperCase()
                  },
                  f
                )
              ) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex-1 p-4 overflow-y-auto space-y-3.5 bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)]/10 dark:bg-[#000000]/10", children: (() => {
              const items = getAllVaultItems();
              if (items.length === 0) {
                return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "text-center py-20", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Layers, { className: "w-10 h-10 mx-auto text-[#8E8E93] dark:text-[#EBEBF5]/60 mb-3" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "mt-3 text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 font-semibold", children: isEn ? "No saved prompts match your search." : language === "tr" ? "Araman\u0131zla e\u015Fle\u015Fen kay\u0131tl\u0131 istem yok." : "Nema sa\u010Duvanih upita." })
                ] });
              }
              return items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "div",
                {
                  className: "p-3.5 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#2C2C2E]/40 space-y-2.5 shadow-sm text-left",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 text-[10px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-1.5 flex-wrap", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "px-1.5 py-0.5 rounded bg-black/5 dark:bg-[#1C1C1E] text-black dark:text-white font-bold", children: item.label }),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "font-mono text-[9px]", children: item.date }),
                        item.theme && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[9px] text-[#007AFF] uppercase", children: item.theme })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-1", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "button",
                          {
                            onClick: () => {
                              navigator.clipboard.writeText(
                                item.userPrompt + "\n\n" + item.aiResponse
                              );
                              triggerHaptics("light");
                            },
                            className: "p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md text-[#8E8E93] dark:text-[#EBEBF5]/60",
                            title: "Copy",
                            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Copy, { className: "w-3.5 h-3.5" })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          "button",
                          {
                            onClick: () => handleDeleteVaultItem(item),
                            className: "p-1 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md text-red-500 transition-colors",
                            title: "Delete",
                            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Trash2, { className: "w-3.5 h-3.5" })
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-1", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[9px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase block", children: isEn ? "Your Input:" : language === "tr" ? "Giri\u015Finiz:" : "Unos korisnika:" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs font-semibold text-black dark:text-white whitespace-pre-wrap", children: item.userPrompt })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "pt-2 border-t border-black/5 dark:border-white/5 space-y-1", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[9px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase block", children: isEn ? "Agent's Solution:" : language === "tr" ? "Temsilcinin \xC7\xF6z\xFCm\xFC:" : "Re\u0161enje Agenta:" }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed italic whitespace-pre-wrap overflow-hidden", children: item.aiResponse })
                    ] })
                  ]
                },
                item.id
              ));
            })() })
          ] })
        }
      )
    ] }) }),
    expandedCard && (() => {
      const safeType = typeof expandedCard.type === "string" ? expandedCard.type.toLowerCase() : "";
      const isWorryCard = safeType.includes("briga") || safeType.includes("worry") || safeType.includes("anxiety");
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            onClick: () => setExpandedCard(null),
            className: "absolute top-4 right-4 text-[#8E8E93] hover:text-black dark:text-white dark:hover:text-white transition-colors",
            id: "close-expanded-card",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.X, { className: "w-5 h-5" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "mb-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-[12px] font-bold uppercase text-[#FF3B30] mb-1", children: expandedCard.type }),
          expandedCard.title && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "text-xl font-bold text-[#8E8E93] dark:text-white leading-tight", children: expandedCard.title })
        ] }),
        isWorryCard ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-5 text-left", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-3 bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-xl", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[11px] font-bold text-[#FF3B30] uppercase block mb-1", children: isEn ? "ANALYZED WORRY:" : language === "tr" ? "ANAL\u0130Z ED\u0130LM\u0130\u015E END\u0130\u015EE:" : "IDENTIFIKOVANA BRIGA:" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-sm font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 italic leading-relaxed", children: [
              '"',
              expandedCard.description,
              '"'
            ] })
          ] }),
          !worryCbtChoice && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-4 text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60", children: isEn ? "Does this worry fall under your direct sphere of control?" : language === "tr" ? "Bu endi\u015Fe do\u011Frudan kontrol alan\u0131n\u0131za m\u0131 giriyor?" : "Da li ova briga spada pod tvoju direktnu sferu uticaja?" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setWorryCbtChoice("control");
                    triggerHaptics("medium");
                  },
                  className: "p-3 bg-[#34C759]/10 hover:bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/20 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-lg", children: "\u{1F7E2}" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Under Control" : language === "tr" ? "Kontrol Alt\u0131nda" : "Pod kontrolom" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[10px] opacity-75 font-medium leading-none mt-0.5", children: isEn ? "Extremely actionable" : language === "tr" ? "Son derece uygulanabilir" : "Mogu da delujem" })
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setWorryCbtChoice("no-control");
                    setWorryBreatheCount(-1);
                    triggerHaptics("medium");
                  },
                  className: "p-3 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/20 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-lg", children: "\u{1F535}" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Outside Control" : language === "tr" ? "D\u0131\u015F Kontrol" : "Van kontrole" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[10px] opacity-75 font-medium leading-none mt-0.5", children: isEn ? "Practice acceptance" : language === "tr" ? "Al\u0131\u015Ft\u0131rma kabul\xFC" : "Treba da prihvatim" })
                  ]
                }
              )
            ] })
          ] }),
          worryCbtChoice === "no-control" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-4", children: !worryCbtCompleted ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-3.5 p-4 bg-[#007AFF]/5 border border-[#007AFF]/10 rounded-xl text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-2xl animate-pulse inline-block", children: "\u{1F32C}\uFE0F" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-xs sm:text-sm font-bold text-[#007AFF]", children: isEn ? "CBT Acceptance & Letting Go" : language === "tr" ? "TCMB Kabul\xFC ve B\u0131rakma" : "CBT Prihvatanje i otpu\u0161tanje" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 font-semibold leading-relaxed", children: isEn ? "Since you cannot act on this directly, let's consciously release control. Ready for a quick 3-second breathing space?" : language === "tr" ? "Bu konuda do\u011Frudan harekete ge\xE7emeyece\u011Finiz i\xE7in, kontrol\xFC bilin\xE7li olarak b\u0131rakal\u0131m. 3 saniyelik h\u0131zl\u0131 bir nefes almaya haz\u0131r m\u0131s\u0131n\u0131z?" : "S obzirom na to da na ovo ne mo\u017Ee\u0161 uticati direktno, svesno \u0107emo smiriti um i otpustiti napetost. Da li si spreman za kratku 3-sekundnu pauzu za uzdah?" }),
            worryBreatheCount === -1 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                onClick: () => {
                  triggerHaptics("light");
                  setWorryBreatheCount(3);
                  const intv = setInterval(() => {
                    setWorryBreatheCount((prev) => {
                      if (prev <= 1) {
                        clearInterval(intv);
                        setWorryCbtCompleted(true);
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1e3);
                },
                className: "mt-2 py-2 px-4 bg-[#007AFF] text-white hover:bg-[#007AFF]/95 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95",
                children: isEn ? "Breathe Out & Release" : language === "tr" ? "Nefes Verin ve B\u0131rak\u0131n" : "Zapo\u010Dni izdah i otpusti"
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "text-lg font-extrabold text-[#007AFF] animate-ping py-2", children: [
              worryBreatheCount,
              "..."
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-4 p-4 bg-[#34C759]/5 border border-[#34C759]/10 rounded-xl text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xl text-[#3C3C43]", children: "\u{1F33F}" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-sm font-bold text-[#34C759]", children: isEn ? "Worry Released" : language === "tr" ? "Endi\u015Fe Yay\u0131nland\u0131" : "Briga uspe\u0161no otpu\u0161tena" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#8E8E93] font-semibold leading-relaxed", children: isEn ? "Splendid! You have consciously acknowledged this worry and chosen to release it. Your mind is secure." : language === "tr" ? "G\xF6rkemli! Bu endi\u015Feyi bilin\xE7li olarak kabul ettiniz ve onu sal\u0131vermeyi se\xE7tiniz. Zihniniz g\xFCvende." : "Izvanredno! Svesno si prepoznao ovu brigu, shvatio da je van tvoje sfere kontrole i doneo zrelu odluku da je otpusti\u0161." }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                onClick: () => {
                  triggerHaptics("success");
                  setExpandedCard(null);
                },
                className: "w-full py-2 bg-[#34C759] text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all",
                children: isEn ? "Done" : language === "tr" ? "Tamamlamak" : "Zavr\u0161i"
              }
            )
          ] }) }),
          worryCbtChoice === "control" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-4", children: !worryCbtCompleted ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-3.5 p-4 bg-[#34C759]/5 border border-[#34C759]/10 rounded-xl text-left", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xl", children: "\u{1F4E5}" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-xs sm:text-sm font-bold text-[#34C759]", children: isEn ? "Extract a Small Protective Step" : language === "tr" ? "K\xFC\xE7\xFCk Bir Koruyucu Ad\u0131m \xC7\u0131kar\u0131n" : "Pretvori brigu u akciju" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[11px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-semibold leading-relaxed", children: isEn ? "Don't put the messy worry itself in your task list. Instead, write down ONE clear, positive action step you can take to make progress." : language === "tr" ? "Da\u011F\u0131n\u0131k endi\u015Fenin kendisini g\xF6rev listenize koymay\u0131n. Bunun yerine, ilerleme kaydetmek i\xE7in atabilece\u011Finiz B\u0130R net, olumlu eylem ad\u0131m\u0131n\u0131 yaz\u0131n." : "Umesto stavljanja cele brige na spisak (\u0161to samo stvara stres), zapi\u0161i JEDNU malu, sasvim konkretnu aktivnost koju mo\u017Ee\u0161 preduzeti u znak preventive." }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                type: "text",
                value: worryActionStep,
                onChange: (e) => setWorryActionStep(e.target.value),
                placeholder: isEn ? "E.g. Call dentist tomorrow at 9 AM" : language === "tr" ? "\xD6rn. Yar\u0131n sabah 9'da di\u015F\xE7iyi ara" : "Npr: Pozvati automehani\u010Dara sutra u 9h",
                className: "w-full p-2.5 bg-white dark:bg-[#000000] border border-black/10 dark:border-white/10 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#34C759] text-black dark:text-white font-semibold"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                disabled: !worryActionStep.trim(),
                onClick: () => {
                  if (onAddTask) {
                    onAddTask(
                      worryActionStep.trim(),
                      `${isEn ? "Action extracted from worry:" : language === "tr" ? "Endi\u015Feden \xE7\u0131kar\u0131lan eylem:" : "Preventivna akcija izdvojena iz brige:"} ${expandedCard.description}`,
                      "B"
                    );
                  }
                  triggerHaptics("success");
                  setWorryCbtCompleted(true);
                },
                className: "w-full py-2.5 bg-[#34C759] text-white disabled:opacity-50 font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u{1F4E5}" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: isEn ? "Save Action to Inbox" : language === "tr" ? "Eylemi Gelen Kutusuna Kaydet" : "Sa\u010Duvaj akciju u Inbox" })
                ]
              }
            )
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xl text-[#3C3C43]", children: "\u{1F680}" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { className: "text-sm font-bold text-[#34C759]", children: isEn ? "Action Saved!" : language === "tr" ? "\u0130\u015Flem Kaydedildi!" : "Akcija sa\u010Duvana!" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#8E8E93] font-semibold leading-relaxed", children: isEn ? "Fantastic! The small step has been placed cleanly in your Inbox, freeing your mind to focus on execution." : language === "tr" ? "Fantastik! K\xFC\xE7\xFCk ad\u0131m, Gelen Kutunuza temiz bir \u015Fekilde yerle\u015Ftirildi ve zihninizi uygulamaya odaklanma konusunda \xF6zg\xFCr b\u0131rakt\u0131." : "Savr\u0161eno! Konkretan preventivni zadatak je sada u tvom Inboxu. Tvoj um je rastere\u0107en od brige." }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                onClick: () => {
                  setExpandedCard(null);
                },
                className: "w-full py-2 bg-[#34C759] text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all",
                children: isEn ? "Close" : language === "tr" ? "Kapal\u0131" : "Zatvori"
              }
            )
          ] }) })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          expandedCard.category && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "mb-4 text-sm font-semibold px-2 py-1 bg-black/5 dark:bg-white/5 dark:bg-[#000000]/20 text-[#8E8E93] dark:text-[#EBEBF5]/60 rounded inline-block", children: [
            "Kategorija: ",
            expandedCard.category
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "space-y-4 text-left", children: [
            expandedCard.description && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-[#8E8E93] dark:text-[#EBEBF5]/60 text-[15px] leading-relaxed", children: expandedCard.description }),
            expandedCard.explanation && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-[#8E8E93] dark:text-[#EBEBF5]/60 text-[14px] italic border-l-2 border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 pl-3", children: expandedCard.explanation })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mt-6 pt-4 border-t border-black/5 dark:border-white/10", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            onClick: () => setExpandedCard(null),
            className: "w-full py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-xl font-semibold text-[#8E8E93] dark:text-white transition-colors",
            children: "Zatvori"
          }
        ) })
      ] }) });
    })(),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react4.AnimatePresence, { children: isHistoryModalOpen && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_react4.motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm",
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          import_react4.motion.div,
          {
            initial: { opacity: 0, y: "100%", scale: 0.95 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: "100%", scale: 0.95 },
            transition: { type: "spring", stiffness: 300, damping: 30 },
            className: `w-full sm:max-w-2xl max-h-[90vh] flex flex-col rounded-t-[32px] sm:rounded-2xl border-t sm:border shadow-2xl relative overflow-hidden ${isEvening ? "bg-[#1C1C1E] border-white/10" : "bg-white dark:bg-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border-black/5 dark:border-white/5"}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "sm:hidden w-full flex justify-center pt-3 pb-1", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-10 h-1.5 rounded-full bg-black/20 dark:bg-white/20" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-2.5 bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF] rounded-xl", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.BookOpen, { className: "w-5 h-5" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "text-[17px] font-bold text-black dark:text-white", children: isEn ? "Brain Dump History" : language === "tr" ? "Beyin D\xF6k\xFCm\xFC Tarihi" : "Istorija Unosa" }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium", children: isEn ? "Your past morning inputs" : language === "tr" ? "Ge\xE7mi\u015F sabah giri\u015Fleriniz" : "Va\u0161i prethodni jutarnji unosi" })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "button",
                  {
                    onClick: () => setIsHistoryModalOpen(false),
                    className: "p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 transition-colors",
                    children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.X, { className: "w-6 h-6" })
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "p-6 overflow-y-auto space-y-4 bg-white/50 dark:bg-[#1C1C1E]/50", children: resetsHistory.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-center py-8", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[#3C3C43] dark:text-[#EBEBF5]/80 text-sm italic", children: isEn ? "No past entries found." : language === "tr" ? "Ge\xE7mi\u015F giri\u015F bulunamad\u0131." : "Nema prethodnih unosa." }) }) : [...resetsHistory].reverse().map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "div",
                {
                  className: "bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 rounded-xl p-4 shadow-sm space-y-3 relative",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-wider", children: entry.date }),
                      entry.energyRating && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[11px] font-bold bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-lg", children: [
                        "Energy: ",
                        entry.energyRating,
                        "/10"
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm text-[#3C3C43] dark:text-[#EBEBF5]/80 whitespace-pre-wrap leading-relaxed", children: entry.rawInput || entry.data?.brainDumpText || (isEn ? "(No text saved)" : language === "tr" ? "(Metin kaydedilmedi)" : "(Nema sa\u010Duvanog teksta)") })
                  ]
                },
                index
              )) })
            ]
          }
        )
      }
    ) })
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MorningAIHub,
  determineCategoryForGoalOrIdea,
  getWeatherEmoji
});
