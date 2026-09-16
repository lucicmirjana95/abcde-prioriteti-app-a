import React, { useState, useEffect, useRef } from "react";
import {
  Sun,
  CloudLightning,
  Cloud,
  Target,
  Zap,
  Compass,
  HelpCircle,
  Users,
  CheckSquare,
  Award,
  ArrowRight,
  Brain,
  RefreshCw,
  Check,
  Copy,
  Clock,
  AlertTriangle,
  Heart,
  BookOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  TrendingUp,
  Sparkles,
  Calendar,
  Frown,
  ShieldAlert,
  Mic,
  MicOff,
  Trash2,
  Loader2,
  X,
  Wand2,
  PieChart,
  Filter,
  Activity,
  Flame,
  Cat,
  Search,
  CheckCircle,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NsdrPlayer from "./NsdrPlayer";
import { Task } from "../types";
import ZoomableCard from "./ZoomableCard";
import VoiceInputNode from "./VoiceInputNode";
import { triggerDiscoveryEvent, getDiscoverySettings } from "../lib/discoveryEngine";

interface MorningAIHubProps {
  language: "sr" | "en" | "tr";
  tasks: Task[];
  onAddTask: (
    title: string,
    description: string,
    category: "A" | "B" | "C" | "D" | "E",
  ) => void;
  onAddMultipleTasks?: (newAITasks: any[]) => Promise<void> | void;
  onNavigateToTab: (tab: any) => void;
  isEvening?: boolean;
  onStepChange?: (step: number) => void;
  activeAiTone?: string;
  initialBrainDump?: string;
  initialStep?: number;
}

// Helper to resolve weather emoji cleanly from weather string supporting multiple languages
export const getWeatherEmoji = (weatherStr: string | undefined): string => {
  if (!weatherStr) return "☀️";

  if (
    weatherStr.includes("⛈️") ||
    weatherStr.includes("⚡") ||
    weatherStr.includes("🌧️")
  )
    return "⛈️";
  if (
    weatherStr.includes("🌫️") ||
    weatherStr.includes("💨") ||
    weatherStr.includes("☁️")
  )
    return "🌫️";
  if (
    weatherStr.includes("🍃") ||
    weatherStr.includes("🌿") ||
    weatherStr.includes("🌱")
  )
    return "🍃";
  if (
    weatherStr.includes("☀️") ||
    weatherStr.includes("🌤️") ||
    weatherStr.includes("🔆")
  )
    return "☀️";

  const lower = weatherStr.toLowerCase();

  if (
    lower.includes("storm") ||
    lower.includes("oluja") ||
    lower.includes("grmljav") ||
    lower.includes("preplavlj") ||
    lower.includes("overload")
  ) {
    return "⛈️";
  }

  if (
    lower.includes("fog") ||
    lower.includes("magla") ||
    lower.includes("drained") ||
    lower.includes("umor") ||
    lower.includes("iscrp")
  ) {
    return "🌫️";
  }

  if (
    lower.includes("clear") ||
    lower.includes("sky") ||
    lower.includes("vedro") ||
    lower.includes("balanced") ||
    lower.includes("balans") ||
    lower.includes("smir")
  ) {
    return "🍃";
  }

  return "☀️";
};

// Default templates for mock logs to populate previous days if history is empty (for Premium functions)
const DEFAULT_HISTORY_TEMPLATE = [
  {
    date: "2026-06-04",
    state: "FOCUSED",
    weather: "☀️ Sunshine",
    emotion: "Motivated",
    theme: "Work",
  },
  {
    date: "2026-06-05",
    state: "BALANCED",
    weather: "🍃 Clear Sky",
    emotion: "Calm",
    theme: "Growth",
  },
  {
    date: "2026-06-06",
    state: "OVERLOADED",
    weather: "⛈️ Storm",
    emotion: "Pressured",
    theme: "Work",
  },
  {
    date: "2026-06-07",
    state: "DRAINED",
    weather: "🌫️ Fog",
    emotion: "Tired",
    theme: "Recovery",
  },
  {
    date: "2026-06-08",
    state: "DRAINED",
    weather: "🌫️ Fog",
    emotion: "Overwhelmed",
    theme: "Work",
  },
  {
    date: "2026-06-09",
    state: "BALANCED",
    weather: "🍃 Clear Sky",
    emotion: "Rested",
    theme: "Relationships",
  },
];

export function determineCategoryForGoalOrIdea(
  text: string,
  isGoal: boolean,
): "A" | "B" | "C" | "D" | "E" | null {
  if (!text || text.trim().length < 4) return null;
  const lower = text.toLowerCase().trim();

  // Very abstract or conversational phrases (no active verb / nouns indicating action)
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
    "sreća",
    "sreca",
    "mir",
    "razmišljanje",
    "razmisljanje",
    "ljubav",
    "harmonija",
  ];
  if (
    abstractPhrases.some(
      (p) => lower === p || (lower.includes(p) && lower.split(" ").length < 4),
    )
  ) {
    return null;
  }

  // D (Delegated / Waiting for / Dependencies)
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
    "čekaj",
    "čekam",
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
    "proveri sa",
  ];
  if (dKeywords.some((w) => lower.includes(w))) {
    return "D";
  }

  // E (Postpone / Backlog / Future / Not today)
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
    "eliminiši",
    "next year",
    "sometime",
    "kasnije",
    "sledeće nedelje",
    "sledec",
    "odloži",
    "odlozi",
    "budućnost",
    "buducnost",
    "drugi put",
    "ne danas",
    "nekad",
    "sledeće godine",
    "arhiviraj",
    "izbriši",
  ];
  if (eKeywords.some((w) => lower.includes(w))) {
    return "E";
  }

  // A (Urgent / Core / Critical / Active Verbs for immediate finish)
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
    "završi",
    "zavrsi",
    "reši",
    "resi",
    "isplati",
    "plati",
    "ključno",
    "kljucno",
    "bilo kako",
    "glavno",
    "obavezno",
    "rok",
    "završiti",
    "resiti",
    "plaćanje",
  ];
  if (aKeywords.some((w) => lower.includes(w))) {
    return "A";
  }

  // B (Important / Planning / Strategy / Health / Knowledge)
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
    "uči",
    "uci",
    "pripremi",
    "istraž",
    "istraz",
    "vežbaj",
    "vezbaj",
    "analiziraj",
    "strategija",
    "zdravlje",
    "trening",
    "čitaj",
    "citaj",
    "knjiga",
    "kurs",
    "razvijaj",
    "napravi",
    "organizuj",
    "meditacija",
    "navika",
    "struktura",
  ];
  if (bKeywords.some((w) => lower.includes(w))) {
    return "B";
  }

  // C (Nice to have / Ideas / Sandbox / Low leverage / Creative seed / Exploration)
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
    "možda",
    "mozda",
    "probaj",
    "istražuj",
    "istrazuj",
    "seme",
    "zanimljivo",
    "fino",
    "koncept",
    "inspiracija",
    "kreativno",
    "želja",
    "zelja",
    "sanjaj",
    "podkast",
    "gledaj",
    "smešno",
  ];
  if (cKeywords.some((w) => lower.includes(w))) {
    return "C";
  }

  // If there are no clear action markers, verify if the text suggests any work at all
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
    "piši",
    "pisi",
    "pozovi",
    "pošalji",
    "posalji",
    "kupi",
    "nabavi",
    "idi",
    "sretni",
    "pričaj",
    "pricaj",
    "proveri",
    "testiraj",
    "pokreni",
    "očisti",
    "ocisti",
    "popravi",
    "počni",
    "pocni",
  ];
  if (actionVerbs.some((v) => lower.includes(v))) {
    return isGoal ? "B" : "C";
  }

  // Common task-related nouns to identify if it is indeed a task/project description
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
    "izveštaj",
    "report",
    "mejl",
    "email",
    "poruk",
    "msg",
    "prezentacij",
    "presentation",
    "clanak",
    "članak",
    "post",
    "video",
    "epizod",
    "sastanak",
    "meeting",
    "poziv",
    "call",
    "racun",
    "račun",
    "invoice",
    "kartu",
    "ticket",
    "dokument",
    "document",
    "analiz",
    "analysis",
  ];
  if (taskNouns.some((n) => lower.includes(n))) {
    return isGoal ? "B" : "C";
  }

  return null;
}

// Helper to get local YYYY-MM-DD date string consistently
const getLocalTodayStr = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const localNow = new Date(now.getTime() - offsetMs);
  return localNow.toISOString().split("T")[0];
};

export function MorningAIHub({
  language,
  tasks,
  onAddTask,
  onAddMultipleTasks,
  onNavigateToTab,
  isEvening = false,
  onStepChange,
  activeAiTone = "default",
  initialBrainDump,
  initialStep,
}: MorningAIHubProps) {
  const isEn = language === "en";

  // Navigation steps:
  // 1: Welcome/Good morning
  // 2: Today's theme Selection
  // 3: Brain Dump text-area input
  // 4: Weather & Emotions selection screen
  // 5: Brain Map bento-grid results
  // 6: Mindset Belief Warning (conditional)
  // 7: AI Coach main dashboard

  const [showFramework, setShowFramework] = useState(false);
  const [userName, setUserName] = useState<string>(() => {
    return safeStorage.getItem("kaizen_morning_username") || "Mirjana";
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // 🧠 Interactive neural mind map visual states
  const [selectedMindMapItem, setSelectedMindMapItem] = useState<{
    id: string;
    type: "center" | "task" | "goal" | "worry" | "idea";
    title: string;
    detail?: string;
    category?: string;
  } | null>(null);

  // Form Inputs
  const [selectedTheme, setSelectedTheme] = useState<string>("board");
  const [customTheme, setCustomTheme] = useState<string>("");
  const [brainDumpText, setBrainDumpText] = useState<string>("");
  const [energyRating, setEnergyRating] = useState<number>(0);
  const [pleasureRating, setPleasureRating] = useState<number>(0);
  const [hasInteractedEnergy, setHasInteractedEnergy] =
    useState<boolean>(false);
  const [hasInteractedPleasure, setHasInteractedPleasure] =
    useState<boolean>(false);
  const [moodConfirmed, setMoodConfirmed] = useState<boolean>(false);

  useEffect(() => {
    if (moodConfirmed) {
      const today = new Date().toISOString().split("T")[0];
      const lastCoinDate = safeStorage.getItem("discovery_last_mood_event_date");
      if (lastCoinDate !== today) {
        triggerDiscoveryEvent("morning_reflection", { source: "mood_confirmed" });
        safeStorage.setItem("discovery_last_mood_event_date", today);
        window.dispatchEvent(new Event("storage"));
      }
    }
  }, [moodConfirmed]);

  const [showMoodMatrix, setShowMoodMatrix] = useState<boolean>(false);

  const getDynamicEmotionGroup = (energy: number, pleasure: number) => {
    if (energy >= 0 && pleasure >= 0) {
      return {
        quadrant: "YELLOW / GOLD",
        title: isEn
          ? "🤩 High Energy + High Pleasantness (Active Positive)"
          : language === "tr"
            ? "🤩 Yüksek Enerji + Yüksek Hoşluk (Aktif Pozitif)"
            : "🤩 Visoka energija + Visoka prijatnost (Aktivna pozitivna stanja)",
        emotions: isEn
          ? [
              "Excitement",
              "Joy",
              "Enthusiasm",
              "Inspiration",
              "Motivation",
              "Pride",
              "Thrilled",
              "Euphoria",
              "Love",
              "Passion",
            ]
          : language === "tr"
            ? [
                "Heyecan",
                "Neşe",
                "Coşku",
                "İlham",
                "Motivasyon",
                "Gurur",
                "Heyecanlı",
                "Öfori",
                "Aşk",
                "Tutku",
              ]
            : [
                "Oduševljenje",
                "Radost",
                "Entuzijazam",
                "Inspiracija",
                "Motivisanost",
                "Ponos",
                "Uzbuđenje",
                "Euforija",
                "Zaljubljenost",
                "Strast",
              ],
        color:
          "text-[#FF9500] bg-[#FF9500] dark:bg-[#FF9F0A]/10 dark:bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-[#FF9500] dark:border-[#FF9F0A]/25 dark:border-[#FF9500]/20 dark:border-[#FF9F0A]/20",
        indicator: "🤩",
      };
    } else if (energy < 0 && pleasure >= 0) {
      return {
        quadrant: "GREEN / SAGE",
        title: isEn
          ? "😌 Low Energy + High Pleasantness (Calm Positive)"
          : language === "tr"
            ? "😌 Düşük Enerji + Yüksek Hoşluk (Sakin Pozitif)"
            : "😌 Niska energija + Visoka prijatnost (Mirna pozitivna stanja)",
        emotions: isEn
          ? [
              "Calmness",
              "Satisfaction",
              "Serenity",
              "Relaxed",
              "Gratitude",
              "Safety",
              "Acceptance",
              "Peace",
              "Quiet Happiness",
              "Comfort",
            ]
          : language === "tr"
            ? [
                "Sakinlik",
                "Memnuniyet",
                "Huzur",
                "Rahatlamış",
                "Şükran",
                "Güvenlik",
                "Kabullenme",
                "Barış",
                "Sessiz Mutluluk",
                "Konfor",
              ]
            : [
                "Smirenost",
                "Zadovoljstvo",
                "Spokoj",
                "Opuštenost",
                "Zahvalnost",
                "Sigurnost",
                "Prihvatanje",
                "Mir",
                "Sreća (tiha)",
                "Udobnost",
              ],
        color:
          "text-[#34C759] bg-[#34C759] dark:bg-[#30D158]/10 dark:bg-[#34C759]/10 dark:bg-[#30D158]/10 border-[#34C759] dark:border-[#30D158]/25 dark:border-[#34C759]/20 dark:border-[#30D158]/20",
        indicator: "😌",
      };
    } else if (energy >= 0 && pleasure < 0) {
      return {
        quadrant: "RED / AMBER",
        title: isEn
          ? "😡 High Energy + Low Pleasantness (Active Negative)"
          : language === "tr"
            ? "😡 Yüksek Enerji + Düşük Hoşluk (Aktif Negatif)"
            : "😡 Visoka energija + Niska prijatnost (Aktivna negativna stanja)",
        emotions: isEn
          ? [
              "Anger",
              "Frustration",
              "Anxiety",
              "Panic",
              "Fear",
              "Jealousy",
              "Resentment",
              "Tension",
              "Overwhelmed",
              "Hatred",
            ]
          : language === "tr"
            ? [
                "Öfke",
                "Hayal Kırıklığı",
                "Anksiyete",
                "Panik",
                "Korku",
                "Kıskançlık",
                "Dargınlık",
                "Gerginlik",
                "Bunalmış",
                "Nefret",
              ]
            : [
                "Bes",
                "Frustracija",
                "Anksioznost",
                "Panika",
                "Strah",
                "Ljubomora",
                "Ogorčenost",
                "Napetost",
                "Preplavljenost",
                "Mržnja",
              ],
        color:
          "text-[#FF3B30] bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 dark:bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border-[#FF3B30] dark:border-[#FF453A]/25 dark:border-[#FF3B30]/20 dark:border-[#FF453A]/20",
        indicator: "😡",
      };
    } else {
      return {
        quadrant: "BLUE / INDIGO",
        title: isEn
          ? "😔 Low Energy + Low Pleasantness (Withdrawn Negative)"
          : language === "tr"
            ? "😔 Düşük Enerji + Düşük Hoşluk (Negatifin Geri Çekilmesi)"
            : "😔 Niska energija + Niska prijatnost (Povučena negativna stanja)",
        emotions: isEn
          ? [
              "Sadness",
              "Depression",
              "Apathy",
              "Loneliness",
              "Emptiness",
              "Disappointment",
              "Guilt",
              "Shame",
              "Despair",
              "Resignation",
            ]
          : language === "tr"
            ? [
                "Üzüntü",
                "Depresyon",
                "Apati",
                "Yalnızlık",
                "Boşluk",
                "Hayal Kırıklığı",
                "Suçluluk",
                "Utanç",
                "Umutsuzluk",
                "Boyun Eğme",
              ]
            : [
                "Tuga",
                "Depresivnost",
                "Bezvoljnost",
                "Usamljenost",
                "Osećaj praznine",
                "Razočaranje",
                "Krivica",
                "Stid",
                "Očaj",
                "Rezignacija",
              ],
        color:
          "text-[#007AFF] bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20 border-black/5 dark:border-white/5",
        indicator: "😔",
      };
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  useEffect(() => {
    let interval: any;
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
  const [animationStatus, setAnimationStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const triggerHaptics = (
    type: "light" | "medium" | "heavy" | "success" | "warning" | "error",
  ) => {
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
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [showHelperPrompts, setShowHelperPrompts] = useState<boolean>(false);

  const handleInsertTagTemplate = (type: string) => {
    let template = "";
    if (type === "Ideas" || type === "Fikirler" || type === "Ideje") {
      template = isEn ? "💡 [Idea]: " : language === "tr" ? "💡 [Fikir]: " : "💡 [Ideja]: ";
    } else if (type === "Tasks" || type === "Görevler" || type === "Obaveze") {
      template = isEn ? "✅ [Task]: " : language === "tr" ? "✅ [Görev]: " : "✅ [Zadatak]: ";
    } else if (type === "Worries" || type === "Endişeler" || type === "Brige") {
      template = isEn ? "💭 [Worry]: " : language === "tr" ? "💭 [Endişe]: " : "💭 [Briga]: ";
    } else {
      template = isEn ? "🎯 [Goal]: " : language === "tr" ? "🎯 [Hedef]: " : "🎯 [Cilj]: ";
    }
    
    setBrainDumpText((prev) => {
      const space = prev.length > 0 && !prev.endsWith("\n") ? "\n" : "";
      return prev + space + template;
    });
    triggerHaptics("light");
  };

  const handleSelectPrompt = (promptText: string) => {
    setBrainDumpText((prev) => {
      const space = prev.length > 0 && !prev.endsWith("\n") ? "\n" : "";
      return prev + space + promptText + " ";
    });
    triggerHaptics("light");
  };
  const [expandedContent, setExpandedContent] = useState<{
    title: string;
    description: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    darkTextColor?: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"slides" | "grid">(() => {
    return (
      (safeStorage.getItem("morning_hub_layout_v2") as "slides" | "grid") ||
      "slides"
    );
  });
  const modulesScrollRef = useRef<HTMLDivElement>(null);

  // Voice recognition states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<any>(null);

  // AI Parsed Result Data state
  const [parsedData, setParsedData] = useState<any>(() => {
    const todayStr = getLocalTodayStr();
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

  const [step, setStep] = useState<number>(() => {
    if (initialStep !== undefined && initialStep > 0) {
      return initialStep;
    }
    const todayStr = getLocalTodayStr();
    const saved = safeStorage.getItem(`kaizen_morning_reset_data_${todayStr}`);
    const savedStep = safeStorage.getItem("kaizen_morning_active_step");
    if (savedStep) {
      const parsed = parseInt(savedStep, 10);
      // If the saved step was 5 (the completion screen) but today's reset is not actually done/saved,
      // we must reset back to step 1 so they can perform today's morning reset!
      if (parsed === 5 && !saved) {
        return 1;
      }
      return parsed;
    }
    return saved ? 5 : 1;
  });

  useEffect(() => {
    safeStorage.setItem("kaizen_morning_active_step", step.toString());
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    if (initialBrainDump !== undefined && initialBrainDump !== "") {
      setBrainDumpText(initialBrainDump);
    }
  }, [initialBrainDump]);

  useEffect(() => {
    if (initialStep !== undefined) {
      setStep(initialStep);
    }
  }, [initialStep]);

  // Track priority overrides for items before they are synced
  const [localPriorityOverrides, setLocalPriorityOverrides] = useState<
    Record<string, "A" | "B" | "C" | "D" | "E">
  >({});

  // Expanded status for the past morning brain dumps & copied states
  const [morningVaultExpanded, setMorningVaultExpanded] =
    useState<boolean>(false);
  const [copiedDumpId, setCopiedDumpId] = useState<string>("");

  // Selected morning view is strictly bento grid now
  const [selectedMorningView, setSelectedMorningView] = useState<
    "bento" | "mindmap"
  >("bento");

  const [isChallengeAccepted, setIsChallengeAccepted] = useState<boolean>(false);
  // Toggle style for the interactive mind map: visual graph (glowing SVG) or structured explorer (list)
  const [mindMapViewStyle, setMindMapViewStyle] = useState<"graph" | "list">(
    "graph",
  );
  // Current selected node in neural mind map
  const [selectedMindMapNode, setSelectedMindMapNode] = useState<{
    id: string;
    clusterType: "tasks" | "worries" | "ideas" | "goals" | "dopamine";
    title: string;
    description: string;
    meta?: any;
    isPlaceholder?: boolean;
  } | null>(null);
  // Focus filtering for clusters in neural mind map
  const [activeMindMapCluster, setActiveMindMapCluster] = useState<
    "all" | "tasks" | "worries" | "ideas" | "goals" | "dopamine"
  >("all");
  // Holds input for adding custom items in the interactive mind map
  const [mindMapInput, setMindMapInput] = useState<string>("");
  // Vault / Trezor States
  const [vaultOpen, setVaultOpen] = useState<boolean>(false);
  const [vaultSearch, setVaultSearch] = useState<string>("");
  const [vaultFilter, setVaultFilter] = useState<
    "all" | "morning" | "nlp" | "rebt" | "biohack" | "ta"
  >("all");

  const isDimmed = (cluster: string) => {
    return activeMindMapCluster !== "all" && activeMindMapCluster !== cluster;
  };

  const truncateLabel = (text: string) => {
    if (!text) return "";
    if (text.length <= 16) return text;
    return text.substring(0, 14) + "...";
  };

  // Reframe states for quick mindmap interactions
  const [reframeLoading, setReframeLoading] = useState<boolean>(false);
  const [reframeResult, setReframeResult] = useState<string | null>(null);

  // Quick reframe function using Dr. Omni (specialist for Stress, Perfectionism, and Worry)
  const handleOmniReframe = async (worryText: string) => {
    if (!worryText || reframeLoading) return;
    setReframeLoading(true);
    setReframeResult(null);
    if (typeof window !== "undefined" && (window as any).triggerHaptics) {
      (window as any).triggerHaptics("medium");
    }

    try {
      const prompt = isEn
        ? `As Dr. Omni Naumann, a clinical psychotherapist specializing in stress, perfectionism, and anxiety regulation, perform an instant, deeply empathetic, highly transformative cognitive reframing (transformation) for the following morning worry. Speak to me with deep reassurance, validate my feeling, but break down why this is a natural protective response, and offer a concrete, empowering, rational new lens. Worry: "${worryText}"`
        : language === "tr"
          ? `Stres, mükemmeliyetçilik ve kaygıyı düzenleme konusunda uzmanlaşmış bir klinik psikoterapist olan Dr. Omni Naumann, ertesi sabah endişesi için anında, derinlemesine empatiye sahip, son derece dönüştürücü bir bilişsel yeniden çerçeveleme gerçekleştiriyor. Benimle derin bir güvenceyle konuşun, duygularımı doğrulayın, ancak bunun neden doğal bir koruyucu tepki olduğunu açıklayın ve somut, güçlendirici, rasyonel yeni bir bakış açısı sunun. Endişe: "${worryText}"`
          : `Kao Dr. Omni Naumann, klinički psihoterapeut i ekspert za stres i perfekcionizam, uradi instant, duboko saosećajnu i transformativnu kognitivnu transformaciju (reframe) za sledeću jutarnju brigu. Govori toplo, potvrdi moje osećanje, ali mi objasni zašto je to bezazlena zaštitna reakcija mog uma i ponudi mi moćnu racionalnu alternativu. Briga: "${worryText}"`;

      const response = await fetch(
        window.location.origin + "/api/advisor-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advisorId: "sofija",
            message: prompt,
            language: language,
            aiTone: activeAiTone,
          }),
        },
      );

      if (!response.ok) throw new Error("Network issue during reframe.");
      const resultData = await response.json();
      setReframeResult(resultData.response);
      if (typeof window !== "undefined" && (window as any).triggerHaptics) {
        (window as any).triggerHaptics("success");
      }
    } catch (err: any) {
      console.error("Reframe error:", err);
      setReframeResult(
        isEn
          ? "Omni had trouble connecting. Take a long, deep breath: Your thoughts are just protective filters, you are safe."
          : language === "tr"
            ? "Omni bağlanmada sorun yaşadı. Uzun, derin bir nefes alın: Düşünceleriniz sadece koruyucu filtrelerdir, güvendesiniz."
            : "Nisam uspela da se povežem sa psihoterapeutom Omni. Udahni duboko: tvoje misli su samo stari filteri zaštite, u potpunosti si bezbedan/na.",
      );
      if (typeof window !== "undefined" && (window as any).triggerHaptics) {
        (window as any).triggerHaptics("error");
      }
    } finally {
      setReframeLoading(false);
    }
  };

  const renderFormattedBiohack = (text: string) => {
    if (!text) return null;
    const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
    return (
      <span className="block space-y-2 text-left text-[12.5px] sm:text-[13px] text-black dark:text-[#EBEBF5]/60">
        {paragraphs.map((para, idx) => {
          const isList =
            para.trim().startsWith("-") ||
            para.trim().startsWith("•") ||
            /^\d+\./.test(para.trim());
          const parts = para.split(/(\*\*[^*]+\*\*)/g);
          return (
            <span
              key={idx}
              className={`block leading-relaxed ${isList ? "pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[#007AFF] before:font-bold" : ""}`}
            >
              {parts.map((part, pIdx) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  const rawText = part.slice(2, -2);
                  return (
                    <strong
                      key={pIdx}
                      className="font-bold text-[#007AFF] dark:text-[#0A84FF] mx-0.5"
                    >
                      {rawText}
                    </strong>
                  );
                }
                return part;
              })}
            </span>
          );
        })}
      </span>
    );
  };

  // User selections from AI suggestions
  const [selectedEmotion, setSelectedEmotion] = useState<string>("");

  const [confirmedDrivers, setConfirmedDrivers] = useState<string[]>([]);
  const [isTasksSynced, setIsTasksSynced] = useState<boolean>(false);
  const [syncedGoals, setSyncedGoals] = useState<Set<string>>(new Set());
  const [syncedIdeas, setSyncedIdeas] = useState<Set<string>>(new Set());
  const isHydrating = useRef(true);

  // Auto-save parsedData changes
  useEffect(() => {
    if (isHydrating.current) return;
    if (parsedData) {
      const todayStr = getLocalTodayStr();
      const dataToSave = {
        ...parsedData,
        selectedEmotion,
        confirmedDrivers,
        isTasksSynced,
        syncedGoals: Array.from(syncedGoals),
        syncedIdeas: Array.from(syncedIdeas),
        selectedTheme,
      };
      safeStorage.setItem(
        `kaizen_morning_reset_data_${todayStr}`,
        JSON.stringify(dataToSave),
      );
    }
  }, [
    parsedData,
    selectedEmotion,
    confirmedDrivers,
    isTasksSynced,
    syncedGoals,
    syncedIdeas,
    selectedTheme,
  ]);

  // Keep isTasksSynced reactively in sync with the live tasks board
  useEffect(() => {
    if (parsedData && parsedData.tasks && parsedData.tasks.length > 0) {
      const allSynced = parsedData.tasks.every((t: any) =>
        tasks.some(
          (existing) =>
            existing.title.toLowerCase().trim() ===
            t.title.toLowerCase().trim(),
        ),
      );
      if (isTasksSynced !== allSynced) {
        setIsTasksSynced(allSynced);
      }
    } else {
      if (isTasksSynced !== false) {
        setIsTasksSynced(false);
      }
    }
  }, [tasks, parsedData, isTasksSynced]);

  // User feedback on action completion
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>(
    () => {
      try {
        const today = getLocalTodayStr();
        const saved = safeStorage.getItem(
          `abcde_morning_actions_feedback_${today}`,
        );
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    },
  );

  const updateActionFeedback = (key: string, value: string) => {
    setActionFeedback((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        const today = getLocalTodayStr();
        safeStorage.setItem(
          `abcde_morning_actions_feedback_${today}`,
          JSON.stringify(updated),
        );
      } catch (e) {}
      return updated;
    });
  };

  const handleDecomposeGoal = (goalText: string, id: string) => {
    let VisionInbox: string[] = [];
    try {
      const saved = safeStorage.getItem("abcde_vchamber_inbox");
      if (saved) VisionInbox = JSON.parse(saved);
    } catch (e) {}

    if (!VisionInbox.includes(goalText)) {
      VisionInbox.unshift(goalText);
      safeStorage.setItem("abcde_vchamber_inbox", JSON.stringify(VisionInbox));
    }

    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn
      ? "Sent to Strategic Vision ✓"
      : language === "tr"
        ? "Stratejik Vizyon'a Gönderildi ✓"
        : "Poslato u Stratešku Viziju ✓";
    updateActionFeedback(goalText, msg);
    updateActionFeedback(id, msg);

    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: msg,
          type: "success",
        },
      }),
    );
  };

  const handleAddGoalAsTask = (
    goalText: string,
    id: string,
    category: "A" | "B" | "C" | "D" | "E",
  ) => {
    const title =
      (isEn ? "Goal: " : language === "tr" ? "Hedef: " : "Cilj: ") + goalText;
    const isDuplicate = tasks.some(
      (t) =>
        t.title.toLowerCase().trim() === title.toLowerCase().trim() ||
        t.title.toLowerCase().trim() === goalText.toLowerCase().trim(),
    );
    if (syncedGoals.has(goalText) || isDuplicate) return;

    onAddTask(title, goalText, category);

    // Dispatch sync with a slight timeout so React and localStorage are fully written
    setTimeout(() => {
      window.dispatchEvent(new Event("storage_sync"));
    }, 50);

    const msg = isEn
      ? `Added to ABCDE Board (${category}) ✓`
      : language === "tr"
        ? `ABCDE Board'a eklendi (${category}) ✓`
        : `Dodato na ABCDE Tablu (${category}) ✓`;
    updateActionFeedback(goalText, msg);
    updateActionFeedback(id, msg);
    setSyncedGoals((prev) => {
      const next = new Set(prev);
      next.add(goalText);

      // Persist to reset data
      const todayStr = getLocalTodayStr();
      const saved = safeStorage.getItem(
        `kaizen_morning_reset_data_${todayStr}`,
      );
      if (saved) {
        try {
          const data = JSON.parse(saved);
          data.syncedGoals = Array.from(next);
          safeStorage.setItem(
            `kaizen_morning_reset_data_${todayStr}`,
            JSON.stringify(data),
          );
        } catch (e) {}
      }

      return next;
    });

    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };

  const handleReframeWorry = (worryText: string, id: string) => {
    let pending: string[] = [];
    try {
      const stored = safeStorage.getItem("abcde_pending_mindset_thoughts");
      if (stored) pending = JSON.parse(stored);
    } catch (e) {}
    pending.push(worryText);
    safeStorage.setItem(
      "abcde_pending_mindset_thoughts",
      JSON.stringify(pending),
    );

    let pendingTab = "Protocol";
    const wLower = String(worryText || "").toLowerCase();
    if (
      wLower.includes("uverenje") ||
      wLower.includes("ne mogu") ||
      wLower.includes("moram") ||
      wLower.includes("uvek") ||
      wLower.includes("nikad") ||
      wLower.includes("strah") ||
      wLower.includes("panik") ||
      wLower.includes("katastrof") ||
      wLower.includes("užas")
    ) {
      pendingTab = "rebt";
    } else if (
      wLower.includes("umor") ||
      wLower.includes("iscrpljen") ||
      wLower.includes("spavanje") ||
      wLower.includes("energij") ||
      wLower.includes("fokus") ||
      wLower.includes("dopamin") ||
      wLower.includes("mozak") ||
      wLower.includes("telo") ||
      wLower.includes("bol") ||
      wLower.includes("zdravlj")
    ) {
      pendingTab = "biohack";
    } else if (
      wLower.includes("dete") ||
      wLower.includes("krivica") ||
      wLower.includes("drugi ljudi") ||
      wLower.includes("žrtv") ||
      wLower.includes("rekao") ||
      wLower.includes("ljut") ||
      wLower.includes("šef") ||
      wLower.includes("koleg") ||
      wLower.includes("roditelj") ||
      wLower.includes("odnos") ||
      wLower.includes("komunikacij")
    ) {
      pendingTab = "ta";
    } else {
      pendingTab = "Protocol";
    }
    safeStorage.setItem("abcde_pending_mindset_tab", pendingTab);

    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn
      ? "Sent to AI Coach ✓"
      : language === "tr"
        ? "AI Koçu'na gönderildi ✓"
        : "Poslato za AI Trener ✓";
    updateActionFeedback(worryText, msg);
    updateActionFeedback(id, msg);

    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };

  const handleTrackWorry = (worryText: string, id: string) => {
    onAddTask(
      isEn
        ? `Resolve concern: ${worryText}`
        : language === "tr"
          ? `Endişeyi giderin: ${worryText}`
          : `Reši zabrinutost: ${worryText}`,
      isEn
        ? "Worry/anxiety identified in morning session. Design a buffer or protective measure."
        : language === "tr"
          ? "Sabah oturumunda belirlenen endişe/endişe. Bir tampon veya koruyucu önlem tasarlayın."
          : "Briga identifikovana u jutarnjoj analizi. Osmisliti zaštitne korake.",
      "B",
    );
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn
      ? "Added to ABCDE (B) ✓"
      : language === "tr"
        ? "ABCDE'ye eklendi (B) ✓"
        : "Dodato u ABCDE (B) ✓";
    updateActionFeedback(worryText, msg);
    updateActionFeedback(id, msg);

    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };

  const handleDiscardWorry = (worryText: string, id: string) => {
    const msg = isEn
      ? "Mentally Released 🌬️"
      : language === "tr"
        ? "Zihinsel Rahatlama 🌬️"
        : "Mentalno Otpušteno 🌬️";
    updateActionFeedback(worryText, msg);
    updateActionFeedback(id, msg);
    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: isEn
            ? "You've chosen to let this worry go."
            : language === "tr"
              ? "Bu endişeyi bırakmayı seçtin."
              : "Odlučili ste da otpustite ovu brigu.",
          type: "success",
        },
      }),
    );

    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 600);
  };

  const handleSaveIdea = (
    ideaText: string,
    id: string,
    category: "A" | "B" | "C" | "D" | "E",
  ) => {
    const title =
      (isEn ? "Idea: " : language === "tr" ? "Fikir: " : "Ideja: ") + ideaText;
    const isDuplicate = tasks.some(
      (t) =>
        t.title.toLowerCase().trim() === title.toLowerCase().trim() ||
        t.title.toLowerCase().trim() === ideaText.toLowerCase().trim(),
    );
    if (syncedIdeas.has(ideaText) || isDuplicate) return;

    onAddTask(title, ideaText, category);

    // Dispatch sync with a slight timeout so React and localStorage are fully written
    setTimeout(() => {
      window.dispatchEvent(new Event("storage_sync"));
    }, 50);

    const msg = isEn
      ? `Saved to ABCDE Board (${category}) ✓`
      : language === "tr"
        ? `ABCDE Board'a (${category}) kaydedildi ✓`
        : `Sačuvano na ABCDE Tabli (${category}) ✓`;
    updateActionFeedback(ideaText, msg);
    updateActionFeedback(id, msg);
    setSyncedIdeas((prev) => {
      const next = new Set(prev);
      next.add(ideaText);

      // Persist to reset data
      const todayStr = getLocalTodayStr();
      const saved = safeStorage.getItem(
        `kaizen_morning_reset_data_${todayStr}`,
      );
      if (saved) {
        try {
          const data = JSON.parse(saved);
          data.syncedIdeas = Array.from(next);
          safeStorage.setItem(
            `kaizen_morning_reset_data_${todayStr}`,
            JSON.stringify(data),
          );
        } catch (e) {}
      }

      return next;
    });

    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 1500);
  };

  const handleElaborateIdea = (ideaText: string, id: string) => {
    let VisionInbox: string[] = [];
    try {
      const saved = safeStorage.getItem("abcde_vchamber_inbox");
      if (saved) VisionInbox = JSON.parse(saved);
    } catch (e) {}

    if (!VisionInbox.includes(ideaText)) {
      VisionInbox.unshift(ideaText);
      safeStorage.setItem("abcde_vchamber_inbox", JSON.stringify(VisionInbox));
    }

    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn
      ? "Sent to Strategic Vision ✓"
      : language === "tr"
        ? "Stratejik Vizyon'a Gönderildi ✓"
        : "Poslato u Stratešku Viziju ✓";
    updateActionFeedback(ideaText, msg);
    updateActionFeedback(id, msg);

    window.dispatchEvent(
      new CustomEvent("trigger-toast", {
        detail: {
          message: msg,
          type: "success",
        },
      }),
    );

    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };

  const handleTrackWaiting = (waitingText: string, id: string) => {
    onAddTask(
      isEn
        ? `Follow up on: ${waitingText}`
        : language === "tr"
          ? `Takip: ${waitingText}`
          : `Uradi follow-up za: ${waitingText}`,
      isEn
        ? "Dependency (waiting for another person to deliver or complete)"
        : language === "tr"
          ? "Bağımlılık (başka bir kişinin teslim etmesini veya tamamlamasını beklemek)"
          : "Zavisnost (čekanje da druga osoba završi ili isporuči)",
      "D",
    );
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn
      ? "Tracked in ABCDE (D) ✓"
      : language === "tr"
        ? "ABCDE'de izleniyor (D) ✓"
        : "Prati se u ABCDE (D) ✓";
    updateActionFeedback(waitingText, msg);
    updateActionFeedback(id, msg);

    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };

  const handleSaveFutureTask = (futureText: string, id: string) => {
    onAddTask(
      futureText,
      isEn
        ? "Future task/backlog not intended for immediate today's focus."
        : language === "tr"
          ? "Gelecekteki görev/biriktirme listesi, bugünün acil odağına yönelik değildir."
          : "Budući zadatak koji nije predviđen za današnji neposredan fokus.",
      "E",
    );
    window.dispatchEvent(new Event("storage_sync"));
    const msg = isEn
      ? "Added to ABCDE Board (E) ✓"
      : language === "tr"
        ? "ABCDE Board'a (E) eklendi ✓"
        : "Dodato na ABCDE Tablu (E) ✓";
    updateActionFeedback(futureText, msg);
    updateActionFeedback(id, msg);

    setTimeout(() => {
      setSelectedMindMapNode(null);
    }, 450);
  };

  const handleAddMindMapItem = (
    clusterType: "tasks" | "worries" | "ideas" | "goals",
    textValue: string,
  ) => {
    if (!textValue.trim()) return;

    const updatedData = { ...parsedData };
    if (clusterType === "tasks") {
      const currentTasks = updatedData.tasks || [];
      const newTaskObj = {
        title: textValue,
        description: isEn
          ? "Custom task created directly from Neural Mind Map"
          : language === "tr"
            ? "Doğrudan Nöral Zihin Haritasından oluşturulan özel görev"
            : "Prilagođeni zadatak kreiran direktno iz Mape Uma",
        category: "A",
        status: "pending",
      };
      updatedData.tasks = [...currentTasks, newTaskObj];
    } else {
      const list = updatedData[clusterType] || [];
      updatedData[clusterType] = [...list, textValue];
    }

    setParsedData(updatedData);

    const listCount = (
      updatedData[clusterType === "tasks" ? "tasks" : clusterType] || []
    ).length;
    const newIndex = Math.min(3, listCount) - 1;

    setSelectedMindMapNode({
      id: `node_${clusterType}_${newIndex}`,
      clusterType,
      title: textValue,
      description:
        clusterType === "tasks"
          ? isEn
            ? "Actions integrated. Ready for ABC priorities."
            : language === "tr"
              ? "Eylemler entegre edildi. ABC önceliklerine hazır."
              : "Prilagođeni zadatak integrisan."
          : clusterType === "worries"
            ? isEn
              ? "Subjective limiting pattern. Reframe or send to AI Coach."
              : language === "tr"
                ? "Öznel sınırlama modeli. Yeniden çerçeveleyin veya AI Koçu'na gönderin."
                : "Kreativni preokret ove brige pomoću AI asistenta."
            : clusterType === "ideas"
              ? isEn
                ? "Splendid creative idea node."
                : language === "tr"
                  ? "Muhteşem yaratıcı fikir düğümü."
                  : "Sačuvana ideja za prevenciju monotonije."
              : isEn
                ? "Affirmed custom objective."
                : language === "tr"
                  ? "Onaylanan özel hedef."
                  : "Cilj uspešno zapisan.",
      isPlaceholder: false,
    });

    setMindMapInput("");

    if (typeof window !== "undefined" && (window as any).triggerHaptics) {
      (window as any).triggerHaptics("medium");
    }
  };

  // Travel History & Logs for the premium features
  const [resetsHistory, setResetsHistory] = useState<any[]>(() => {
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

  // Premium Features States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [weeklyReview, setWeeklyReview] = useState<string | null>(null);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);

  // Biohacking Tips for Mind Map / Cognitive Needs
  const [biohackTip, setBiohackTip] = useState<string>("");
  const [suggestedBiohackHabit, setSuggestedBiohackHabit] = useState<{
    name: string;
    twoMinVersion: string;
  } | null>(null);
  const [isGeneratingBiohack, setIsGeneratingBiohack] = useState(false);
  const [expandedCard, setExpandedCard] = useState<{
    type: string;
    title?: string;
    description?: string;
    category?: string;
    explanation?: string;
    complexity?: string;
    duration?: number;
  } | null>(null);

  const [worryCbtChoice, setWorryCbtChoice] = useState<
    "control" | "no-control" | null
  >(null);
  const [worryActionStep, setWorryActionStep] = useState<string>("");
  const [worryBreatheCount, setWorryBreatheCount] = useState<number>(-1);
  const [worryCbtCompleted, setWorryCbtCompleted] = useState<boolean>(false);

  useEffect(() => {
    setWorryCbtChoice(null);
    setWorryActionStep("");
    setWorryBreatheCount(-1);
    setWorryCbtCompleted(false);
  }, [expandedCard]);

  const fetchBiohackTip = async (needStr: string, currentTipStr?: string) => {
    if (!needStr) return;
    setIsGeneratingBiohack(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for AI biohack generation

    try {
      const response = await fetch(
        window.location.origin + "/api/biohack-generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            need: needStr,
            currentTip: currentTipStr || "",
            language: language,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setBiohackTip(data.tip);
        if (data.suggestedMicrohabit) {
          setSuggestedBiohackHabit(data.suggestedMicrohabit);

          // Push into global AI recommended habits pool for ProgressMatrix
          try {
            const aiRecsStr = safeStorage.getItem(
              "abcde_ai_recommended_habits",
            );
            const aiRecs = aiRecsStr ? JSON.parse(aiRecsStr) : [];
            const newRec = {
              id: "ai_rec_" + Date.now().toString(36),
              nameEn:
                language === "en"
                  ? data.suggestedMicrohabit.name
                  : "Biohack Integration",
              nameSr:
                language === "sr"
                  ? data.suggestedMicrohabit.name
                  : "Biohack Integracija",
              nameTr:
                language === "tr"
                  ? data.suggestedMicrohabit.name
                  : "Biohack Entegrasyonu",
              twoMinEn:
                language === "en" ? data.suggestedMicrohabit.twoMinVersion : "",
              twoMinSr:
                language === "sr" ? data.suggestedMicrohabit.twoMinVersion : "",
              twoMinTr:
                language === "tr" ? data.suggestedMicrohabit.twoMinVersion : "",
              whyEn: language === "en" ? data.tip : "",
              whySr: language === "sr" ? data.tip : "",
              whyTr: language === "tr" ? data.tip : "",
              area: "General / Razno",
              areaLabelEn: "🧠 AI Dynamic Insight",
              areaLabelSr: "🧠 AI Dijagnostika",
              areaLabelTr: "🧠 AI Teşhisi",
            };
            aiRecs.unshift(newRec);
            safeStorage.setItem(
              "abcde_ai_recommended_habits",
              JSON.stringify(aiRecs.slice(0, 15)),
            );
          } catch (e) {
            console.error("Failed to save ai recommended habit", e);
          }
        } else {
          setSuggestedBiohackHabit(null);
        }
        // Save to today's localstorage data so it persists
        const todayStr = getLocalTodayStr();
        const savedResetToday = safeStorage.getItem(
          `kaizen_morning_reset_data_${todayStr}`,
        );
        if (savedResetToday) {
          try {
            const dataObj = JSON.parse(savedResetToday);
            dataObj.savedBiohackTip = data.tip;
            dataObj.savedBiohackHabit = data.suggestedMicrohabit || null;
            safeStorage.setItem(
              `kaizen_morning_reset_data_${todayStr}`,
              JSON.stringify(dataObj),
            );
          } catch (e) {
            console.error(e);
          }
        }
      } else {
        setBiohackTip(
          language === "en"
            ? "Failed to connect to Biohacking engine. Please wait or reload."
            : language === "tr"
              ? "Biohacking motoruna bağlanılamadı. Lütfen bekleyin veya yeniden yükleyin."
              : "Nije uspostavljena veza sa AI neuro-sistemom. Pritisnite ikonicu da pokušate ponovo.",
        );
        setSuggestedBiohackHabit(null);
      }
    } catch (e) {
      console.error("Error fetching biohack tip:", e);
      setBiohackTip(
        language === "en"
          ? "Failed to connect to Biohacking engine. Please wait or reload."
          : language === "tr"
            ? "Biohacking motoruna bağlanılamadı. Lütfen bekleyin veya yeniden yükleyin."
            : "Nije uspostavljena veza sa AI neuro-sistemom.",
      );
    } finally {
      setIsGeneratingBiohack(false);
    }
  };

  // Check if reset was already done today
  const [resetCompletedToday, setResetCompletedToday] = useState<boolean>(
    () => {
      const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split("T")[0];
      return (
        safeStorage.getItem(`kaizen_morning_reset_done_${todayStr}`) === "true"
      );
    },
  );

  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Auto-load state if already completed today
  useEffect(() => {
    const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split("T")[0];
    const savedResetToday = safeStorage.getItem(
      `kaizen_morning_reset_data_${todayStr}`,
    );
    if (savedResetToday) {
      try {
        const data = JSON.parse(savedResetToday);
        setParsedData(data);
        setSelectedTheme(data.selectedTheme || "Work");
        setSelectedEmotion(data.selectedEmotion || data.emotions?.[0] || "");
        setConfirmedDrivers(data.confirmedDrivers || data.drivers || []);
        setIsTasksSynced(data.isTasksSynced || false);
        if (data.syncedGoals) setSyncedGoals(new Set(data.syncedGoals));
        if (data.syncedIdeas) setSyncedIdeas(new Set(data.syncedIdeas));
        setStep(5); // Jump straight to Mind Map if already completed
      } catch (e) {
        console.error("Error loading today's saved reset:", e);
      }
    }
    // Batch finish hydration
    setTimeout(() => {
      isHydrating.current = false;
    }, 100);
  }, []);

  // Sync biohacking tip state when parsedData is updated or language is toggled
  useEffect(() => {
    if (parsedData && parsedData.savedBiohackTip && !isGeneratingBiohack) {
      setBiohackTip(parsedData.savedBiohackTip);
      if (parsedData.savedBiohackHabit) {
        setSuggestedBiohackHabit(parsedData.savedBiohackHabit);
      }
    } else if (parsedData && parsedData.cognitive_chain?.need) {
      // Force fetching / re-generating in active language so tips always match
      fetchBiohackTip(parsedData.cognitive_chain.need);
    } else {
      setBiohackTip("");
      setSuggestedBiohackHabit(null);
    }
  }, [parsedData, language]);

  // Save changes to username
  const handleSaveName = () => {
    safeStorage.setItem("kaizen_morning_username", userName);
    setIsEditingName(false);
  };

  // Run the massive AI Brain parser
  const handleAnalyzeBrainDump = async () => {
    if (brainDumpText.trim().length < 3) {
      setAnalysisError(
        isEn
          ? "Please write a bit more so the AI can understand your focus points (minimum 3 characters)."
          : language === "tr"
            ? "Yapay zekanın odak noktalarınızı anlayabilmesi için lütfen biraz daha yazın (minimum 3 karakter)."
            : "Molimo napišite bar malo detalja kako bi AI mogao da razume vaš fokus (minimum 3 karaktera).",
      );
      return;
    }

    setIsAnalyzing(true);
    setAnimationStatus("loading");
    triggerHaptics("medium");
    setAnalysisError(null);

    const actualTheme =
      selectedTheme === "Custom" ? customTheme || "General" : selectedTheme;

    let ideaVaultItems: string[] = [];

    const controller = new AbortController();
    // const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for deep AI parsing

    try {
      const response = await fetch("/api/morning-reset-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brainDump: brainDumpText,
          theme: actualTheme,
          language: language,
          energyRating: energyRating,
          pleasureRating: pleasureRating,
          ideaVault: ideaVaultItems,
        }),
        signal: controller.signal,
      });

      // clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {}
        throw new Error(
          errorData?.error ||
            `Failed to analyze brain dump: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      if (
        data.follow_up_question &&
        typeof data.follow_up_question === "string" &&
        data.follow_up_question.trim().length > 0
      ) {
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

      // Explicitly save to localStorage immediately to prevent loss on navigation
      const todayStr = getLocalTodayStr();
      safeStorage.setItem(
        `kaizen_morning_reset_data_${todayStr}`,
        JSON.stringify(updatedData),
      );

      // Save suggested prompts for the Omni Agent
      if (
        data.suggested_omni_prompts &&
        Array.isArray(data.suggested_omni_prompts)
      ) {
        try {
          safeStorage.setItem(
            "omni_suggested_prompts",
            JSON.stringify(data.suggested_omni_prompts),
          );
        } catch (e) {}
      }

      setSelectedEmotion(data.emotions?.[0] || "");
      setConfirmedDrivers(data.drivers || []);
      setAnimationStatus("success");
      triggerHaptics("success");
      setTimeout(() => setAnimationStatus("idle"), 2500);
      setStep(5); // Advance directly to Mind Architecture screen
    } catch (err: any) {
      console.error("Network/API error in handleAnalyzeBrainDump:", err);

      const isEn = language === "en";
      let finalMessage = isEn
        ? `The AI Agent encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again later.`
        : language === "tr"
          ? `Yapay Zeka Aracısı bir hatayla karşılaştı: ${err instanceof Error ? err.message : "Unknown error"}. Lütfen daha sonra tekrar deneyin.`
          : `AI Agent je naišao na grešku: ${err instanceof Error ? err.message : "Nepoznata greška"}. Molimo pokušajte ponovo.`;

      if (err instanceof Error && err.name === "AbortError") {
        finalMessage = isEn
          ? "Analysis timed out (90s). Your input might be too long or complex."
          : language === "tr"
            ? "Analiz zaman aşımına uğradı (90'lar). Girişiniz çok uzun veya karmaşık olabilir."
            : "Vreme za analizu je isteklo (90s). Unos je možda predugačak.";
      } else if (
        err instanceof Error &&
        err.message.includes("VAŠ AI API KLJUČ JE OSTAO BEZ SREDSTAVA")
      ) {
        finalMessage = err.message;
      } else if (
        err instanceof Error &&
        (err.message.includes("quota") ||
          err.message.includes("limit") ||
          err.message.includes("429"))
      ) {
        finalMessage = isEn
          ? "AI Quota limit reached! Please wait 1-2 minutes before trying again."
          : language === "tr"
            ? "AI Kota sınırına ulaşıldı! Tekrar denemeden önce lütfen 1-2 dakika bekleyin."
            : "Dostignut je limit API zahteva (Kvote)! Molimo sačekajte par minuta.";
      }

      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: finalMessage,
            type: "error",
          },
        }),
      );
      setAnimationStatus("idle");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sync tasks to real ABCDE Priorities Board and other modules
  const handleSyncTasksToBoard = async () => {
    if (!parsedData) return;

    try {
      const allTasksToSync: any[] = [];
      const todayStr = getLocalTodayStr();

      // 1. Sync Tasks (always check for any missing unsynced tasks)
      if (parsedData.tasks && parsedData.tasks.length > 0) {
        parsedData.tasks.forEach((t: any) => {
          const normalizedTitle = t.title.toLowerCase().trim();
          const exists = tasks.some(
            (existing) =>
              existing.title.toLowerCase().trim() === normalizedTitle,
          );
          if (!exists) {
            allTasksToSync.push({
              title: t.title,
              description: t.description || "",
              category: t.category as "A" | "B" | "C" | "D" | "E",
              explanation: t.explanation || "",
            });
          }
        });
      }

      if (parsedData.waiting_for && parsedData.waiting_for.length > 0) {
        parsedData.waiting_for.forEach((wf: string) => {
          const title =
            (isEn
              ? "Pending: "
              : language === "tr"
                ? "Askıda olması:"
                : "Na čekanju: ") + wf;
          const normalizedTitle = title.toLowerCase().trim();
          const exists = tasks.some(
            (existing) =>
              existing.title.toLowerCase().trim() === normalizedTitle,
          );
          if (!exists) {
            allTasksToSync.push({
              title,
              description: wf,
              category: "D",
              explanation: isEn
                ? "Marked as waiting for external input."
                : language === "tr"
                  ? "Harici giriş bekleniyor olarak işaretlendi."
                  : "Označeno da zavisi od nekog drugog.",
            });
          }
        });
      }

      if (parsedData.not_today && parsedData.not_today.length > 0) {
        parsedData.not_today.forEach((nt: string) => {
          const title =
            (isEn
              ? "Future: "
              : language === "tr"
                ? "Gelecek:"
                : "Dugoročno: ") + nt;
          const normalizedTitle = title.toLowerCase().trim();
          const exists = tasks.some(
            (existing) =>
              existing.title.toLowerCase().trim() === normalizedTitle,
          );
          if (!exists) {
            allTasksToSync.push({
              title,
              description: nt,
              category: "E",
              explanation: isEn
                ? "Marked to not be done today."
                : language === "tr"
                  ? "Bugün yapılmayacak olarak işaretlendi."
                  : "Odloženo za neki drugi dan.",
            });
          }
        });
      }
      setIsTasksSynced(true);

      if (allTasksToSync.length > 0) {
        if (onAddMultipleTasks) {
          await onAddMultipleTasks(allTasksToSync);
        } else if (onAddTask) {
          allTasksToSync.forEach((t: any) => {
            onAddTask(t.title, t.description || "", t.category);
          });
        }
        triggerDiscoveryEvent("brain_dump_ai_plan_accepted", { tasksAdded: allTasksToSync.length });
      }

      // Mark as completed to clear synchronization warnings
      safeStorage.setItem(`kaizen_morning_reset_done_${todayStr}`, "true");

      const toastMessage = isEn
        ? "All tasks synced to ABCDE!"
        : language === "tr"
          ? "Tüm görevler ABCDE'ye eşitlendi!"
          : "Svi konkretni zadaci su raspoređeni u ABCDE!";

      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: toastMessage,
            type: "success",
          },
        }),
      );

      // Update local storage representation
      const todayData = {
        ...parsedData,
        selectedTheme: selectedTheme === "Custom" ? customTheme : selectedTheme,
        selectedEmotion,
        confirmedDrivers,
        isTasksSynced: true,
        syncedGoals: Array.from(syncedGoals),
        syncedIdeas: Array.from(syncedIdeas),
      };
      safeStorage.setItem(
        `kaizen_morning_reset_data_${todayStr}`,
        JSON.stringify(todayData),
      );
    } catch (e) {
      console.error("Failed to sync tasks:", e);
    }
  };

  const handleSyncSingleTaskToBoard = async (t: any) => {
    if (!parsedData) return;
    try {
      const taskToSync = {
        title: t.title,
        description: t.description || "",
        category: t.category as "A" | "B" | "C" | "D" | "E",
        explanation: t.explanation || "",
      };

      if (onAddMultipleTasks) {
        await onAddMultipleTasks([taskToSync]);
      } else if (onAddTask) {
        onAddTask(
          taskToSync.title,
          taskToSync.description,
          taskToSync.category,
        );
      }
      triggerDiscoveryEvent("brain_dump_ai_plan_accepted", { tasksAdded: 1 });

      const todayStr = getLocalTodayStr();
      const saved = safeStorage.getItem(
        `kaizen_morning_reset_data_${todayStr}`,
      );
      if (saved) {
        try {
          const data = JSON.parse(saved);
          safeStorage.setItem(
            `kaizen_morning_reset_data_${todayStr}`,
            JSON.stringify(data),
          );
        } catch (e) {}
      }

      const msg = isEn
        ? "Added to ABCDE Board!"
        : language === "tr"
          ? "ABCDE Panosuna Eklendi!"
          : "Dodato na ABCDE Tablu!";
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: {
            message: msg,
            type: "success",
          },
        }),
      );
    } catch (e) {
      console.error("Failed to sync single task:", e);
    }
  };


  const handleDeleteParsedItem = (
    category: string,
    index: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!parsedData || !parsedData[category]) return;

    const newData = { ...parsedData };
    newData[category] = [...newData[category]];
    newData[category].splice(index, 1);
    setParsedData(newData);

    // Play subtle haptic if available
    if (typeof window !== "undefined" && (window as any).triggerHaptics) {
      (window as any).triggerHaptics("selection");
    }
  };

  // Finalize the reset and unlock the Coach Dashboard
  const handleFinalizeReset = () => {
    const todayStr = getLocalTodayStr();

    const finalResetData = {
      ...parsedData,
      selectedTheme: selectedTheme === "Custom" ? customTheme : selectedTheme,
      selectedEmotion,
      confirmedDrivers,
      isTasksSynced,
      syncedGoals: Array.from(syncedGoals),
      syncedIdeas: Array.from(syncedIdeas),
      completedAt: new Date().toISOString(),
    };

    // Save state as completed today
    safeStorage.setItem(`kaizen_morning_reset_done_${todayStr}`, "true");
    safeStorage.setItem(
      `kaizen_morning_reset_data_${todayStr}`,
      JSON.stringify(finalResetData),
    );
    setResetCompletedToday(true);
    // Reward Discovery Lab for morning routine completion
    triggerDiscoveryEvent("morning_reflection", { source: "routine_completed" });
    if (brainDumpText && brainDumpText.trim().length > 0) {
      triggerDiscoveryEvent("brain_dump_completed", { textLength: brainDumpText.length });
    }
    window.dispatchEvent(new Event("companion-sync"));
    
    // Append to historical list
    const logItem = {
      date: todayStr,
      state: finalResetData.state,
      weather: finalResetData.weather,
      emotion: selectedEmotion,
      theme: selectedTheme === "Custom" ? customTheme : selectedTheme,
      brainDumpText: finalResetData.brainDumpText || "",
      aiResponse: finalResetData,
    };

    // Prevent duplicate entries for the same day in history
    const filteredHistory = resetsHistory.filter((h) => h.date !== todayStr);
    const updatedHistory = [...filteredHistory, logItem];
    setResetsHistory(updatedHistory);
    safeStorage.setItem(
      "kaizen_morning_resets_history",
      JSON.stringify(updatedHistory),
    );

    setStep(5); // Advance to final coach dashboard screen
    window.dispatchEvent(new Event("trigger-adrenaline"));
    window.dispatchEvent(new Event("companion-sync"));
    window.dispatchEvent(new Event("storage_sync"));
  };

  // Premium function: Generate Weekly review using AI based on past resets logs
  const handleGenerateWeeklyReview = async () => {
    setIsGeneratingReview(true);
    setWeeklyReview(null);

    try {
      const savedLogs =
        safeStorage.getItem("kaizen_morning_resets_history") || "[]";
      const parsedLogs = JSON.parse(savedLogs);
      const isEn = language === "en";

      const promptLogs = (Array.isArray(parsedLogs) ? parsedLogs : [])
        .map(
          (l: any) =>
            `- Day: ${l.date} | Theme: ${l.theme} | Mood Climate: ${l.weather} (${l.state}) | Selected Emotion: ${l.emotion}`,
        )
        .join("\n");

      // We call the advisors evaluation or chat to compose a beautiful custom summary offline or direct prompt
      const prompt = `Perform a high-level cognitive audit of the user's weekly operation logs:\n${promptLogs}\n\nGenerate a professional 4-part operating review containing:\n1. WHAT GAVE ENERGY (What themes & metrics boosted user energy)\n2. WHAT DRAINED ENERGY (Key blockers, storms or fog patterns)\n3. WHAT TO REMOVE (Inefficiencies, bad habits, categories)\n4. WHAT TO REPEAT (Successful loops, positive routines)\n\nProvide the analysis in ${isEn ? "English" : language === "tr" ? "Turkish" : "Serbian"} with rich visual bullet points and formatting. Keep it elegant, clear and highly actionable.`;

      const response = await fetch(
        window.location.origin + "/api/advisor-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advisorId: "marta", // Let mentor Sistemski Savetnik build the holistic operational audit
            message: prompt,
            language,
            aiTone: activeAiTone,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Could not generate review");
      setWeeklyReview(data.text);
    } catch (e: any) {
      console.error(e);
      setWeeklyReview(
        isEn
          ? "Failed to compile weekly review. Please perform more morning resets or try again."
          : language === "tr"
            ? "Haftalık inceleme derlenemedi. Lütfen daha fazla sabah sıfırlaması yapın veya tekrar deneyin."
            : "Nije uspelo sastavljanje nedeljnog izveštaja. Odradite više jutarnjih reseta pa pokušajte ponovo.",
      );
    } finally {
      setIsGeneratingReview(false);
    }
  };

  const handleDeleteVaultItem = (item: any) => {
    if (item.type === "morning") {
      const updated = resetsHistory.filter(
        (r) => r.date + "-morning" !== item.id,
      );
      setResetsHistory(updated);
      safeStorage.setItem(
        "kaizen_morning_resets_history",
        JSON.stringify(updated),
      );
    } else {
      const keyMap: any = {
        nlp: "mindset_nlp_history_v2",
        rebt: "mindset_rebt_history_v2",
        biohack: "mindset_biohack_history_v2",
        ta: "mindset_ta_history_v2",
      };
      const key = keyMap[item.type];
      if (key) {
        const raw = safeStorage.getItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            const updated = list.filter(
              (l: any, i: number) =>
                item.type + "-" + i + "-" + l.timestamp !== item.id,
            );
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

  // Combine historical logs into a unified Vault array
  const getAllVaultItems = () => {
    let combined: any[] = [];

    // Mindset NLP
    try {
      const nlp = JSON.parse(
        safeStorage.getItem("mindset_nlp_history_v2") || "[]",
      );
      (Array.isArray(nlp) ? nlp : []).forEach((item: any, i: number) => {
        combined.push({
          id: `nlp-${i}-${item.timestamp}`,
          type: "nlp",
          date: new Date(item.timestamp).toISOString().split("T")[0],
          userPrompt: item.promptText,
          aiResponse: item.aiResponse,
          label: isEn
            ? "AI Chat"
            : language === "tr"
              ? "AI Sohbet"
              : "AI razgovor",
          theme: "",
        });
      });
    } catch (e) {}

    // Mindset REBT
    try {
      const rebt = JSON.parse(
        safeStorage.getItem("mindset_rebt_history_v2") || "[]",
      );
      (Array.isArray(rebt) ? rebt : []).forEach((item: any, i: number) => {
        combined.push({
          id: `rebt-${i}-${item.timestamp}`,
          type: "rebt",
          date: new Date(item.timestamp).toISOString().split("T")[0],
          userPrompt: item.promptText,
          aiResponse: item.aiResponse,
          label: isEn
            ? "Belief Analysis"
            : language === "tr"
              ? "İnanç Analizi"
              : "Analiza uverenja",
          theme: "",
        });
      });
    } catch (e) {}

    // Mindset Biohack
    try {
      const biohack = JSON.parse(
        safeStorage.getItem("mindset_biohack_history_v2") || "[]",
      );
      (Array.isArray(biohack) ? biohack : []).forEach(
        (item: any, i: number) => {
          combined.push({
            id: `biohack-${i}-${item.timestamp}`,
            type: "biohack",
            date: new Date(item.timestamp).toISOString().split("T")[0],
            userPrompt: item.promptText,
            aiResponse: item.aiResponse,
            label: "Biohacking Request",
            theme: "",
          });
        },
      );
    } catch (e) {}

    // Mindset TA
    try {
      const ta = JSON.parse(
        safeStorage.getItem("mindset_ta_history_v2") || "[]",
      );
      (Array.isArray(ta) ? ta : []).forEach((item: any, i: number) => {
        combined.push({
          id: `ta-${i}-${item.timestamp}`,
          type: "ta",
          date: new Date(item.timestamp).toISOString().split("T")[0],
          userPrompt: item.promptText,
          aiResponse: item.aiResponse,
          label: "TA Session",
          theme: "",
        });
      });
    } catch (e) {}

    // Filter and Search
    return combined
      .filter((item) => {
        if (vaultFilter !== "all" && item.type !== vaultFilter) return false;
        if (vaultSearch.trim() !== "") {
          const term = vaultSearch.toLowerCase();
          return (
            (typeof item.userPrompt === "string" &&
              item.userPrompt.toLowerCase().includes(term)) ||
            (typeof item.aiResponse === "string" &&
              item.aiResponse.toLowerCase().includes(term))
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Burnout Prediction logic
  const calculateBurnoutRisk = () => {
    // Audit past logs for Overloaded (RED) and Drained (BLUE) dominant states
    const recentLogs = resetsHistory.slice(-7);
    if (recentLogs.length === 0)
      return {
        risk: "LOW",
        score: 10,
        msgSr:
          "Nedovoljno podataka za analizu sagorevanja. Nastavite sa jutarnjim resetima.",
        msgEn:
          "Insufficient data to assess burnout. Complete more daily resets.",
      };

    const redBlueDays = recentLogs.filter(
      (l) => l.state === "OVERLOADED" || l.state === "DRAINED",
    ).length;

    const percentage = Math.round(
      (redBlueDays / Math.max(recentLogs.length, 1)) * 100,
    );

    if (percentage >= 70) {
      return {
        risk: "HIGH",
        score: percentage,
        msgSr:
          "⚠️ VISOK RIZIK OD SAGOREVANJA (BURNOUT)! Imate preko 70% dana pod opterećenjem ili bez energije u proteklih 7 dana. AI preporučuje hitno preusmeravanje na podmodul Dnevna regeneracija i mikrorutine sa niskim naporom.",
        msgEn:
          "⚠️ CRITICAL BURNOUT RISK! Over 70% of your past week was spent overloaded or drained. AI recommends immediately switching into Recovery protocol under Consistency Micro-Routines.",
      };
    } else if (percentage >= 40) {
      return {
        risk: "MEDIUM",
        score: percentage,
        msgSr:
          "SREDNJI RIZIK OD SAGOREVANJA. Prisutni su povremeni talasi kognitivne preopterećenosti. Primenite 5-minutni reset disanja danas za regulaciju tonusa.",
        msgEn:
          "MODERATE BURNOUT RISK. Mental overload spikes are occurring. Try incorporating more short breathing resets today to regulate work triggers.",
      };
    } else {
      return {
        risk: "LOW",
        score: Math.max(percentage, 12),
        msgSr:
          "NIZAK RIZIK OD SAGOREVANJA. Vaš kognitivni fokus i regenerativni krugovi su stabilni. Nastavite sa pameću!",
        msgEn:
          "LOW BURNOUT RISK. Your mental stamina and recovery systems are highly aligned. Keep up the high-performance momentum!",
      };
    }
  };

  const burnout = calculateBurnoutRisk();

  // Reset/Restart morning reset (clear progress for testing or restarting)
  const handleRestartReset = () => {
    // Clear ALL history for morning reset to ensure no date string mismatch bugs
    const keysToRemove: string[] = [];
    for (let i = 0; i < safeStorage.length; i++) {
      const key = safeStorage.key(i);
      if (
        key &&
        (key.startsWith("kaizen_morning_reset_done_") ||
          key.startsWith("kaizen_morning_reset_data_"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => safeStorage.removeItem(k));

    // Clear today's history log
    const todayStr = getLocalTodayStr();
    const filteredHistory = resetsHistory.filter((h) => h.date !== todayStr);
    setResetsHistory(filteredHistory);
    safeStorage.setItem(
      "kaizen_morning_resets_history",
      JSON.stringify(filteredHistory),
    );

    setBrainDumpText("");
    setFollowUpQuestion(null);
    setParsedData(null);
    setResetCompletedToday(false);
    setIsTasksSynced(false);
    setSelectedTheme("board");
    setSyncedGoals(new Set());
    setSyncedIdeas(new Set());
    setStep(1);
    window.dispatchEvent(new Event("companion-sync"));
    window.dispatchEvent(new Event("storage_sync"));
  };

  // Mapping theme cards icons & titles (System Module selections)
  const themeOptions = [
    {
      id: "board",
      icon: (
        <CheckSquare className="w-6 h-6 text-[#007AFF] dark:text-[#0A84FF]" />
      ),
      labelSr: "Prioriteti ABCDE Matrix",
      labelEn: "ABCDE Priorities Board",
      descSr: "Glavna matrica sa gvozdenom disciplinom prioriteta.",
      descEn: "Main matrix with iron-clad discipline priorities.",
      color:
        " border-[#007AFF]/20 dark:border-[#0A84FF]/20/50 dark:border-[#007AFF]/20 dark:border-[#0A84FF]/20/40 hover:border-[#007AFF]/20 dark:border-[#0A84FF]/20",
    },
    {
      id: "Vision",
      icon: <Sparkles className="w-6 h-6 text-[#FF2D55] dark:text-[#FF375F]" />,
      labelSr: "Komora Strateške Perspektive",
      labelEn: "Strategic Perspective Chamber",
      descSr:
        "Uskladite ideje kroz vizionarski, pragmatični i analitički ugao.",
      descEn:
        "Refine ideas across high-level vision, pragmatic execution, and objective scrutiny.",
      color:
        " border-[#FF2D55]/20 dark:border-[#FF375F]/20/50 dark:border-[#FF2D55]/20 dark:border-[#FF375F]/20/40 hover:border-[#FF2D55]/20 dark:border-[#FF375F]/20",
    },
    {
      id: "wheel",
      icon: <PieChart className="w-6 h-6 text-[#FF9500] dark:text-[#FF9F0A]" />,
      labelSr: "Točak života",
      labelEn: "Wheel of Life Balance",
      descSr: "Izbalansiranost kognitivnih stubova života.",
      descEn: "Visual balance across core life dimensions.",
      color:
        " border-[#FF9500]/20 dark:border-[#FF9F0A]/20 dark:border-[#FF9500]/20 dark:border-[#FF9F0A]/20 hover:border-[#FF9500]/20 dark:border-[#FF9F0A]/20",
    },
    {
      id: "pareto",
      icon: <Filter className="w-6 h-6 text-[#34C759] dark:text-[#30D158]" />,
      labelSr: "Pareto 80/20 analitika",
      labelEn: "Pareto 80/20 Analyzer",
      descSr: "Pronađite 20% ključnih radnji za 80% ishoda.",
      descEn: "Isolate the 20% high-leverage efforts.",
      color:
        " border-[#34C759]/20 dark:border-[#30D158]/20 dark:border-[#34C759]/20 dark:border-[#30D158]/20 hover:border-[#34C759]/20 dark:border-[#30D158]/20",
    },
    {
      id: "progress",
      icon: <Activity className="w-6 h-6 text-[#AF52DE] dark:text-[#BF5AF2]" />,
      labelSr: "Mikrorutine & Doslednost",
      labelEn: "Micro-Routines & Consistency",
      descSr:
        "Dizajnirajte usmerene dnevne navike i gradite stabilan napredak.",
      descEn:
        "Anchor tiny daily actions with structured triggers for compound growth.",
      color:
        " border-[#AF52DE]/20 dark:border-[#BF5AF2]/20/50 dark:border-[#AF52DE]/20 dark:border-[#BF5AF2]/20/40 hover:border-[#AF52DE]/20 dark:border-[#BF5AF2]/20",
    },
    {
      id: "habitat",
      icon: <Cat className="w-6 h-6 text-[#FF3B30] dark:text-[#FF453A]" />,
      labelSr: "Svetilište i pas vodič",
      labelEn: "Habit Pet Sanctuary",
      descSr: "Igrajte se i brinite o svom kognitivnom ljubimcu.",
      descEn: "Care for your cognitive digital pet companion.",
      color:
        " border-[#FF3B30]/20 dark:border-[#FF453A]/20/50 dark:border-[#FF3B30]/20 dark:border-[#FF453A]/20/40 hover:border-[#FF3B30]/20 dark:border-[#FF453A]/20",
    },
    // { id: "dopamine", icon: "🍬", labelSr: "Dopaminska matrica", labelEn: "Dopamine Rewards", descSr: "Sistem nagrađivanja za obavljanje teških zadataka.", descEn: "Gamified reward points matrix to fuel drive.", color: " border-[#00C7BE]/20 dark:border-[#32ADE6]/20/50 dark:border-[#00C7BE]/20 dark:border-[#32ADE6]/20/40 hover:border-[#00C7BE]/20 dark:border-[#32ADE6]/20" },
    {
      id: "mindset",
      icon: <Brain className="w-6 h-6 text-[#FF3B30] dark:text-[#FF453A]" />,
      labelSr: "Trener uverenja",
      labelEn: "Mindset Reflector",
      descSr: "Suočite se i uklonite ograničavajuća uverenja.",
      descEn: "Identify and reflect on limiting beliefs.",
      color:
        " border-[#FF3B30]/20 dark:border-[#FF453A]/20 dark:border-[#FF3B30]/20 dark:border-[#FF453A]/20 hover:border-[#FF3B30]/20 dark:border-[#FF453A]/20",
    },
    {
      id: "braindump_inbox",
      icon: <Layers className="w-6 h-6 text-[#5AC8FA] dark:text-[#64D2FF]" />,
      labelSr: "Inbox za pražnjenje",
      labelEn: "Brain Dump Inbox",
      descSr: "Gde nesređene misli čekaju pravu proceduru.",
      descEn: "Temporary cache holding unorganized thoughts.",
      color:
        " border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5",
    },
  ];

  return (
    <div className="w-full" id="morning-ai-hub-root">
      {/* HEADER SECTION - Rendered only on main dashboard step for clean visual hierarchy */}
      {step === 5 && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4">
          <div className="space-y-1 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white dark:bg-[#1C1C1E] dark:text-white rounded-md text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold">
              <Sparkles className="w-2.5 h-2.5 text-[#007AFF]" />
              <span>
                {isEn
                  ? "Mental Clarity"
                  : language === "tr"
                    ? "Zihinsel Netlik"
                    : "Mentalna Jasnoća"}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-black dark:text-white flex items-center gap-2 font-sans">
              <Brain className="w-6 h-6 text-[#007AFF]" />
              {isEn
                ? "Morning Focus"
                : language === "tr"
                  ? "Sabah Odağı"
                  : "Jutarnji Fokus"}
            </h2>
            <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
              {isEn
                ? "A gentle view of your thoughts, energy levels, and high-impact actions for today."
                : language === "tr"
                  ? "Bugün için düşüncelerinizin, enerji seviyenizin ve yüksek etkili eylemlerinizin sade bir görünümü."
                  : "Pregled vaših misli, nivoa energije i ključnih akcija za današnji dan."}
            </p>
          </div>

          {/* Dynamic completed badge */}
          {resetCompletedToday && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-[13px] bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#34C759] border border-[#34C759]/20 dark:border-[#30D158]/20 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#34C759] dark:bg-[#30D158] transition-opacity" />
                {isEn
                  ? "TODAY'S RESET COMMITTED"
                  : language === "tr"
                    ? "BUGÜNÜN SIFIRLANMASI KABUL EDİLDİ"
                    : "JUTARNJI RESET AKTIVAN"}
              </span>
              <button
                onClick={handleRestartReset}
                className="p-1.5 hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#2C2C2E] dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white dark:hover:text-white rounded-lg transition-all cursor-pointer"
                title={
                  isEn
                    ? "Restart Morning Reset"
                    : language === "tr"
                      ? "Sabah Sıfırlamayı Yeniden Başlat"
                      : "Ponovi reset"
                }
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* WIZARD CONTAINER WITH ANIMATIONS */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {/* SCREEN 1: UNIFIED MORNING WORKSPACE - THEME SELECTION & BRAIN DUMP */}
          {step === 1 && (
            <motion.div
              key="unified-morning-workspace"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 text-left"
              id="morning-screen-1"
            >
                {/* Brain Dump Input Block */}
                <div className="p-6 bg-white dark:bg-[#1C1C1E] rounded-[28px] shadow-sm dark:shadow-none border border-black/5 dark:border-white/10 relative">
                  <div className="space-y-5">
                    {/* Header bar */}
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#007AFF] font-bold uppercase tracking-wider">
                          {isEn ? "BRAIN DUMP" : language === "tr" ? "BEYİN DÖKÜMÜ" : "PRAŽNJENJE UMA"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#007AFF]/30" />
                        <span className="text-[12px] text-[#8E8E93] font-medium">
                          {isEn ? "Active Alignment" : language === "tr" ? "Aktif Hizalama" : "Aktivno usklađivanje"}
                        </span>
                      </div>
                    </div>

                    {/* 1. INPUT TEXTAREA ON TOP (Psychology & HIG Focus) */}
                    <div className="relative">
                      <textarea
                        value={brainDumpText}
                        onChange={(e) => setBrainDumpText(e.target.value)}
                        placeholder={
                          isEn
                            ? "E.g., I need to email John today about the Q3 report..."
                            : language === "tr"
                              ? "Örn., Q3 raporu ile ilgili bugün John'a e-posta göndermem gerekiyor..."
                              : "Npr., Moram danas da pošaljem mail Jovanu u vezi sa Q3 izveštajem..."
                        }
                        className="w-full min-h-[280px] resize-y p-6 pb-16 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-[24px] text-[17px] leading-relaxed font-normal text-black dark:text-[#EBEBF5]/90 placeholder:text-[#8E8E93]/60 dark:placeholder:text-[#EBEBF5]/35 outline-none focus:ring-4 focus:ring-[#007AFF]/10 transition-all duration-300 shadow-sm"
                      />
                      
                      {/* Voice input node */}
                      <VoiceInputNode
                        language={language}
                        isEvening={isEvening}
                        onTranscript={(text) => {
                          setBrainDumpText((prev) => {
                            const cleanPrev = prev.trim();
                            return cleanPrev
                              ? `${cleanPrev} ${text.trim()} `
                              : `${text.trim()} `;
                          });
                        }}
                        onStartRecording={() => setIsRecording(true)}
                        onStopRecording={() => setIsRecording(false)}
                      />
                    </div>

                    {/* Listening bar if voice is active */}
                    {isRecording && (
                      <div className="text-[13px] font-medium text-[#FF3B30] dark:text-[#FF453A] transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 rounded-xl max-w-max mt-4">
                        <span className="w-2 h-2 bg-[#FF3B30] dark:bg-[#FF453A] rounded-full animate-pulse"></span>
                        {isEn
                          ? "Listening... Speak clearly. Click microphone to stop."
                          : language === "tr"
                            ? "Dinliyorum... Açıkça konuşun. Durdurmak için mikrofona tıklayın."
                            : "Slušam... Govorite jasno. Kliknite na mikrofon da zaustavite."}
                      </div>
                    )}

                    {/* 2. REFINED INPUT TOOLBAR (HIG Standard) */}
                    <div className="flex flex-col gap-5 bg-transparent pt-6">
                      {/* Top Row: Counter and Accessory Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Characters progress with mini iOS light bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-wider">
                            <span>{isEn ? "CHARACTERS:" : language === "tr" ? "KARAKTERLER:" : "ZNAKOVI:"}</span>
                            <span className={brainDumpText.length >= 150 ? "text-[#34C759]" : "text-[#FF9500]"}>
                              {brainDumpText.length}
                            </span>
                            <span className="opacity-40">/</span>
                            <span>150+</span>
                          </div>
                          <div className="w-16 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
                            <div
                              className={`h-full transition-all duration-300 ${
                                brainDumpText.length >= 500
                                  ? "bg-[#34C759]"
                                  : brainDumpText.length >= 150
                                    ? "bg-[#FF9500]"
                                    : "bg-[#007AFF]"
                              }`}
                              style={{
                                width: `${Math.min((brainDumpText.length / 500) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Right: Accessory Actions */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {/* Clear button */}
                          <button
                            type="button"
                            disabled={!brainDumpText}
                            onClick={() => {
                              setBrainDumpText("");
                              triggerHaptics("medium");
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[#FF3B30] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            title={isEn ? "Clear text" : language === "tr" ? "Metni temizle" : "Obriši tekst"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isEn ? "Clear" : language === "tr" ? "Temizle" : "Obriši"}</span>
                          </button>

                          {/* Helper Prompts Toggler */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowHelperPrompts(!showHelperPrompts);
                              triggerHaptics("light");
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              showHelperPrompts
                                ? "bg-[#007AFF] text-white"
                                : "bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
                            }`}
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>{isEn ? "Prompts" : language === "tr" ? "Sorular" : "Pitanja"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="h-[1px] w-full bg-black/5 dark:bg-white/5" />

                      {/* 3. PSYCHOLOGICAL HELPER PROMPTS ACCORDION */}
                      <AnimatePresence>
                        {showHelperPrompts && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden bg-[#007AFF]/5 dark:bg-[#0A84FF]/5 rounded-2xl p-4 space-y-3"
                          >
                            <div className="flex items-center gap-2 text-[11px] font-bold text-[#007AFF] uppercase tracking-wider mb-1">
                              <Sparkles className="w-4 h-4" />
                              <span>
                                {isEn
                                  ? "Inspiring Thought Starters"
                                  : language === "tr"
                                    ? "İlham Veren Düşünce Başlatıcılar"
                                    : "Inspirativna pitanja za razmišljanje"}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {[
                                {
                                  en: "What is your #1 professional focus today?",
                                  tr: "Bugün profesyonel olarak 1 numaralı odağınız nedir?",
                                  sr: "Šta je tvoj glavni profesionalni fokus za danas?",
                                  icon: "🎯"
                                },
                                {
                                  en: "Is there any hidden worry holding you back right now?",
                                  tr: "Şu anda sizi geri tutan gizli bir endişe var mı?",
                                  sr: "Da li postoji neka briga koja te koči u ovom trenutku?",
                                  icon: "💭"
                                },
                                {
                                  en: "What is one small thing that would make today a success?",
                                  tr: "Bugünü başarılı kılacak küçük bir şey nedir?",
                                  sr: "Koja je to jedna mala stvar koja bi učinila današnji dan uspešnim?",
                                  icon: "✨"
                                },
                                {
                                  en: "What fresh ideas did you sleep on that you want to capture?",
                                  tr: "Aklınıza gelen hangi yeni fikirleri kaydetmek istersiniz?",
                                  sr: "Koje sveže ideje želiš da zapišeš pre nego što ih zaboraviš?",
                                  icon: "💡"
                                }
                              ].map((p, idx) => {
                                const text = isEn ? p.en : language === "tr" ? p.tr : p.sr;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectPrompt(text)}
                                    className="p-3 text-left bg-white/60 dark:bg-black/20 rounded-[12px] hover:bg-white dark:hover:bg-black/40 transition-all text-[13px] font-medium text-black dark:text-white leading-snug cursor-pointer flex gap-2"
                                  >
                                    <span className="text-base shrink-0">{p.icon}</span>
                                    <span>{text}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* 4. TEMPLATE TAG CHIPS BELOW TEXTAREA (Pill shape, fill bg) */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/50 uppercase tracking-wider block ml-1">
                          {isEn ? "Add to entry:" : language === "tr" ? "Girişe ekle:" : "Dodaj u unos:"}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: isEn ? "Ideas" : language === "tr" ? "Fikirler" : "Ideje", icon: "💡" },
                            { label: isEn ? "Tasks" : language === "tr" ? "Görevler" : "Obaveze", icon: "✅" },
                            { label: isEn ? "Worries" : language === "tr" ? "Endişeler" : "Brige", icon: "💭" },
                            { label: isEn ? "Goals" : language === "tr" ? "Hedefler" : "Ciljevi", icon: "🎯" },
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleInsertTagTemplate(item.label)}
                              className="flex items-center gap-1.5 text-[13px] font-semibold bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#3C3C43] dark:text-[#EBEBF5] px-4 py-2 rounded-full transition-colors hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] active:bg-[#D1D1D6] dark:active:bg-[#48484A] cursor-pointer"
                            >
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Follow up question if any */}
                      {followUpQuestion && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-[#007AFF]/10 dark:bg-[#1C1C1E]/30 text-[#007AFF] dark:text-[#0A84FF] text-[15px] font-semibold rounded-[20px] flex items-start gap-3 mt-2"
                        >
                          <Brain className="w-5 h-5 mt-0.5 shrink-0 text-[#007AFF]" />
                          <div>
                            <span className="block text-[12px] font-semibold text-[#0A84FF] mb-0.5">
                              {isEn
                                ? "Clarification needed:"
                                : language === "tr"
                                  ? "Açıklama gerekli:"
                                  : "Potrebno pojašnjenje:"}
                            </span>
                            <p className="text-[14px] leading-relaxed text-black dark:text-white">
                              {followUpQuestion}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* CTA Button */}
                      <div className="pt-4 w-full">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          disabled={brainDumpText.trim().length < 3 || (selectedTheme === "Custom" && !customTheme.trim())}
                          className="w-full h-[56px] bg-[#007AFF] hover:bg-[#007AFF]/90 disabled:opacity-50 disabled:hover:bg-[#007AFF] text-white rounded-[18px] text-[17px] font-semibold cursor-pointer flex items-center justify-center gap-2 group transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
                        >
                          <span>
                            {isEn
                              ? "Process & Choose Energy"
                              : language === "tr"
                                ? "İşle ve Enerji Seç"
                                : "Procesiraj (Izbor energije)"}
                          </span>
                          <span className="text-xl">→</span>
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

              {/* Collapsible History of Past Prompts & Brain Dumps */}
              {resetsHistory && resetsHistory.some((h) => h.brainDumpText) && (
                <div className="p-4.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-2xl space-y-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setVaultOpen(true)}
                    className="w-full flex items-center justify-between text-left text-xs font-bold text-black dark:text-white cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#8E8E93]" />
                      <span>
                        {isEn
                          ? "Archive: Past Thoughts & Prompts"
                          : language === "tr"
                            ? "Arşiv: Geçmiş Düşünceler ve İstemler"
                            : "Arhiva: Prethodni zapisi i upiti"}
                      </span>
                      <span className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-[#8E8E93] rounded-md text-[10px] font-bold">
                        {resetsHistory.filter((h) => h.brainDumpText).length}
                      </span>
                    </div>
                    <span className="text-[#8E8E93] dark:text-[#EBEBF5]/60 text-[10px] font-bold">
                      {isEn
                        ? "Open Vault"
                        : language === "tr"
                          ? "Apps Kasası'nı aç"
                          : "Otvori Trezor"}
                    </span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SCREEN 2: ENERGY & PLEASANTNESS ASSESSMENT (APPLE HIG SLIDERS) */}
          {step === 2 && (
            <motion.div
              key="energy-mood-workspace"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 text-left"
              id="morning-screen-2-new"
            >
              <div
                className="p-5 bg-white dark:bg-[#1C1C1E]/80 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 space-y-4 my-2 transition-opacity"
                id="ruler-mood-assessment"
              >
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5/40 pb-2.5">
                  <div>
                    <h4 className="text-xs font-semibold text-black dark:text-white">
                      {isEn
                        ? "📊 ENERGY & PLEASANTNESS RATING"
                        : language === "tr"
                          ? "📊 ENERJİ VE KEYİF DERECESİ"
                          : "📊 PROCENA ENERGIJE I PRIJATNOSTI"}
                    </h4>
                    <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                      {isEn
                        ? "Energy & Mood Tracking Model"
                        : language === "tr"
                          ? "Enerji ve Ruh Hali İzleme Modeli"
                          : "Model praćenja energije i raspoloženja"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const elem = document.getElementById("ruler-info-panel");
                      if (elem) {
                        elem.classList.toggle("hidden");
                      }
                    }}
                    className="px-2.5 py-1 text-[13px] font-medium text-[#007AFF] bg-[#007AFF]/10 dark:text-[#0A84FF] dark:bg-white/5 rounded-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    {isEn
                      ? "Learn More 💡"
                      : language === "tr"
                        ? "Daha Fazla Bilgi Edinin 💡"
                        : "Saznaj više 💡"}
                  </button>
                </div>

                {/* Informational Collapsible Section */}
                <div
                  id="ruler-info-panel"
                  className="hidden text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4 rounded-xl leading-relaxed space-y-2 mb-4"
                >
                  <p className="font-medium text-black dark:text-white">
                    {isEn
                      ? "Why Energy & Pleasantness?"
                      : language === "tr"
                        ? "Neden Enerji ve Keyif?"
                        : "Zašto procenjujemo Energiju i Prijatnost?"}
                  </p>
                  <p>
                    {isEn
                      ? "Every human emotion is a mixture of physical energy (high or low) and subjective pleasantness (negative or positive). By mapping these values on a -5 to +5 grid, we place ourselves precisely on the scientific Mood Meter."
                      : language === "tr"
                        ? "Her insani duygu, fiziksel enerjinin (yüksek veya düşük) ve öznel hoşnutluğun (olumsuz veya olumlu) bir karışımıdır. Bu değerleri -5'ten +5'e kadar bir ızgarada haritalandırarak kendimizi tam olarak bilimsel Ruh Hali Ölçer'e yerleştiririz."
                        : "Svaka ljudska emocija je spoj fizičke energije (od niske do visoke) i subjektivnog osećaja prijatnosti (neprijatno do prijatno). Unosom vrednosti od -5 do +5 precizno mapiramo vaše trenutno neurološko stanje."}
                  </p>
                  <p className="font-medium text-black dark:text-white pt-1">
                    {isEn
                      ? "Scientific Regulation Strategies:"
                      : language === "tr"
                        ? "Bilimsel Düzenleme Stratejileri:"
                        : "Naučne strategije regulacije emocija:"}
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>
                        {isEn
                          ? "🔴 High Energy + Low Pleasantness"
                          : language === "tr"
                            ? "🔴 Yüksek Enerji + Düşük Hoşluk"
                            : "🔴 Aktivna Negativna"}{" "}
                        (Anksioznost, Bes):
                      </strong>{" "}
                      {isEn
                        ? "Regulate via physiological sighs (double inhale, slow exhale) and safe physical outlet."
                        : language === "tr"
                          ? "Fizyolojik iç çekişler (çift nefes alma, yavaş nefes verme) ve güvenli fiziksel çıkış yoluyla düzenleme yapın."
                          : "Regulišite fiziološkim uzdahom (dvostruki udah na nos, dug izdah na usta) i sklanjanjem sa stimulansa."}
                    </li>
                    <li>
                      <strong>
                        {isEn
                          ? "⚫ Low Energy + Low Pleasantness"
                          : language === "tr"
                            ? "⚫ Düşük Enerji + Düşük Hoşluk"
                            : "⚫ Povučena Negativna"}{" "}
                        (Tuga, Bezvoljnost):
                      </strong>{" "}
                      {isEn
                        ? "Regulate via self-compassion, physical movement (even short walks), and small micro-routines."
                        : language === "tr"
                          ? "Kendinize şefkat göstererek, fiziksel hareketlerle (kısa yürüyüşler bile) ve küçük mikro rutinlerle kendinizi düzenleyin."
                          : "Regulišite saosećanjem prema sebi, blagim fizičkim kretanjem (kratka šetnja) ili sitnim mikro-zadacima."}
                    </li>
                    <li>
                      <strong>
                        {isEn
                          ? "🔵 Low Energy + High Pleasantness"
                          : language === "tr"
                            ? "🔵 Düşük Enerji + Yüksek Keyif"
                            : "🔵 Mirna Pozitivna"}{" "}
                        (Zadovoljstvo, Spokoj):
                      </strong>{" "}
                      {isEn
                        ? "Ideal state for focus, core strategic planning, and reflection. Appreciate and anchor this state."
                        : language === "tr"
                          ? "Odaklanma, temel stratejik planlama ve yansıtma için ideal durum. Bu durumu takdir edin ve sabitleyin."
                          : "Idealno stanje za fokus, strateško planiranje i refleksiju. Zabeležite zahvalnost da ga usidrite."}
                    </li>
                    <li>
                      <strong>
                        {isEn
                          ? "🟢 High Energy + High Pleasantness"
                          : language === "tr"
                            ? "🟢 Yüksek Enerji + Yüksek Keyif"
                            : "🟢 Aktivna Pozitivna"}{" "}
                        (Radost, Motivisanost):
                      </strong>{" "}
                      {isEn
                        ? "Excellent for collaboration, creative ideation, and action taking. Channel active energy immediately!"
                        : language === "tr"
                          ? "İşbirliği, yaratıcı fikir ve eyleme geçmek için mükemmeldir. Aktif enerjiyi hemen kanalize edin!"
                          : "Odlično za timski rad, kreativne ideje i akciju. Odmah usmerite ovu energiju na prioritet!"}
                    </li>
                  </ul>
                </div>

                {/* Presets - iOS-style capsule chips */}
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 tracking-wide uppercase">
                    {isEn
                      ? "QUICK PRESETS:"
                      : language === "tr"
                        ? "HIZLI ÖN AYARLAR:"
                        : "BRZI PRESETI STANJA:"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        labelSr: "🔋 Iscrpljenost",
                        labelEn: "🔋 Drained",
                        e: -4,
                        p: -2,
                      },
                      {
                        labelSr: "🧘 Spokoj & Mir",
                        labelEn: "🧘 Seranity",
                        e: -3,
                        p: 4,
                      },
                      {
                        labelSr: "🚀 Fokus & Strast",
                        labelEn: "🚀 Passionate",
                        e: 4,
                        p: 3,
                      },
                      {
                        labelSr: "🚨 Pod stresom",
                        labelEn: "🚨 Under Stress",
                        e: 3,
                        p: -4,
                      },
                      {
                        labelSr: "😐 Neutralno",
                        labelEn: "😐 Balanced",
                        e: 0,
                        p: 0,
                      },
                    ].map((pre, idx) => {
                      const isActive =
                        energyRating === pre.e && pleasureRating === pre.p;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEnergyRating(pre.e);
                            setPleasureRating(pre.p);
                            setHasInteractedEnergy(true);
                            setHasInteractedPleasure(true);
                            setMoodConfirmed(true);
                            triggerHaptics("light");
                          }}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 cursor-pointer border ${
                            isActive
                              ? "bg-[#007AFF] text-white border-[#007AFF] shadow-sm"
                              : "bg-white dark:bg-[#1C1C1E] shadow-sm hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] dark:text-[#EBEBF5]/80 border-black/5 dark:border-white/5"
                          }`}
                        >
                          {isEn ? pre.labelEn : pre.labelSr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tactile Sliders Layout (Apple HIG Highlights) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Energy card with precise stepper */}
                  <div className="p-4 bg-white dark:bg-[#1C1C1E] shadow-sm dark:bg-[#000000]/20 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-bold text-black dark:text-white flex items-center gap-1.5">
                        ⚡{" "}
                        {isEn
                          ? "Energy Level"
                          : language === "tr"
                            ? "Enerji Seviyesi"
                            : "Nivo Fiziološke Energije"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          energyRating >= 0
                            ? "bg-[#FF9500]/15 text-[#FF9500]"
                            : "bg-[#007AFF]/15 text-[#007AFF]"
                        }`}
                      >
                        {energyRating > 0 ? `+${energyRating}` : energyRating}
                      </span>
                    </div>

                    {/* Stepper controls */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEnergyRating((prev) => Math.max(-5, prev - 1));
                          setHasInteractedEnergy(true);
                          setMoodConfirmed(true);
                          triggerHaptics("light");
                        }}
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-sm text-black dark:text-white select-none hover:bg-black/5 active:scale-90 cursor-pointer shadow-sm"
                      >
                        −
                      </button>

                      <div className="flex-1 relative flex items-center">
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          step="1"
                          value={energyRating}
                          onChange={(e) => {
                            setEnergyRating(Number(e.target.value));
                            setHasInteractedEnergy(true);
                            setMoodConfirmed(true);
                          }}
                          className="w-full accent-[#FF9500] h-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-lg cursor-pointer"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEnergyRating((prev) => Math.min(5, prev + 1));
                          setHasInteractedEnergy(true);
                          setMoodConfirmed(true);
                          triggerHaptics("light");
                        }}
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-sm text-black dark:text-white select-none hover:bg-black/5 active:scale-90 cursor-pointer shadow-sm"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex justify-between text-[11px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60">
                      <span>
                        {isEn
                          ? "-5 Fatigue"
                          : language === "tr"
                            ? "-5 Yorgunluk"
                            : "-5 Iscrpljeno"}
                      </span>
                      <span>
                        {isEn
                          ? "+5 Charge"
                          : language === "tr"
                            ? "+5 Yük"
                            : "+5 Prepuno"}
                      </span>
                    </div>

                    {/* Real-time human translation label */}
                    <div className="p-2 bg-white/60 dark:bg-[#1C1C1E]/60 border border-black/5 dark:border-white/5 rounded-lg text-center">
                      <span className="text-[12px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {energyRating <= -4
                          ? isEn
                            ? "🔋 Extreme Fatigue"
                            : language === "tr"
                              ? "🔋 Aşırı Yorgunluk"
                              : "🔋 Potpuna iscrpljenost i duboki umor"
                          : energyRating <= -1
                            ? isEn
                              ? "🪫 Low Battery State"
                              : language === "tr"
                                ? "🪫 Düşük Pil Durumu"
                                : "🪫 Smanjena energija, bazični umor"
                            : energyRating === 0
                              ? isEn
                                ? "😐 Baseline Line State"
                                : language === "tr"
                                  ? "😐 Temel Çizgi Durumu"
                                  : "😐 Neutralno, mirno fizičko stanje"
                              : energyRating <= 3
                                ? isEn
                                  ? "⚡ Active & Awake"
                                  : language === "tr"
                                    ? "⚡ Aktif ve Uyanık"
                                    : "⚡ Aktivno, budno i kognitivno spremno"
                                : isEn
                                  ? "🔥 Peak Vitality Output"
                                  : language === "tr"
                                    ? "🔥 Zirve Canlılık Çıkışı"
                                    : "🔥 Maksimalna vitalnost i visoka snaga"}
                      </span>
                    </div>
                  </div>

                  {/* Pleasantness card with precise stepper */}
                  <div className="p-4 bg-white dark:bg-[#1C1C1E] shadow-sm dark:bg-[#000000]/20 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-bold text-black dark:text-white flex items-center gap-1.5">
                        🎭{" "}
                        {isEn
                          ? "Pleasantness"
                          : language === "tr"
                            ? "Hoşluk"
                            : "Biološka Prijatnost"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          pleasureRating >= 0
                            ? "bg-[#34C759]/15 text-[#34C759]"
                            : "bg-[#FF3B30]/15 text-[#FF3B30]"
                        }`}
                      >
                        {pleasureRating > 0
                          ? `+${pleasureRating}`
                          : pleasureRating}
                      </span>
                    </div>

                    {/* Stepper controls */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPleasureRating((prev) => Math.max(-5, prev - 1));
                          setHasInteractedPleasure(true);
                          setMoodConfirmed(true);
                          triggerHaptics("light");
                        }}
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-sm text-black dark:text-white select-none hover:bg-black/5 active:scale-90 cursor-pointer shadow-sm"
                      >
                        −
                      </button>

                      <div className="flex-1 relative flex items-center">
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          step="1"
                          value={pleasureRating}
                          onChange={(e) => {
                            setPleasureRating(Number(e.target.value));
                            setHasInteractedPleasure(true);
                            setMoodConfirmed(true);
                          }}
                          className="w-full accent-[#34C759] h-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-lg cursor-pointer"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPleasureRating((prev) => Math.min(5, prev + 1));
                          setHasInteractedPleasure(true);
                          setMoodConfirmed(true);
                          triggerHaptics("light");
                        }}
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-sm text-black dark:text-white select-none hover:bg-black/5 active:scale-90 cursor-pointer shadow-sm"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex justify-between text-[11px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60">
                      <span>
                        {isEn
                          ? "-5 Stressor"
                          : language === "tr"
                            ? "-5 Stres etkeni"
                            : "-5 Stresor"}
                      </span>
                      <span>
                        {isEn
                          ? "+5 Harmony"
                          : language === "tr"
                            ? "+5 Armoni"
                            : "+5 Harmonija"}
                      </span>
                    </div>

                    {/* Real-time human translation label */}
                    <div className="p-2 bg-white/60 dark:bg-[#1C1C1E]/60 border border-black/5 dark:border-white/5 rounded-lg text-center">
                      <span className="text-[12px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80">
                        {pleasureRating <= -4
                          ? isEn
                            ? "😡 High Stress & Discomfort"
                            : language === "tr"
                              ? "😡 Yüksek Stres ve Rahatsızlık"
                              : "😡 Visok stresor i nemir (Tenzija)"
                          : pleasureRating <= -1
                            ? isEn
                              ? "😞 Discomfort & Pressure"
                              : language === "tr"
                                ? "😞 Rahatsızlık ve Baskı"
                                : "😞 Blaga neprijatnost i pritisak"
                            : pleasureRating === 0
                              ? isEn
                                ? "😐 Neutral Balance"
                                : language === "tr"
                                  ? "😐 Nötr Denge"
                                  : "😐 Neutralna hormonska ravnoteža"
                              : pleasureRating <= 3
                                ? isEn
                                  ? "😌 Pleasant & Calm"
                                  : language === "tr"
                                    ? "😌 Keyifli ve Sakin"
                                    : "😌 Prijatnost i spokoj (Smirenost)"
                                : isEn
                                  ? "💖 Peak Synergy State"
                                  : language === "tr"
                                    ? "💖 Sinerjinin Zirve Durumu"
                                    : "💖 Potpuna harmonija i stabilnost (Flow)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle Button for Matrix & Emotions */}
                <motion.div
                  className="my-2"
                  animate={{ x: [-2, 2, -2] }}
                  transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowMoodMatrix(!showMoodMatrix)}
                    className="w-full py-2.5 px-4 flex items-center justify-between rounded-xl bg-[#007AFF]/5 active:opacity-70 dark:hover:bg-white/10 dark:bg-white/5 transition-colors border border-black/5 dark:border-white/5 group cursor-pointer"
                  >
                    <span className="text-[13px] font-medium text-[#007AFF] dark:text-[#EBEBF5]/60">
                      {isEn
                        ? "🔍 SHOW DETAILED GRID & EMOTIONS LIST"
                        : language === "tr"
                          ? "🔍 DETAYLI IZGARA VE DUYGULAR LİSTESİNİ GÖSTER"
                          : "🔍 PRIKAŽI DETALJNU MATRICU I LISTU EMOCIJA"}
                    </span>
                    <span
                      className={`transition-transform duration-350 ${showMoodMatrix ? "rotate-180" : ""}`}
                    >
                      <svg
                        className="w-4 h-4 text-[#007AFF]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </button>
                </motion.div>

                {showMoodMatrix && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 pt-1"
                  >
                    <div className="flex flex-col md:flex-row gap-6 items-center w-full p-4 bg-white dark:bg-[#1C1C1E]/60 rounded-xl border border-black/5 dark:border-white/5">
                      {/* Visual 2x2 Interactive Cyber Grid */}
                      <div className="relative w-40 h-40 shrink-0 bg-white dark:bg-[#1C1C1E] shadow-sm dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl overflow-hidden mx-auto">
                        {/* Grid lines */}
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                          <div
                            className={`border-r border-b border-black/5 dark:border-white/10 transition-colors duration-500 ${energyRating >= 0 && pleasureRating < 0 ? "bg-[#FF3B30] dark:bg-[#FF453A]/25 z-0" : ""}`}
                          />
                          <div
                            className={`border-b border-black/5 dark:border-white/10 transition-colors duration-500 ${energyRating >= 0 && pleasureRating >= 0 ? "bg-[#FF9500] dark:bg-[#FF9F0A]/25 z-0" : ""}`}
                          />
                          <div
                            className={`border-r border-black/5 dark:border-white/10 transition-colors duration-500 ${energyRating < 0 && pleasureRating < 0 ? "bg-[#007AFF]/25 z-0" : ""}`}
                          />
                          <div
                            className={`transition-colors duration-500 ${energyRating < 0 && pleasureRating >= 0 ? "bg-[#34C759] dark:bg-[#30D158]/25 z-0" : ""}`}
                          />
                        </div>

                        {/* Central crosshairs */}
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/5 dark:bg-white/5"></div>
                        <div className="absolute top-0 left-1/2 h-full w-[1px] bg-black/5 dark:bg-white/5"></div>

                        {/* Axis Labels */}
                        <div className="absolute top-1/2 left-0 w-full text-center -translate-y-[150%] text-[8px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-[0.1em] pointer-events-none">
                          {isEn
                            ? "Pleasantness"
                            : language === "tr"
                              ? "Hoşluk"
                              : "Prijatnost"}
                        </div>
                        <div
                          className="absolute top-0 left-1/2 h-full flex items-center -translate-x-[150%] text-[8px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-[0.1em] pointer-events-none"
                          style={{ writingMode: "vertical-rl" }}
                        >
                          {isEn
                            ? "Energy"
                            : language === "tr"
                              ? "Enerji"
                              : "Energija"}
                        </div>

                        {/* Interactive Reticle / Dot */}
                        <motion.div
                          className="absolute w-3.5 h-3.5 rounded-full border-[2px] border-white z-10"
                          animate={{
                            left: `${((pleasureRating + 5) / 10) * 100}%`,
                            top: `${100 - ((energyRating + 5) / 10) * 100}%`,
                            x: "-50%",
                            y: "-50%",
                            backgroundColor:
                              energyRating >= 0
                                ? pleasureRating >= 0
                                  ? "#f59e0b"
                                  : "#ef4444"
                                : pleasureRating >= 0
                                  ? "#10b981"
                                  : "#6366f1",
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 250,
                            damping: 25,
                          }}
                        >
                          <div className="absolute inset-0 rounded-full transition-opacity opacity-50 bg-inherit w-full h-full" />
                        </motion.div>
                      </div>

                      {/* Emotion list */}
                      {(() => {
                        const group = getDynamicEmotionGroup(
                          energyRating,
                          pleasureRating,
                        );
                        return (
                          <div className="flex-1 space-y-2 text-left">
                            <div className="flex items-center gap-2 font-semibold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 tracking-wide">
                              <span className="text-base leading-none">
                                {group.indicator}
                              </span>
                              <span
                                className={
                                  isEvening
                                    ? "text-[#3C3C43] dark:text-[#EBEBF5]/80"
                                    : "text-black dark:text-white"
                                }
                              >
                                {group.title}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {group.emotions.map((emo) => (
                                <span
                                  key={emo}
                                  className="text-[13px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
                                >
                                  {emo}
                                </span>
                              ))}
                            </div>
                            <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-normal">
                              {isEn
                                ? "💡 Emotions corresponding to your self-rating values on the energy quadrant."
                                : language === "tr"
                                  ? "💡 Enerji kadranında kendi derecelendirme değerlerinize karşılık gelen duygular."
                                  : "💡 Emocije koje odgovaraju unetom koeficijentu nivoa energije i prijatnosti."}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </div>

              {analysisError && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10/30 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] text-xs font-semibold rounded-xl flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30] shrink-0" />
                  <span>{analysisError}</span>
                </motion.div>
              )}

              {/* BIG ENGINE ACTION TRIGGER */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3.5 pt-4 border-t border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      triggerHaptics("light");
                    }}
                    className="text-xs font-bold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-[#EBEBF5]/80 dark:hover:text-white flex items-center gap-1 cursor-pointer py-2 px-3 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/5 rounded-xl transition-all"
                  >
                    ←{" "}
                    {isEn
                      ? "Back to dump text"
                      : language === "tr"
                        ? "Döküm metnine geri dön"
                        : "Nazad na unos teksta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="text-xs font-bold text-[#007AFF] hover:bg-[#007AFF]/10 dark:text-[#0A84FF] dark:hover:bg-[#0A84FF]/10 flex items-center gap-1 cursor-pointer py-2 px-3 rounded-xl transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {isEn
                      ? "Archive"
                      : language === "tr"
                        ? "Arşiv"
                        : "Arhiva unosa"}
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {brainDumpText.trim().length > 0 && !isAnalyzing && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        setBrainDumpText("");
                        triggerHaptics("medium");
                      }}
                      className="px-4.5 py-3 border border-black/5 dark:border-white/5 hover:border-black/5 dark:border-white/5 dark:hover:border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-white dark:bg-[#1C1C1E] shadow-sm dark:hover:bg-[#1C1C1E] rounded-xl text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80" />
                      <span>
                        {isEn
                          ? "Clear"
                          : language === "tr"
                            ? "Temizlemek"
                            : "Isprazni"}
                      </span>
                    </motion.button>
                  )}

                  <motion.button
                    type="button"
                    onClick={handleAnalyzeBrainDump}
                    disabled={isAnalyzing}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: !isAnalyzing ? 1.02 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="px-8 py-3.5 bg-[#007AFF] text-white disabled:opacity-60 disabled:bg-[#007AFF]/50 rounded-[14px] text-[15px] font-semibold cursor-pointer flex items-center gap-2 group shadow-sm transition-all hover:bg-[#007AFF]/90"
                    id="btn-analyze-mind"
                  >
                      <AnimatePresence mode="wait">
                        {animationStatus === "loading" && (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                            <span>
                              {isEn
                                ? "Refining Map..."
                                : language === "tr"
                                  ? "Harita hassaslaştırılıyor..."
                                  : "Mapiranje..."}
                            </span>
                          </motion.div>
                        )}
                        {animationStatus === "success" && (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2 text-[#34C759] font-semibold"
                          >
                            <Check
                              className="w-3.5 h-3.5 text-[#34C759]"
                              strokeWidth={2.5}
                            />
                            <span>
                              {isEn
                                ? "Mind Synced!"
                                : language === "tr"
                                  ? "Zihin Senkronize Edildi!"
                                  : "Um sinhronizovan!"}
                            </span>
                          </motion.div>
                        )}
                        {animationStatus === "error" && (
                          <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2 text-[#FF3B30] font-semibold"
                          >
                            <X
                              className="w-3.5 h-3.5 text-[#FF3B30]"
                              strokeWidth={2.5}
                            />
                            <span>
                              {isEn
                                ? "Error"
                                : language === "tr"
                                  ? "Hata"
                                  : "Greška"}
                            </span>
                          </motion.div>
                        )}
                        {animationStatus === "idle" && (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2"
                          >
                            <Brain className="w-4 h-4 text-[#007AFF] group-hover:scale-110 transition-transform" />
                            <span>
                              {isEn
                                ? "Analyze My Mind"
                                : language === "tr"
                                  ? "Aklımı Analiz Et"
                                  : "Analiziraj moj um"}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                </div>
              </div>

              {/* Beautiful loading wizard state with sequential texts */}
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-[#0d0c13]/70 backdrop-blur-md flex items-center justify-center p-6 z-55"
                >
                  <div className="max-w-sm w-full bg-[#13111c] border border-white/5/80 rounded-xl p-8 text-center space-y-6 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#007AFF]/10 rounded-full filter blur-xl transition-opacity pointer-events-none" />

                    <div className="mx-auto w-12 h-12 border-dashed border-black/5 dark:border-white/5 border-t-transparent rounded-full animate-spin flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#0A84FF] transition-opacity" />
                    </div>

                    <div className="space-y-2 relative z-10">
                      <h4 className="text-sm font-semibold text-white font-sans">
                        {isEn
                          ? "Organizing Your Thoughts"
                          : language === "tr"
                            ? "Düşünceleriniz Düzenleniyor"
                            : "Organizujem tvoje misli..."}
                      </h4>
                      <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold h-8 flex items-center justify-center">
                        <span className="transition-opacity">
                          {brainDumpText.length < 200
                            ? isEn
                              ? "• Sorting tasks and reminders..."
                              : language === "tr"
                                ? "• Görevler ve hatırlatıcılar sıralanıyor..."
                                : "• Sortiram obaveze i podsetnike..."
                            : isEn
                              ? "• Preparing smart recommendations..."
                              : language === "tr"
                                ? "• Akıllı öneriler hazırlanıyor..."
                                : "• Pripremam pametne preporuke..."}
                        </span>
                      </p>
                    </div>

                    <div className="w-full bg-[#1C1C1E] dark:bg-[#3A3A3C] h-1.5 rounded-full overflow-hidden relative">
                      <div
                        style={{ width: `${loadingProgress}%` }}
                        className="bg-white dark:bg-[#1C1C1E] h-full rounded-full transition-all duration-150 ease-linear"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* SCREEN 2: MAIN MORNING THEME SELECTION - DEPRECATED AND MERGED INTO STEP 1 */}
          {false && (
            <motion.div
              key="theme-screen"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6 text-left"
              id="morning-screen-2"
            >
              <div className="space-y-1">
                <span className="text-[13px] font-semibold text-[#FF9500] block">
                  {isEn
                    ? "STEP 01 OF 03"
                    : language === "tr"
                      ? "ADIM 01 / 03"
                      : "KORAK 01 Od 03"}
                </span>
                <h3 className="text-lg font-semibold text-black dark:text-white tracking-wide">
                  {isEn
                    ? "What is today’s main theme?"
                    : language === "tr"
                      ? "Bugünün ana teması nedir?"
                      : "Šta je vaša glavna tema za danas?"}
                </h3>
                <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold leading-none">
                  {isEn
                    ? "Select one pillar of alignment governing today's focus energy."
                    : language === "tr"
                      ? "Bugünün odaklanma enerjisini yöneten uyumun bir sütununu seçin."
                      : "Izaberite sferu života oko koje se vrti vaša današnja prioritetna pažnja."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedTheme(opt.id)}
                    className={`p-4 rounded-xl border text-left border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[7.5rem] md:h-28 ${opt.color} ${
                      selectedTheme === opt.id
                        ? "ring-2 ring-[#FF9500]/50 dark:ring-[#FF9F0A]/50 border-[#FF9500]/20 dark:border-[#FF9F0A]/20 dark:border-[#FF9500] dark:border-[#FF9F0A] scale-102 bg-[#FF9500] dark:bg-[#FF9F0A]/[0.04]/5"
                        : "border-black/5 dark:border-white/5 active:scale-95 hover:bg-white dark:bg-[#1C1C1E] shadow-sm"
                    }`}
                  >
                    <div className="text-2xl select-none">{opt.icon}</div>
                    <div className="space-y-0.5">
                      <span className="text-[13px] font-semibold tracking-wide text-black dark:text-white block leading-tight">
                        {isEn ? opt.labelEn : opt.labelSr}
                      </span>
                      <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 block font-medium">
                        {opt.id}
                      </span>
                    </div>

                    {/* Checkmark overlay for selected item */}
                    {selectedTheme === opt.id && (
                      <span className="absolute top-3.5 right-3.5 w-4 h-4 bg-[#FF9500] dark:bg-[#FF9F0A] rounded-full flex items-center justify-center text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Theme textfield if selected */}
              {selectedTheme === "Custom" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-[#F2F2F7] dark:bg-white/5 border border-black/5 dark:border-white/5/80 rounded-xl space-y-1.5"
                >
                  <label className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block">
                    {isEn
                      ? "Enter Custom Theme Focus Name:"
                      : language === "tr"
                        ? "Özel Tema Odak Adını Girin:"
                        : "Upišite naziv specifičnog fokusa:"}
                  </label>
                  <input
                    type="text"
                    value={customTheme}
                    onChange={(e) => setCustomTheme(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g. Preparing sales funnel draft, Relocation plans"
                        : language === "tr"
                          ? "örneğin Satış hunisi taslağının hazırlanması, Yer değiştirme planlarının hazırlanması"
                          : "npr. Priprema predloga prezentacije, Selidbene kutije"
                    }
                    className="w-full text-[14px] p-2.5 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-xl font-medium text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40 outline-none focus:ring-2 focus:ring-[#FF9F0A]/30 focus:border-[#FF9F0A] shadow-sm transition-all"
                  />
                </motion.div>
              )}

              {/* Navigation control */}
              <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1 cursor-pointer"
                >
                  ← {isEn ? "Back" : language === "tr" ? "Geri" : "Nazad"}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedTheme === "Custom" && !customTheme.trim()}
                  className="px-5 py-2.5 bg-[#1C1C1E] dark:bg-[#3A3A3C] dark:text-white text-white hover:opacity-90 active:scale-97 disabled:opacity-60 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>
                    {isEn
                      ? "Continue to Brain Dump"
                      : language === "tr"
                        ? "Beyin Dökümüne Devam Edin"
                        : "Sledeće: Pražnjenje uma"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: HAOTIC BRAIN DUMP TEXTAREA INPUT - DEPRECATED AND MERGED INTO STEP 1 */}
          {false && (
            <motion.div
              key="braindump-screen"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6 text-left"
              id="morning-screen-3"
            >
              <div className="space-y-1">
                <span className="text-[13px] text-[#FF9500] block font-medium">
                  {isEn
                    ? "STEP 02 OF 03"
                    : language === "tr"
                      ? "ADIM 02 / 03"
                      : "KORAK 02 Od 03"}
                </span>
                <h3 className="text-lg font-semibold text-black dark:text-white tracking-wide">
                  {isEn
                    ? "Write Everything On Your Mind"
                    : language === "tr"
                      ? "Aklınıza Gelen Her Şeyi Yazın"
                      : "Zapišite baš sve što vam je na umu"}
                </h3>
                <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold leading-relaxed">
                  {isEn
                    ? "Ideas, worries, tasks, tiny goals, or reminders. Dump it raw and messy."
                    : language === "tr"
                      ? "Fikirler, endişeler, görevler, küçük hedefler veya hatırlatıcılar. Karmaşık ve olduğu gibi yazın."
                      : "Zadaci, brige, planovi, ideje ili podsetnici. Pišite slobodno i bez opterećenja."}
                </p>
              </div>

              {/* Textarea for dumping thoughts */}
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    value={brainDumpText}
                    onChange={(e) => setBrainDumpText(e.target.value)}
                    placeholder={
                      isEn
                        ? "Just write whatever is on your mind. \nExample: \n- I need to send the invoice to the client.\n- I'm stressed about the presentation tomorrow.\n- Remind me to call the dentist.\n- Maybe I should start reading that new book."
                        : language === "tr"
                          ? "Sadece aklınızdan geçenleri yazın. \nÖrnek: \n- Faturayı müşteriye göndermeliyim.\n- Yarınki sunum için stresliyim.\n- Dişçiyi aramamı hatırlat.\n- Belki de o yeni kitabı okumaya başlamalıyım."
                          : "Napiši slobodno sve što ti pada na pamet.\nPrimer:\n- Moram da pošaljem onaj mejl za posao.\n- Stresiram se oko sutrašnjeg sastanka.\n- Treba da zakažem kod zubara.\n- Bilo bi dobro da večeras čitam knjigu."
                    }
                    className="w-full min-h-[140px] resize-y p-4 sm:p-5 pb-16 sm:pb-16 pr-4 sm:pr-5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[24px] text-[15px] font-normal leading-relaxed text-black dark:text-[#EBEBF5]/90 placeholder:text-[#8E8E93]/60 dark:placeholder:text-[#EBEBF5]/35 outline-none focus:ring-4 focus:ring-[#FF9500]/10 transition-all shadow-sm"
                    disabled={isAnalyzing}
                  />

                  {/* Voice Input Trigger Button */}
                  <VoiceInputNode
                    language={language}
                    isEvening={isEvening}
                    onTranscript={(text) => {
                      setBrainDumpText((prev) => {
                        const cleanPrev = prev.trim();
                        return cleanPrev
                          ? `${cleanPrev} ${text.trim()} `
                          : `${text.trim()} `;
                      });
                    }}
                    onStartRecording={() => setIsRecording(true)}
                    onStopRecording={() => setIsRecording(false)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(isEn
                    ? [
                        "Feeling overwhelmed, too much work",
                        "Need a plan for today",
                        "Lack motivation but need to finish a project",
                        "Anxious about a meeting",
                      ]
                    : [
                        "Previše zadataka se nakupilo",
                        "Imam puno posla a nemam energije",
                        "Treba mi jasan plan za danas",
                        "Brinem zbog nadolazećeg projekta",
                      ]
                  ).map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        setBrainDumpText((prev) =>
                          prev ? prev + "\n" + promptText : promptText,
                        )
                      }
                      className="px-3 py-1.5 rounded-full border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E] shadow-sm text-xs font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer text-left"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>

                {isRecording && (
                  <div className="text-[13px] font-medium text-[#FF3B30] dark:text-[#FF3B30] transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3B30] dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 rounded-xl max-w-max">
                    <span className="w-2 h-2 bg-[#FF3B30] dark:bg-[#FF453A] rounded-full transition-opacity"></span>
                    {isEn
                      ? "Listening... Speak clearly. Click microphone to stop."
                      : language === "tr"
                        ? "Dinliyorum... Açıkça konuşun. Durdurmak için mikrofona tıklayın."
                        : "Slušam... Govorite jasno. Kliknite na mikrofon da zaustavite."}
                  </div>
                )}

                {/* Character Counter Meter */}
                <div className="flex justify-between items-center text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80">
                      {isEn
                        ? "CHARACTERS:"
                        : language === "tr"
                          ? "KARAKTERLER:"
                          : "ZNAKOVI:"}
                    </span>
                    <span
                      className={`${brainDumpText.length >= 500 ? "text-[#34C759] font-semibold" : brainDumpText.length >= 150 ? "text-[#FF9500]" : "text-[#3C3C43] dark:text-[#EBEBF5]/80"}`}
                    >
                      {brainDumpText.length}
                    </span>
                    <span className="text-[#555555] dark:text-[#EBEBF5]/60">
                      /
                    </span>
                    <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold">
                      500+{" "}
                      {isEn
                        ? "recommended"
                        : language === "tr"
                          ? "tavsiye edilen"
                          : "preporučeno"}
                    </span>
                  </div>

                  {/* Progressive visual bar meter */}
                  <div className="w-24 sm:w-36 h-1.5 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-full overflow-hidden shrink-0">
                    <div
                      className={`h-full transition-all duration-350 ${
                        brainDumpText.length >= 500
                          ? "bg-[#34C759] dark:bg-[#30D158]"
                          : brainDumpText.length >= 150
                            ? "bg-[#FF9500] dark:bg-[#FF9F0A]"
                            : "bg-[#007AFF]/10 dark:bg-[#0A84FF]/10"
                      }`}
                      style={{
                        width: `${Math.min((brainDumpText.length / 500) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {analysisError && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-[#FF3B30]/10 dark:bg-[#FF453A]/10/30 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 text-[#FF3B30] text-xs font-semibold rounded-xl flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30] shrink-0" />
                  <span>{analysisError}</span>
                </motion.div>
              )}

              {/* Navigation and Analyze Trigger Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => setStep(2)}
                  disabled={isAnalyzing}
                  className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1 cursor-pointer disabled:opacity-60"
                >
                  ← {isEn ? "Back" : language === "tr" ? "Geri" : "Nazad"}
                </button>

                <motion.button
                  type="button"
                  onClick={handleAnalyzeBrainDump}
                  disabled={isAnalyzing}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: !isAnalyzing ? 1.02 : 1 }}
                  animate={{
                    borderColor:
                      animationStatus === "success"
                        ? "rgba(52, 199, 89, 0.5)"
                        : animationStatus === "error"
                          ? "rgba(255, 59, 48, 0.5)"
                          : "rgba(0, 0, 0, 0)",
                  }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-3 bg-[#007AFF] text-white disabled:opacity-60 disabled:bg-[#007AFF]/50 rounded-[14px] text-[15px] font-semibold cursor-pointer flex items-center gap-2 shadow-sm transition-all hover:bg-[#007AFF]/90"
                  id="btn-analyze-mind"
                >
                  <AnimatePresence mode="wait">
                    {animationStatus === "loading" && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                        <span>
                          {isEn
                            ? "Refining Map..."
                            : language === "tr"
                              ? "Harita hassaslaştırılıyor..."
                              : "Mapiranje..."}
                        </span>
                      </motion.div>
                    )}
                    {animationStatus === "success" && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 text-[#34C759] font-semibold"
                      >
                        <Check
                          className="w-3.5 h-3.5 text-[#34C759]"
                          strokeWidth={2.5}
                        />
                        <span>
                          {isEn
                            ? "Mind Synced!"
                            : language === "tr"
                              ? "Zihin Senkronize Edildi!"
                              : "Um sinhronizovan!"}
                        </span>
                      </motion.div>
                    )}
                    {animationStatus === "error" && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 text-[#FF3B30] font-semibold"
                      >
                        <X
                          className="w-3.5 h-3.5 text-[#FF3B30]"
                          strokeWidth={2.5}
                        />
                        <span>
                          {isEn
                            ? "Error"
                            : language === "tr"
                              ? "Hata"
                              : "Greška"}
                        </span>
                      </motion.div>
                    )}
                    {animationStatus === "idle" && (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <Brain className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>
                          {isEn
                            ? "Analyze My Mind"
                            : language === "tr"
                              ? "Aklımı Analiz Et"
                              : "Analiziraj moj um"}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Gorgeous loading wizard state with sequential texts */}
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-[#0d0c13]/70 backdrop-blur-md flex items-center justify-center p-6 z-55"
                >
                  <div className="max-w-sm w-full bg-[#13111c] border border-white/5/80 rounded-xl p-8 text-center space-y-6 relative">
                    {/* Animated aura ring */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#007AFF]/10 rounded-full filter blur-xl transition-opacity pointer-events-none" />

                    <div className="mx-auto w-12 h-12 border-dashed border-black/5 dark:border-white/5 border-t-transparent rounded-full animate-spin flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#0A84FF] transition-opacity" />
                    </div>

                    <div className="space-y-2 relative z-10">
                      <h4 className="text-sm font-semibold text-white">
                        {isEn
                          ? "Organizing Your Thoughts"
                          : language === "tr"
                            ? "Düşünceleriniz Düzenleniyor"
                            : "Organizujem tvoje misli..."}
                      </h4>
                      {/* Interactive text cycles simulating system parsing steps */}
                      <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold h-8 flex items-center justify-center">
                        <span className="transition-opacity">
                          {brainDumpText.length < 200
                            ? isEn
                              ? "• Sorting tasks and reminders..."
                              : language === "tr"
                                ? "• Görevler ve hatırlatıcılar sıralanıyor..."
                                : "• Sortiram obaveze i podsetnike..."
                            : isEn
                              ? "• Preparing smart recommendations..."
                              : language === "tr"
                                ? "• Akıllı öneriler hazırlanıyor..."
                                : "• Pripremam pametne preporuke..."}
                        </span>
                      </p>
                    </div>

                    <div className="w-full bg-[#1C1C1E] dark:bg-[#3A3A3C] h-1.5 rounded-full overflow-hidden relative">
                      <div
                        style={{ width: `${loadingProgress}%` }}
                        className="bg-white dark:bg-[#1C1C1E] h-full rounded-full transition-all duration-150 ease-linear"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* SCREEN 4: COLLAPSED SUCCESS STATE (Stanje posle završenog Brain Dump-a) */}
          {step === 4 && parsedData && !isAnalyzing && (
            <motion.div
              key="collapsed-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 sm:p-8 border border-black/5 dark:border-white/5 shadow-sm flex flex-col items-center text-center space-y-5"
              id="morning-screen-4"
            >
              <div className="w-14 h-14 bg-[#34C759]/10 text-[#34C759] rounded-full flex items-center justify-center mb-1">
                <Check className="w-7 h-7" strokeWidth={3} />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-[20px] font-bold text-black dark:text-white tracking-tight">
                  {isEn ? "Entry Completed" : language === "tr" ? "Giriş Tamamlandı" : "Unos je završen"}
                </h3>
                <p className="text-[14px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium">
                  {isEn ? "Last processed at" : language === "tr" ? "Son işlenme zamanı" : "Vreme poslednje obrade"}: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white font-semibold text-[15px] transition-colors cursor-pointer"
                >
                  {isEn ? "Append to Entry" : language === "tr" ? "Girişe Ekle" : "Dopuni Brain Dump"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(5);
                    if (onStepChange) onStepChange(5);
                  }}
                  className="px-6 py-3.5 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-semibold text-[15px] transition-colors flex justify-center items-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>{isEn ? "Continue to Next Step" : language === "tr" ? "Sonraki Adıma Geç" : "Nastavi na sledeći korak"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}





          {/* SCREEN 5: AI BRAIN MAP EXTRAPOLATION RESUTS - POLISHED APPLE STYLE */}
          {step === 5 && parsedData && !isAnalyzing && (
            <motion.div
              key="map-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              id="morning-screen-5"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
                <div>
                  <h3 className="text-[22px] font-bold text-black dark:text-white tracking-tight leading-none mb-1">
                    {isEn
                      ? "Morning Summary"
                      : language === "tr"
                        ? "Sabah Özeti"
                        : "Tvoj jutarnji rezime"}
                  </h3>
                  <p className="text-[13px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium">
                    {isEn
                      ? "Key insights distilled from your morning thoughts"
                      : language === "tr"
                        ? "Sabah düşüncelerinizden damıtılmış temel içgörüler"
                        : "Ključni uvidi izdvojeni iz tvog jutarnjeg razmišljanja"}
                  </p>
                </div>
              </div>

              {/* TACTICAL ALLOCATION PLAN PANEL */}
              <div className="w-full md:max-w-5xl md:mx-auto">
                {/* Tactical Allocation Plan Column */}
                <div className="p-6 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#007AFF]/5 rounded-full filter blur-xl pointer-events-none" />
                  
                  <div className="space-y-1.5 relative z-10">
                    <div className="flex items-center gap-2 text-[11px] font-black text-[#007AFF] uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5 fill-[#007AFF]" />
                      <span>
                        {isEn
                          ? "Suggested Daily Focus"
                          : language === "tr"
                            ? "Önerilen Günlük Odak"
                            : "Predloženi Dnevni Fokus"}
                      </span>
                    </div>
                    <h4 className="text-[18px] font-bold text-black dark:text-white tracking-tight">
                      {isEn
                        ? "Where to start today?"
                        : language === "tr"
                          ? "Bugün nereden başlamalı?"
                          : "Odakle početi danas?"}
                    </h4>
                    <p className="text-[13px] text-[#8E8E93] dark:text-[#EBEBF5]/60 leading-relaxed">
                      {isEn
                        ? "Personalized recommendations based on your mood, energy levels, and focused priorities."
                        : language === "tr"
                          ? "Ruh halinize, enerji seviyenize ve odaklanmış önceliklerinize göre kişiselleştirilmiş öneriler."
                          : "Personalizovane preporuke na osnovu tvog raspoloženja, nivoa energije i glavnih prioriteta."}
                    </p>
                  </div>

                  {parsedData.todayFocus && (
                    <div className="p-3.5 bg-[#007AFF]/5 border border-[#007AFF]/15 rounded-xl flex items-center justify-between gap-3">
                      <span className="text-[11px] font-black text-[#007AFF] uppercase tracking-wider">
                        {isEn ? "Today's Motto:" : language === "tr" ? "Günün Mottosu:" : "Moto dana:"}
                      </span>
                      <span className="text-[13px] font-extrabold text-black dark:text-white italic">
                        "{parsedData.todayFocus}"
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {parsedData.topPriority && (
                      <div className="flex flex-col justify-between p-4 bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] shrink-0" />
                          <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wide">
                            {isEn ? "Top Priority" : language === "tr" ? "Ana Öncelik" : "Glavni Prioritet"}
                          </span>
                        </div>
                        <span className="text-[13.5px] font-bold text-black dark:text-white leading-snug">
                          {parsedData.topPriority}
                        </span>
                      </div>
                    )}

                    {parsedData.thirtyMinAction && (
                      <div className="flex flex-col justify-between p-4 bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500] shrink-0" />
                          <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wide">
                            {isEn ? "First 30 Mins" : language === "tr" ? "İlk 30 Dakika" : "Prvih 30 Minuta"}
                          </span>
                        </div>
                        <span className="text-[13.5px] font-bold text-black dark:text-white leading-snug">
                          {parsedData.thirtyMinAction}
                        </span>
                      </div>
                    )}

                    {parsedData.fiveMinReset && (
                      <div className="flex flex-col justify-between p-4 bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] shrink-0" />
                          <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wide">
                            {isEn ? "5-Min Reset" : language === "tr" ? "5-Dakikalık Reset" : "5-Minutni Reset"}
                          </span>
                        </div>
                        <span className="text-[13.5px] font-bold text-black dark:text-white leading-snug">
                          {parsedData.fiveMinReset}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bento Grid View - Polished Apple HIG Style */}
                <div className="space-y-6 w-full md:max-w-5xl md:mx-auto">


                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0 w-full">
                    {/* DYNAMIC ADAPTIVE BIOHACKING CARD INTEGRATED INTO COGNITIVE MIND MAP */}
                    <div className="p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-3.5">
                      <div
                        onClick={() =>
                          setExpandedCard({
                            type: isEn
                              ? "Core Need"
                              : language === "tr"
                                ? "Temel İhtiyaç"
                                : "Ključna Potreba",
                            title:
                              parsedData.cognitive_chain?.need ||
                              (isEn
                                ? "Clarity and Control"
                                : language === "tr"
                                  ? "Netlik ve Kontrol"
                                  : "Jasnoća i kontrola"),
                            description: isEn
                              ? "Biological reset focus based on your current state."
                              : language === "tr"
                                ? "Mevcut durumunuza göre biyolojik sıfırlama odağı."
                                : "Fokus biološkog reseta na osnovu vašeg stanja.",
                          })
                        }
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#000000]/40 p-3.5 rounded-xl border border-white/50 dark:border-white/5 cursor-pointer hover:border-[#007AFF]/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 text-left">
                          <span className="text-2xl select-none pt-0.5">
                            <Activity className="w-7 h-7 text-[#34C759]" />
                          </span>
                          <div>
                            <span className="text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-semibold block select-none">
                              {isEn
                                ? "PHYSICAL RESET"
                                : language === "tr"
                                  ? "FİZİKSEL SIFIRLAMA"
                                  : "TELESNI RESET"}
                            </span>
                            <h4 className="text-xs font-semibold text-black dark:text-white tracking-wide">
                              {isEn
                                ? `Solving Need: ${parsedData.cognitive_chain?.need || "Clarity"}`
                                : language === "tr"
                                  ? `Çözüm İhtiyacı: ${parsedData.cognitive_chain?.need || "Clarity"}`
                                  : `Rešenje za potrebu: ${parsedData.cognitive_chain?.need || "Jasnoća"}`}
                            </h4>
                          </div>
                        </div>

                        {/* Refresh / Click for MORE icon action
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchBiohackTip(
                        parsedData.cognitive_chain?.need || "Clarity",
                        biohackTip,
                      );
                    }}
                    disabled={isGeneratingBiohack}
                    className="px-4 py-2 rounded-xl bg-[#007AFF] active:opacity-70 font-semibold text-[13px] text-white transition-all shrink-0 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer max-w-max"
                    title={
                      isEn ? "Get another/different biohack tip" : language === "tr" ? "Başka/farklı bir biohack ipucu alın" : "Daj mi još jedan savet"
                    }
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isGeneratingBiohack ? "animate-spin" : ""}`}
                    />
                    <span>
                      {isEn ? "WANT ANOTHER TIP? GENERATE" : language === "tr" ? "BAŞKA BİR İPUCU MI İSTİYORSUNUZ? OLUŞTUR" : "ŽELIŠ JOŠ SAVETA? RE-GENERISI"}
                    </span>
                  </button>
                  */}
                      </div>

                      <div className="p-4 bg-white dark:bg-[#000000]/70 rounded-xl border border-black/5 dark:border-white/5/80 relative">
                        <div className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium leading-relaxed text-left">
                          {isGeneratingBiohack ? (
                            <span className="flex items-center gap-2 text-[#007AFF] transition-opacity font-medium">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {isEn
                                ? "Getting a new personalized recommendation..."
                                : language === "tr"
                                  ? "Daha kişiselleştirilmiş çözümler için danışmanınıza danışın..."
                                  : "Kontaktiramo savetnika u potrazi za novim rešenjima..."}
                            </span>
                          ) : (
                            <>
                              {biohackTip && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(biohackTip).catch(() => {});
                                    window.dispatchEvent(
                                      new CustomEvent("trigger-toast", {
                                        detail: {
                                          message: isEn
                                            ? "Copied to clipboard!"
                                            : language === "tr"
                                              ? "Panoya kopyalandı!"
                                              : "Kopirano u ostavu!",
                                          type: "success",
                                        },
                                      }),
                                    );
                                  }}
                                  className="absolute bottom-2 right-2 p-1.5 bg-black/5 dark:bg-white/10 rounded-md text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors"
                                  title="Copy tip"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <div
                                className="cursor-pointer hover:opacity-80 transition-opacity select-text pr-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCard({
                                    type: isEn
                                      ? "Biohack Advice"
                                      : language === "tr"
                                        ? "Biohack Tavsiyeleri"
                                        : "Biohaking Savet",
                                    description:
                                      biohackTip ||
                                      (isEn
                                        ? "Wait for generation..."
                                        : language === "tr"
                                          ? "Nesli bekle..."
                                          : "Sačekaj da se generiše..."),
                                    explanation: isEn
                                      ? "Drawn from current biological profile."
                                      : language === "tr"
                                        ? "Mevcut biyolojik profilden alınmıştır."
                                        : "Zasnovano na unetom nivou energije.",
                                  });
                                }}
                              >
                                {renderFormattedBiohack(
                                  biohackTip ||
                                    (isEn
                                      ? "Generating personalized recommendations based on your current state..."
                                      : language === "tr"
                                        ? "Mevcut durumunuza dayalı kişiselleştirilmiş öneriler oluşturuluyor..."
                                        : "Generišem personalizovane preporuke na osnovu vašeg stanja..."),
                                )}
                              </div>
                              {suggestedBiohackHabit &&
                                !isGeneratingBiohack && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const labelPrefix = isEn
                                        ? "Micro-routine:"
                                        : language === "tr"
                                          ? "Mikro rutin:"
                                          : "Mikrorutina:";
                                      const descPrefix = isEn
                                        ? "Why / Science:"
                                        : language === "tr"
                                          ? "Neden / Bilim:"
                                          : "Zašto / Nauka:";

                                      const biohackDesc = biohackTip
                                        ? `${labelPrefix} ${suggestedBiohackHabit.twoMinVersion}\n\n${descPrefix} ${biohackTip}`
                                        : `${labelPrefix} ${suggestedBiohackHabit.twoMinVersion}`;

                                      onAddTask(
                                        `⚡ Biohack: ${suggestedBiohackHabit.name}`,
                                        biohackDesc,
                                        "B",
                                      );
                                      window.dispatchEvent(
                                        new CustomEvent("trigger-toast", {
                                          detail: {
                                            message: isEn
                                              ? "Added micro-routine to today's plan! 📑"
                                              : language === "tr"
                                                ? "Bugünkü plana mikro rutin eklendi! 📑"
                                                : "Dodata mikrorutina današnjem planu! 📑",
                                            type: "success",
                                          },
                                        }),
                                      );
                                    }}
                                    className="mt-3 px-3 py-1.5 bg-[#007AFF] text-white rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-colors active:scale-95"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    {isEn
                                      ? "Add Micro-routine to Today"
                                      : language === "tr"
                                        ? "Bugüne Mikro Rutin Ekle"
                                        : "Dodaj mikrorutinu u današnji plan"}
                                  </button>
                                )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="pt-2.5 border-t border-black/5 dark:border-white/5">
                        <NsdrPlayer language={language} isCompact={true} />
                      </div>
                    </div>

                    {/* The view is explicitly Bento, removed SVG graphic segment */}

                    {/* 1. TASKS BENTO */}
                    <div className="p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-3 md:col-span-2 lg:col-span-2 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[13px] font-semibold text-[#5856D6] dark:text-[#5E5CE6] flex items-center gap-1.5 leading-none">
                          📋{" "}
                          {isEn
                            ? "Concrete Action Tasks"
                            : language === "tr"
                              ? "Somut Eylem Görevleri"
                              : "Konkretni zadaci za rešavanje"}
                          <span className="text-[13px] px-1.5 py-0.5 bg-[#007AFF]/10 dark:bg-[#1C1C1E] text-[#007AFF] dark:text-[#0A84FF] rounded-sm">
                            {parsedData.tasks?.length || 0}
                          </span>
                        </h4>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {parsedData.tasks && parsedData.tasks.length > 0 ? (
                          parsedData.tasks.map((t: any, idx: number) => {
                            const isSynced = tasks.some(
                              (existing) =>
                                existing.title.toLowerCase().trim() ===
                                t.title.toLowerCase().trim(),
                            );
                            return (
                              <div
                                key={idx}
                                onClick={() =>
                                  setExpandedCard({
                                    type: isEn
                                      ? "Task"
                                      : language === "tr"
                                        ? "Görev"
                                        : "Zadatak",
                                    title: t.title,
                                    category: `Kat ${t.category}`,
                                    description: t.description,
                                    explanation: t.explanation,
                                    complexity: t.complexity,
                                    duration: t.duration,
                                  })
                                }
                                className="p-2.5 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 rounded-xl space-y-2.5 font-sans text-left cursor-pointer hover:border-[#007AFF]/50 transition-colors min-w-0"
                              >
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                  <span className="text-xs font-semibold text-black dark:text-white leading-snug break-words">
                                    {t.title}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const cats = ["A", "B", "C", "D", "E"];
                                        const newTasks = [...parsedData.tasks];
                                        const currentIdx =
                                          cats.indexOf(
                                            newTasks[idx].category,
                                          ) !== -1
                                            ? cats.indexOf(
                                                newTasks[idx].category,
                                              )
                                            : 0;
                                        newTasks[idx].category =
                                          cats[(currentIdx + 1) % cats.length];
                                        setParsedData({
                                          ...parsedData,
                                          tasks: newTasks,
                                        });
                                      }}
                                      className={`text-[11px] font-black text-white px-2 py-0.5 rounded transition-transform cursor-pointer hover:scale-105 active:scale-95 ${
                                        t.category === "A"
                                          ? "bg-[#FF3B30] dark:bg-[#FF453A]"
                                          : t.category === "B"
                                            ? "bg-[#FF9500] dark:bg-[#FF9F0A]"
                                            : t.category === "C"
                                              ? "bg-[#34C759] dark:bg-[#30D158]"
                                              : "bg-[#8E8E93] dark:bg-[#5C5C5E]"
                                      }`}
                                      title={
                                        isEn
                                          ? "Click to change priority"
                                          : language === "tr"
                                            ? "Önceliği değiştirmek için tıklayın"
                                            : "Klikni za promenu prioriteta"
                                      }
                                    >
                                      {isEn
                                        ? `Cat ${t.category}`
                                        : language === "tr"
                                          ? `Kat ${t.category}`
                                          : `Kat ${t.category}`}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newTasks = [...parsedData.tasks];
                                        newTasks.splice(idx, 1);
                                        setParsedData({
                                          ...parsedData,
                                          tasks: newTasks,
                                        });
                                      }}
                                      className="p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md transition-colors"
                                      title={
                                        isEn
                                          ? "Remove suggestion"
                                          : language === "tr"
                                            ? "Öneriyi kaldır"
                                            : "Ukloni predlog"
                                      }
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#FF3B30] transition-colors" />
                                    </button>
                                  </div>
                                </div>
                                {t.description && (
                                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/85 leading-relaxed">
                                    {t.description}
                                  </p>
                                )}
                                {(t.duration !== undefined ||
                                  t.complexity !== undefined) && (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {t.duration !== undefined && (
                                      <span className="text-[10px] bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        ⏱️ {t.duration} min
                                      </span>
                                    )}
                                    {t.complexity !== undefined && (
                                      <span className="text-[10px] bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 px-1.5 py-0.5 rounded flex items-center gap-1 capitalize">
                                        🧠{" "}
                                        {t.complexity === "high"
                                          ? isEn
                                            ? "High effort"
                                            : language === "tr"
                                              ? "Yüksek efor"
                                              : "Visok napor"
                                          : t.complexity === "medium"
                                            ? isEn
                                              ? "Medium effort"
                                              : language === "tr"
                                                ? "Orta efor"
                                                : "Srednji napor"
                                            : isEn
                                              ? "Low effort"
                                              : language === "tr"
                                                ? "Düşük efor"
                                                : "Mali napor"}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <p className="text-[12px] text-[#8E8E93] dark:text-[#EBEBF5]/50 italic leading-snug">
                                  ↳ {t.explanation}
                                </p>

                                {/* Task-Level Action Line */}
                                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-end">
                                  {isSynced ? (
                                    <div className="py-1 px-2.5 bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-not-allowed">
                                      <Check className="w-3 h-3 text-[#34C759]" />
                                      <span>
                                        {isEn
                                          ? "Added ✓"
                                          : language === "tr"
                                            ? "Panoda ✓"
                                            : "Dodato ✓"}
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSyncSingleTaskToBoard(t);
                                      }}
                                      className="py-1 px-2.5 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center gap-1 cursor-pointer"
                                    >
                                      <CheckSquare className="w-3 h-3 shrink-0" />
                                      <span>
                                        {isEn
                                          ? "Add to Board"
                                          : language === "tr"
                                            ? "Panoya Ekle"
                                            : "Dodaj na tablu"}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8 px-4 bg-white/45 dark:bg-[#000000]/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5"
                          >
                            <motion.div
                              animate={{
                                rotate: [0, 5, -5, 0],
                                scale: [1, 1.05, 1],
                              }}
                              transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              className="inline-block text-2xl"
                            >
                              🕊️
                            </motion.div>
                            <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold italic">
                              {isEn
                                ? "No concrete tasks extracted."
                                : language === "tr"
                                  ? "Hiçbir somut görev çıkarılmadı."
                                  : "Nisu uočeni konkretni zadaci."}
                            </p>
                          </motion.div>
                        )}
                      </div>
                      {!isTasksSynced &&
                        parsedData.tasks &&
                        parsedData.tasks.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSyncTasksToBoard()}
                            className="w-full mt-3 py-2.5 bg-[#007AFF] active:opacity-70 font-semibold rounded-xl text-[13px] text-white text-center transition-all cursor-pointer shadow-sm hover:transform hover:scale-[1.01]"
                          >
                            {isEn
                              ? "Arrange Remaining Tasks"
                              : language === "tr"
                                ? "Kalan Görevleri Düzenle"
                                : "Rasporedi preostale zadatke"}
                          </button>
                        )}
                      {isTasksSynced &&
                        parsedData.tasks &&
                        parsedData.tasks.length > 0 && (
                          <div className="w-full mt-3 py-2.5 bg-[#34C759]/10 text-[#34C759] font-semibold rounded-xl text-[13px] text-center flex items-center justify-center gap-1.5 border border-[#34C759]/20">
                            <Check className="w-4 h-4" />
                            {isEn
                              ? "All Tasks Scheduled"
                              : language === "tr"
                                ? "Tüm Görevler Düzenlendi"
                                : "Svi zadaci su uspešno raspoređeni!"}
                          </div>
                        )}
                    </div>

                    {/* 2. GOALS BENTO */}
                    <div className="p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-3">
                      <h4 className="text-[13px] font-semibold text-[#FF9500] flex items-center gap-1.5 leading-none">
                        <Target className="w-4 h-4" />
                        {isEn
                          ? "Multi-step Goals"
                          : language === "tr"
                            ? "Çok Adımlı Hedefler"
                            : "Dugoročni ciljevi"}
                      </h4>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {parsedData.goals && parsedData.goals.length > 0 ? (
                          parsedData.goals.map((g: string, i: number) => {
                            const feedbackId = `goal_${i}`;
                            const feedback = actionFeedback[feedbackId];
                            const cat =
                              determineCategoryForGoalOrIdea(g, true) || "B";
                            const isSynced =
                              syncedGoals.has(g) ||
                              tasks.some((t) =>
                                t.title.toLowerCase().includes(g.toLowerCase()),
                              );

                            return (
                              <div
                                key={i}
                                className="group relative flex flex-col gap-3 p-4 bg-white/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-2xl transition-all duration-300 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2.5">
                                    <div
                                      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                                        cat === "A"
                                          ? "bg-[#FF3B30]"
                                          : cat === "B"
                                            ? "bg-[#FF9500]"
                                            : cat === "C"
                                              ? "bg-[#34C759]"
                                              : cat === "D"
                                                ? "bg-[#007AFF]"
                                                : "bg-[#8E8E93]"
                                      }`}
                                    />
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[14px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7] leading-tight">
                                        {g}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#8E8E93] uppercase tracking-tighter">
                                          {isEn
                                            ? "Recommended"
                                            : language === "tr"
                                              ? "Önerilen"
                                              : "Preporučeno"}
                                          : {cat}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleDeleteParsedItem("goals", i, e)
                                    }
                                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all opacity-40 hover:opacity-100"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="flex flex-col gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                                  <div className="space-y-3 flex flex-col">
                                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                                      {isSynced ? (
                                        <div className="flex-1 py-2.5 px-4 bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 font-bold text-[12px] rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                                          <CheckCircle className="w-4 h-4 text-[#34C759] shrink-0" />
                                          <span className="truncate">
                                            {isEn
                                              ? "Synced to Board ✓"
                                              : language === "tr"
                                                ? "Panoya Eklendi ✓"
                                                : "Dodato na tablu ✓"}
                                          </span>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddGoalAsTask(
                                              g,
                                              feedbackId,
                                              localPriorityOverrides[
                                                feedbackId
                                              ] || cat,
                                            );
                                          }}
                                          className="flex-1 py-2.5 px-4 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold text-[12px] rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                          <CheckSquare className="w-4 h-4 shrink-0" />
                                          <span className="truncate">
                                            {isEn
                                              ? `Add to Board`
                                              : language === "tr"
                                                ? `Panoya Ekle`
                                                : `Dodaj na tablu`}{" "}
                                            (
                                            {localPriorityOverrides[
                                              feedbackId
                                            ] || cat}
                                            )
                                          </span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDecomposeGoal(g, feedbackId);
                                        }}
                                        className="flex-1 py-2.5 px-4 bg-[#FF2D55] hover:bg-[#FF2D55]/90 text-white font-bold text-[12px] rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">
                                          {isEn
                                            ? "Strategic Vision"
                                            : language === "tr"
                                              ? "Stratejik Vizyon"
                                              : "Strateška Vizija"}
                                        </span>
                                      </button>
                                    </div>

                                    {!isSynced && (
                                      <div className="pt-1">
                                        <div className="flex items-center justify-between px-1 mb-1.5">
                                          <span className="text-[10px] font-black text-[#8E8E93] dark:text-[#EBEBF5]/40 uppercase tracking-widest">
                                            {isEn
                                              ? "Custom Priority"
                                              : language === "tr"
                                                ? "Özel Öncelik"
                                                : "Promeni prioritet"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {(
                                            ["A", "B", "C", "D", "E"] as const
                                          ).map((catCode) => {
                                            const currentPriority =
                                              localPriorityOverrides[
                                                feedbackId
                                              ] || cat;
                                            return (
                                              <button
                                                key={catCode}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setLocalPriorityOverrides(
                                                    (prev) => ({
                                                      ...prev,
                                                      [feedbackId]: catCode,
                                                    }),
                                                  );
                                                }}
                                                className={`flex-1 h-8 flex items-center justify-center text-[12px] font-black rounded-lg border transition-all cursor-pointer ${
                                                  catCode === currentPriority
                                                    ? "bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20"
                                                    : "bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/60 border-transparent hover:border-black/10 dark:hover:border-white/10"
                                                }`}
                                              >
                                                {catCode}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {feedback && (
                                    <div className="text-center pt-1 animate-in fade-in duration-300">
                                      <span className="inline-block px-2.5 py-1 bg-black/5 dark:bg-white/5 text-[#34C759] text-[10px] font-bold rounded-full">
                                        {feedback}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8 px-4 bg-white/45 dark:bg-[#000000]/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5"
                          >
                            <motion.div
                              animate={{ y: [0, -3, 0], scale: [1, 1.08, 1] }}
                              transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              className="inline-block text-2xl"
                            >
                              🎯
                            </motion.div>
                            <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs font-semibold italic">
                              {isEn
                                ? "No general goals extracted."
                                : language === "tr"
                                  ? "Hiçbir genel hedef çıkarılmadı."
                                  : "Nema opštih ciljeva."}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* 3. WORRIES BENTO */}
                    <div className="p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-3">
                      <h4 className="text-[13px] font-semibold text-[#AF52DE] flex items-center gap-1.5 leading-none">
                        <Brain className="w-4 h-4" />
                        {isEn
                          ? "Anxieties & Worries"
                          : language === "tr"
                            ? "Kaygılar ve Endişeler"
                            : "Brige i anksioznost"}
                      </h4>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {parsedData.worries && parsedData.worries.length > 0 ? (
                          parsedData.worries.map((w: string, i: number) => {
                            const feedbackId = `worry_${i}`;
                            const feedback = actionFeedback[feedbackId];
                            return (
                              <div
                                key={i}
                                onClick={() =>
                                  setExpandedCard({
                                    type: isEn
                                      ? "Worry"
                                      : language === "tr"
                                        ? "Endişelenmek"
                                        : "Briga / Anksioznost",
                                    description: w,
                                  })
                                }
                                className="p-2.5 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5 rounded-xl space-y-2 cursor-pointer hover:border-[#FF3B30]/50 transition-colors group"
                              >
                                <div className="flex items-start justify-between gap-2 text-xs font-semibold pointer-events-none">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[#FF3B30] text-sm leading-none">
                                      🧠
                                    </span>
                                    <span className="text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-tight">
                                      {w}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleDeleteParsedItem("worries", i, e)
                                    }
                                    className="p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto"
                                    title={
                                      isEn
                                        ? "Mark as reviewed"
                                        : language === "tr"
                                          ? "İncelendi olarak işaretle"
                                          : "Označi kao pregledano (Ukloni)"
                                    }
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] transition-colors" />
                                  </button>
                                </div>
                                <div className="flex flex-col gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                                  {feedback && (
                                    <span className="text-xs font-semibold text-[#34C759] dark:text-[#34C759] bg-[#34C759]/10 dark:bg-[#30D158]/10 px-2 py-1 rounded-lg text-center w-full block">
                                      {feedback}
                                    </span>
                                  )}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReframeWorry(w, feedbackId);
                                      }}
                                      className="p-2 bg-white dark:bg-[#1C1C1E] hover:bg-[#AF52DE]/10 dark:hover:bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#AF52DE] dark:hover:text-[#AF52DE] dark:text-[#BF5AF2] font-medium rounded-xl border border-black/5 dark:border-white/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 group"
                                    >
                                      <span className="text-[13px] text-inherit flex items-center gap-1 font-semibold">
                                        🧘{" "}
                                        {isEn
                                          ? "AI Coach"
                                          : language === "tr"
                                            ? "Yapay Zeka Koçu"
                                            : "AI Trener"}
                                      </span>
                                      <span className="text-[11px] font-medium text-inherit opacity-85 leading-tight px-1 transition-colors">
                                        {isEn
                                          ? "Transform mental block automatically"
                                          : language === "tr"
                                            ? "Zihinsel bloğu otomatik olarak dönüştürün"
                                            : "Automatski otkloni ovu mentalnu blokadu"}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDiscardWorry(w, feedbackId);
                                      }}
                                      className="p-2 bg-white dark:bg-[#1C1C1E] hover:bg-[#34C759]/10 dark:hover:bg-[#30D158]/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] dark:hover:text-[#30D158] font-medium rounded-xl border border-black/5 dark:border-white/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 group"
                                    >
                                      <span className="text-[13px] text-inherit flex items-center gap-1 font-semibold">
                                        🌬️{" "}
                                        {isEn
                                          ? "Let Go (Control)"
                                          : language === "tr"
                                            ? "Bırak (Kontrol)"
                                            : "Otpusti (Zona Kontrole)"}
                                      </span>
                                      <span className="text-[11px] font-medium text-inherit opacity-85 leading-tight px-1 transition-colors">
                                        {isEn
                                          ? "Acknowledge and consciously release it"
                                          : language === "tr"
                                            ? "Kabul edin ve bilinçli olarak bırakın"
                                            : "Svesno prihvati i otpusti iz svesti"}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8 px-4 bg-white/45 dark:bg-[#000000]/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5"
                          >
                            <motion.div
                              animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.8, 1, 0.8],
                              }}
                              transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              className="inline-block text-2xl"
                            >
                              🌤️
                            </motion.div>
                            <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs font-semibold italic">
                              {isEn
                                ? "Thoughts are fully worry-free!"
                                : language === "tr"
                                  ? "Düşünceler tamamen endişesizdir!"
                                  : "Miran um bez uočenih briga!"}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* 4. IDEAS BENTO */}
                    <div className="p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-3">
                      <h4 className="text-[13px] font-semibold text-[#FF9500] flex items-center gap-1.5 leading-none">
                        💡{" "}
                        {isEn
                          ? "Inspirations & Ideas"
                          : language === "tr"
                            ? "İlham ve Fikirler"
                            : "Seme novih ideja"}
                      </h4>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {parsedData.ideas && parsedData.ideas.length > 0 ? (
                          parsedData.ideas.map((id: string, i: number) => {
                            const feedbackId = `idea_${i}`;
                            const feedback = actionFeedback[feedbackId];
                            const cat =
                              determineCategoryForGoalOrIdea(id, false) || "C";
                            const isSynced =
                              syncedIdeas.has(id) ||
                              tasks.some((t) =>
                                t.title
                                  .toLowerCase()
                                  .includes(id.toLowerCase()),
                              );

                            return (
                              <div
                                key={i}
                                className="group relative flex flex-col gap-3 p-4 bg-white/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-2xl transition-all duration-300 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2.5">
                                    <div
                                      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                                        cat === "A"
                                          ? "bg-[#FF3B30]"
                                          : cat === "B"
                                            ? "bg-[#FF9500]"
                                            : cat === "C"
                                              ? "bg-[#34C759]"
                                              : cat === "D"
                                                ? "bg-[#007AFF]"
                                                : "bg-[#8E8E93]"
                                      }`}
                                    />
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[14px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7] leading-tight">
                                        {id}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#8E8E93] uppercase tracking-tighter">
                                          {isEn
                                            ? "Recommended"
                                            : language === "tr"
                                              ? "Önerilen"
                                              : "Preporučeno"}
                                          : {cat}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleDeleteParsedItem("ideas", i, e)
                                    }
                                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all opacity-40 hover:opacity-100"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="flex flex-col gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                                  <div className="space-y-3 flex flex-col">
                                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                                      {isSynced ? (
                                        <div className="flex-1 py-2.5 px-4 bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 font-bold text-[12px] rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                                          <CheckCircle className="w-4 h-4 text-[#34C759] shrink-0" />
                                          <span className="truncate">
                                            {isEn
                                              ? "Synced to Board ✓"
                                              : language === "tr"
                                                ? "Panoya Eklendi ✓"
                                                : "Dodato na tablu ✓"}
                                          </span>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveIdea(
                                              id,
                                              feedbackId,
                                              localPriorityOverrides[
                                                feedbackId
                                              ] || cat,
                                            );
                                          }}
                                          className="flex-1 py-2.5 px-4 bg-[#FF9500] hover:bg-[#FF9500]/90 text-white font-bold text-[12px] rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                          <CheckSquare className="w-4 h-4 shrink-0" />
                                          <span className="truncate">
                                            {isEn
                                              ? `Add to Board`
                                              : language === "tr"
                                                ? `Panoya Ekle`
                                                : `Dodaj na tablu`}{" "}
                                            (
                                            {localPriorityOverrides[
                                              feedbackId
                                            ] || cat}
                                            )
                                          </span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleElaborateIdea(id, feedbackId);
                                        }}
                                        className="flex-1 py-2.5 px-4 bg-[#AF52DE] hover:bg-[#AF52DE]/90 text-white font-bold text-[12px] rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">
                                          {isEn
                                            ? "Strategic Vision"
                                            : language === "tr"
                                              ? "Stratejik Vizyon"
                                              : "Strateška Vizija"}
                                        </span>
                                      </button>
                                    </div>

                                    {!isSynced && (
                                      <div className="pt-1">
                                        <div className="flex items-center justify-between px-1 mb-1.5">
                                          <span className="text-[10px] font-black text-[#8E8E93] dark:text-[#EBEBF5]/40 uppercase tracking-widest">
                                            {isEn
                                              ? "Custom Priority"
                                              : language === "tr"
                                                ? "Özel Öncelik"
                                                : "Promeni prioritet"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {(
                                            ["A", "B", "C", "D", "E"] as const
                                          ).map((catCode) => {
                                            const currentPriority =
                                              localPriorityOverrides[
                                                feedbackId
                                              ] || cat;
                                            return (
                                              <button
                                                key={catCode}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setLocalPriorityOverrides(
                                                    (prev) => ({
                                                      ...prev,
                                                      [feedbackId]: catCode,
                                                    }),
                                                  );
                                                }}
                                                className={`flex-1 h-8 flex items-center justify-center text-[12px] font-black rounded-lg border transition-all cursor-pointer ${
                                                  catCode === currentPriority
                                                    ? "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20"
                                                    : "bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/60 border-transparent hover:border-black/10 dark:hover:border-white/10"
                                                }`}
                                              >
                                                {catCode}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {feedback && (
                                    <div className="text-center pt-1 animate-in fade-in duration-300">
                                      <span className="inline-block px-2.5 py-1 bg-black/5 dark:bg-white/5 text-[#FF9500] text-[10px] font-bold rounded-full">
                                        {feedback}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8 px-4 bg-white/45 dark:bg-[#000000]/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-1.5"
                          >
                            <motion.div
                              animate={{ rotate: [0, 15, -15, 0] }}
                              transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              className="inline-block text-2xl"
                            >
                              💡
                            </motion.div>
                            <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-xs font-semibold italic">
                              {isEn
                                ? "No creative seeds extracted."
                                : language === "tr"
                                  ? "Hiçbir yaratıcı tohum çıkarılmadı."
                                  : "Nema zabeleženih ideja."}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* 5. WAITING FOR & NOT TODAY BENTO */}
                    <div className="p-4 sm:p-5 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-[13px] font-semibold text-[#32ADE6] flex items-center gap-1.5 leading-none">
                          ⏳{" "}
                          {isEn
                            ? "Waiting For (Others)"
                            : language === "tr"
                              ? "Bekliyorum (Diğerleri)"
                              : "Zavisnosti (Čekam druge)"}
                        </h4>
                        <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                          {parsedData.waiting_for &&
                          parsedData.waiting_for.length > 0 ? (
                            parsedData.waiting_for.map(
                              (wf: string, i: number) => {
                                const feedbackId = `waiting_${i}`;
                                const feedback = actionFeedback[feedbackId];
                                return (
                                  <div
                                    key={i}
                                    className="p-2 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5/40 rounded-xl space-y-1.5 text-[13px] font-semibold group"
                                  >
                                    <div className="flex items-center justify-between text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span>⏳</span>
                                        <span className="truncate">{wf}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          handleDeleteParsedItem(
                                            "waiting_for",
                                            i,
                                            e,
                                          )
                                        }
                                        className="p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                        title={
                                          isEn
                                            ? "Mark as reviewed"
                                            : language === "tr"
                                              ? "İncelendi olarak işaretle"
                                              : "Označi kao pregledano (Ukloni)"
                                        }
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] transition-colors" />
                                      </button>
                                    </div>
                                    <div className="flex pt-1 border-t border-black/5 dark:border-white/5">
                                      {feedback ? (
                                        <span className="text-[13px] font-semibold text-[#34C759] dark:text-[#34C759]">
                                          {feedback}
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleTrackWaiting(wf, feedbackId)
                                          }
                                          className="px-2 py-1 bg-white dark:bg-[#1C1C1E] hover:bg-[#32ADE6]/10 dark:hover:bg-[#32ADE6]/10 dark:bg-[#64D2FF]/10 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#32ADE6] dark:hover:text-[#32ADE6] font-semibold rounded-lg border border-black/10 dark:border-white/10 text-xs tracking-wide cursor-pointer"
                                        >
                                          ⏳{" "}
                                          {isEn
                                            ? "Track waiting in (D)"
                                            : language === "tr"
                                              ? "(D)'de bekleyen parça"
                                              : "Prebaci na čekanje (D)"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              },
                            )
                          ) : (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center py-4 bg-white/45 dark:bg-[#000000]/30 rounded-xl border border-black/5 dark:border-white/5/40"
                            >
                              <p className="italic text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold">
                                {isEn
                                  ? "No pending blocks on others."
                                  : language === "tr"
                                    ? "Başkalarında bekleyen blok yok."
                                    : "Nema stavki na čekanju."}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-dashed border-black/5 dark:border-white/5">
                        <h4 className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1.5 leading-none">
                          📅{" "}
                          {isEn
                            ? "Future (Not Today)"
                            : language === "tr"
                              ? "Gelecek (Bugün Değil)"
                              : "Dugoročno (Ne za danas)"}
                        </h4>
                        <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                          {parsedData.not_today &&
                          parsedData.not_today.length > 0 ? (
                            parsedData.not_today.map(
                              (nt: string, i: number) => {
                                const feedbackId = `future_${i}`;
                                const feedback = actionFeedback[feedbackId];
                                return (
                                  <div
                                    key={i}
                                    className="p-2 bg-white dark:bg-[#000000] border border-black/5 dark:border-white/5/40 rounded-xl space-y-1.5 text-[13px] font-semibold group"
                                  >
                                    <div className="flex items-center justify-between text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span>📅</span>
                                        <span className="truncate">{nt}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          handleDeleteParsedItem(
                                            "not_today",
                                            i,
                                            e,
                                          )
                                        }
                                        className="p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                        title={
                                          isEn
                                            ? "Mark as reviewed"
                                            : language === "tr"
                                              ? "İncelendi olarak işaretle"
                                              : "Označi kao pregledano (Ukloni)"
                                        }
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#34C759] transition-colors" />
                                      </button>
                                    </div>
                                    <div className="flex pt-1 border-t border-black/5 dark:border-white/5">
                                      {feedback ? (
                                        <span className="text-[13px] font-semibold text-[#34C759] dark:text-[#34C759]">
                                          {feedback}
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSaveFutureTask(nt, feedbackId)
                                          }
                                          className="px-2 py-1 bg-white dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-white/10 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white dark:hover:text-white font-semibold rounded-lg border border-black/10 dark:border-white/10 text-xs tracking-wide cursor-pointer"
                                        >
                                          📅{" "}
                                          {isEn
                                            ? "Add to Backlog (E)"
                                            : language === "tr"
                                              ? "İş Listesine Ekle (E)"
                                              : "Sačuvaj u Backlog (E)"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              },
                            )
                          ) : (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center py-4 bg-white/45 dark:bg-[#000000]/30 rounded-xl border border-black/5 dark:border-white/5/40"
                            >
                              <p className="italic text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold">
                                {isEn
                                  ? "Everything is for immediate focus."
                                  : language === "tr"
                                    ? "Her şey anında odaklanmak içindir."
                                    : "Sve stavke su za neposredan fokus."}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {parsedData.mindset &&
                      !isAnalyzing &&
                      (() => {
                        const isHealthyPattern =
                          parsedData.mindset.pattern
                            .toLowerCase()
                            .includes("healthy") ||
                          parsedData.mindset.pattern
                            .toLowerCase()
                            .includes("zdrav") ||
                          parsedData.mindset.pattern
                            .toLowerCase()
                            .includes("balanced") ||
                          parsedData.mindset.pattern
                            .toLowerCase()
                            .includes("flow") ||
                          parsedData.mindset.pattern
                            .toLowerCase()
                            .includes("berrak") ||
                          parsedData.mindset.confidence < 50;

                        return (
                          <div
                            className={`p-4 sm:p-5 border rounded-xl space-y-4 text-left relative overflow-hidden mt-6 mb-2 shadow-sm transition-all ${
                              isHealthyPattern
                                ? "bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/20 dark:border-emerald-500/10"
                                : "bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5 border-[#FF9500]/25 dark:border-[#FF9F0A]/15"
                            }`}
                          >
                            {/* Header Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[13px] font-semibold self-start w-fit border ${
                                  isHealthyPattern
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {isHealthyPattern ? (
                                  <Award className="w-3.5 h-3.5" />
                                ) : (
                                  <Compass className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {isHealthyPattern
                                    ? isEn
                                      ? "MINDSET REFLECTION: STRENGTHS & CLARITY"
                                      : language === "tr"
                                        ? "ZİHNİYET YANSIMASI: GÜÇLER VE NETLİK"
                                        : "MENTALNI ODRAZ: SNAGA I JASNOĆA"
                                    : isEn
                                      ? "MINDSET REFLECTION: GENTLE AWARENESS"
                                      : language === "tr"
                                        ? "ZİHNİYET YANSIMASI: NAZİK FARKINDALIK"
                                        : "MENTALNI ODRAZ: NEŽNA SVESNOST"}
                                </span>
                              </div>

                              {/* Sub-label confidence / status */}
                              <span className="text-[11px] font-medium text-[#3C3C43]/60 dark:text-[#EBEBF5]/50 uppercase tracking-wider">
                                {isHealthyPattern
                                  ? isEn
                                    ? "Positive Flow State"
                                    : language === "tr"
                                      ? "Pozitif Akış Durumu"
                                      : "Stabilno i fokusirano stanje"
                                  : isEn
                                    ? "Observed Pattern"
                                    : language === "tr"
                                      ? "Gözlemlenen Kalıp"
                                      : "Prepoznat obrazac"}
                              </span>
                            </div>

                            {/* Pattern title & description */}
                            <div className="space-y-1.5 flex flex-col">
                              <h3 className="text-base font-bold text-[#1C1C1E] dark:text-[#FFFFFF] leading-tight flex items-center gap-2">
                                {isHealthyPattern ? (
                                  <span>
                                    {parsedData.mindset.pattern ===
                                      "Healthy Momentum" ||
                                    parsedData.mindset.pattern ===
                                      "Zdrav Zamajac"
                                      ? isEn
                                        ? "Healthy Momentum & Flow"
                                        : language === "tr"
                                          ? "Sağlıklı İvme ve Akış"
                                          : "Zdrav zamajac i slobodan tok"
                                      : parsedData.mindset.pattern}
                                  </span>
                                ) : (
                                  <span>
                                    {parsedData.mindset.pattern ===
                                      "Perfectionism" &&
                                      (isEn
                                        ? "The Protectionist Push (Perfectionism)"
                                        : language === "tr"
                                          ? "Korumacı Baskı (Mükemmeliyetçilik)"
                                          : "Korumacı pritisak - Perfekcionističke težnje")}
                                    {parsedData.mindset.pattern ===
                                      "Self-Doubt" &&
                                      (isEn
                                        ? "The Inner Questioner (Self-Doubt)"
                                        : language === "tr"
                                          ? "İçsel Sorgulayıcı (Kendinden Şüphe)"
                                          : "Unutrašnji upitnik - Zamka sumnje")}
                                    {parsedData.mindset.pattern ===
                                      "Fear of Failure" &&
                                      (isEn
                                        ? "The Safe Haven Mechanism (Fear of Failure)"
                                        : language === "tr"
                                          ? "Güvenli Liman Mekanizması (Başarısızlık Korkusu)"
                                          : "Mehanizam bezbedne zone - Strah od greške")}
                                    {parsedData.mindset.pattern !==
                                      "Perfectionism" &&
                                      parsedData.mindset.pattern !==
                                        "Self-Doubt" &&
                                      parsedData.mindset.pattern !==
                                        "Fear of Failure" &&
                                      parsedData.mindset.pattern}
                                  </span>
                                )}
                              </h3>

                              <p className="text-[13px] text-[#3C3C43]/80 dark:text-[#EBEBF5]/70 leading-relaxed font-sans">
                                {isHealthyPattern
                                  ? isEn
                                    ? "Your mind-state is currently aligned with constructive actions. There is no active mental resistance detected; focus is open and supportive today."
                                    : language === "tr"
                                      ? "Zihin durumunuz şu anda yapıcı eylemlerle uyumlu. Aktif bir bilişsel direnç tespit edilmedi; odaklanmanız bugün açık ve destekleyici."
                                      : "Tvoj mentalni prostor je trenutno usklađen sa konstruktivnim delovanjem. Nema aktivnog kognitivnog otpora; pažnja ti je danas otvorena i stabilna."
                                  : isEn
                                    ? "A gentle reminder that recognizing these automatic thoughts without judging yourself is 80% of the transformation. It is just a protective habit trying to help you in its own way."
                                    : language === "tr"
                                      ? "Kendinizi yargılamadan bu otomatik düşünceleri fark etmenin dönüşümün %80'i olduğunu nazikçe hatırlatırız. Bu sadece kendi yöntemiyle size yardımcı olmaya çalışan koruyucu bir alışkanlıktır."
                                      : "Mali podsetnik da je prepoznavanje ovih automatskih misli bez samoosude već 80% transformacije. To je samo tvoj uobičajeni mehanizam koji na svoj način pokušava da te zaštiti."}
                              </p>
                            </div>

                            {/* Mentor advice card */}
                            <div
                              onClick={() =>
                                setExpandedCard({
                                  type: isEn
                                    ? "AI Mentor Note"
                                    : language === "tr"
                                      ? "Yapay Zeka Mentor Notu"
                                      : "Beleška AI mentora",
                                  title: isEn
                                    ? "Supportive Advice"
                                    : language === "tr"
                                      ? "Destekleyici Tavsiye"
                                      : "Podrška i savet",
                                  description: parsedData.mindset.details,
                                })
                              }
                              className="p-3.5 bg-white dark:bg-[#0c0c0d] border border-black/5 dark:border-white/5 shadow-sm text-[#3C3C43] dark:text-[#EBEBF5]/90 rounded-xl text-xs space-y-1.5 cursor-pointer hover:border-amber-500/30 dark:hover:border-amber-400/20 transition-all group"
                            >
                              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                {isEn
                                  ? "Empathetic Insight:"
                                  : language === "tr"
                                    ? "Empatik İçgörü:"
                                    : "Empatični uvid:"}
                              </span>
                              <p className="text-[#3C3C43]/90 dark:text-[#EBEBF5]/95 leading-relaxed font-medium">
                                {parsedData.mindset.details}
                              </p>
                            </div>

                            {/* TA insight card */}
                            {parsedData.mindset.ta_insight && (
                              <div
                                onClick={() =>
                                  setExpandedCard({
                                    type: isEn
                                      ? "Inner Balance Key"
                                      : language === "tr"
                                        ? "İçsel Denge Anahtarı"
                                        : "Ključ unutrašnjeg balansa",
                                    title: isEn
                                      ? "Somatic Transformation"
                                      : language === "tr"
                                        ? "Somatik Dönüşüm"
                                        : "Svesni pomak",
                                    description: parsedData.mindset.ta_insight,
                                  })
                                }
                                className="p-3.5 bg-[#F2F2F7] dark:bg-[#050505] border border-black/5 dark:border-white/5 text-[#AF52DE] dark:text-[#D894FF] rounded-xl text-xs space-y-1.5 cursor-pointer hover:border-[#AF52DE]/30 transition-all shadow-sm"
                              >
                                <span className="font-semibold text-[#AF52DE] dark:text-[#D894FF] text-xs flex items-center justify-between w-full">
                                  <span className="flex items-center gap-1.5">
                                    <Brain className="w-3.5 h-3.5" />{" "}
                                    {isEn
                                      ? "Internal Workspace Lens"
                                      : language === "tr"
                                        ? "İçsel Çalışma Alanı Merceği"
                                        : "Slojeviti unutrašnji uvid"}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold text-[#AF52DE]/60 dark:text-[#D894FF]/60 bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/15 px-1.5 py-0.5 rounded">
                                    {isEn
                                      ? "View Shift"
                                      : language === "tr"
                                        ? "Bakışı Değiştir"
                                        : "Pogledaj uvid"}
                                  </span>
                                </span>
                                <p className="text-[#3C3C43]/90 dark:text-[#EBEBF5]/80 leading-relaxed font-sans italic">
                                  {parsedData.mindset.ta_insight}
                                </p>
                              </div>
                            )}

                            {/* Action button */}
                            <button
                              onClick={() => {
                                const msg = `[Automatski uvoz iz Sistema] Detektovan obrazac: ${parsedData.mindset.pattern}. Uvid: ${parsedData.mindset.ta_insight}`;
                                safeStorage.setItem(
                                  "abcde_pending_mindset_thoughts",
                                  JSON.stringify([msg]),
                                );
                                safeStorage.setItem(
                                  "abcde_pending_mindset_tab",
                                  "Protocol",
                                );
                                onNavigateToTab("mindset");
                              }}
                              className={`w-full mt-1 py-2 bg-gradient-to-r text-xs font-semibold rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                                isHealthyPattern
                                  ? "from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white"
                                  : "from-[#AF52DE] to-[#8E2DE2] hover:from-[#9B45C9] hover:to-[#7B24C7] active:scale-95 text-white"
                              }`}
                            >
                              <Wand2 className="w-3.5 h-3.5" />
                              {isHealthyPattern
                                ? isEn
                                  ? "Strengthen in Mindset Coach"
                                  : language === "tr"
                                    ? "Zihniyet Yöneticisinde Güçlendir"
                                    : "Ojačaj ovaj zamajac u Mentalnom Mentoru"
                                : isEn
                                  ? "Process in AI Mentor"
                                  : language === "tr"
                                    ? "Yapay Zeka Mentorunda Süreç"
                                    : "Obradi u AI Mentoru"}
                            </button>
                          </div>
                        );
                      })()}

                    {/* COMPREHENSIVE FRAMEWORKS (REBT / PROTOCOL / BIOHACKING) */}
                    {parsedData.frameworks_data && (
                      <div className="pt-2 space-y-4">
                        {/* REBT Framework */}
                        {parsedData.frameworks_data.rebt &&
                          parsedData.frameworks_data.rebt.irrational_belief && (
                            <div className="p-6 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-3.5 text-left animate-in fade-in">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl select-none">🧘</span>
                                <div>
                                  <span className="text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-semibold block select-none uppercase tracking-tight">
                                    {isEn
                                      ? "Mental Reframing"
                                      : language === "tr"
                                        ? "Zihinsel Yeniden Çerçeveleme"
                                        : "Transformacija Misli"}
                                  </span>
                                  <h4 className="text-xs font-semibold text-black dark:text-white tracking-wide">
                                    {isEn
                                      ? "Advanced Mental Reframing & Blockage Removal"
                                      : language === "tr"
                                        ? "Gelişmiş Zihinsel Yeniden Çerçeveleme"
                                        : "Proces Transformacije Blokirajućih Misli"}
                                  </h4>
                                </div>
                              </div>
                              <p className="text-[13px] font-semibold leading-relaxed">
                                {isEn
                                  ? "Deconstruct disabling irrational demands ('musts' & 'shoulds') into constructive, high-resilience commitments."
                                  : language === "tr"
                                    ? "Mantıksız talepleri ('zorunluluklar' ve 'zorunluluklar') yapıcı, yüksek dirençli taahhütlere dönüştürün."
                                    : "Razložite blokirajuće iracionalne zahteve ('moram' i 'trebam') u visoko otporne, realistične akcije."}
                              </p>
                              <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3.5 pt-1.5 pb-2 -mx-5.5 px-5.5 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible md:snap-none select-none font-sans">
                                {/* 1 */}
                                <div
                                  onClick={() =>
                                    setExpandedContent({
                                      title: isEn
                                        ? "The Context"
                                        : language === "tr"
                                          ? "Durum"
                                          : "Trenutna Situacija",
                                      description:
                                        parsedData.frameworks_data.rebt
                                          .activating_event,
                                      bgColor: "bg-white dark:bg-[#000000]",
                                      borderColor:
                                        "border-black/5 dark:border-white/10",
                                      textColor:
                                        "text-[#3C3C43] dark:text-[#EBEBF5]/80",
                                      darkTextColor:
                                        "text-[#3C3C43] dark:text-[#EBEBF5]/80",
                                    })
                                  }
                                  className="w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-white dark:bg-[#000000] border border-black/5 dark:border-white/10 space-y-1 cursor-pointer transition-transform active:scale-95"
                                >
                                  <span className="w-5.5 h-5.5 rounded-lg bg-white dark:bg-[#1C1C1E] shadow-sm text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold text-xs flex items-center justify-center">
                                    <Info className="w-3.5 h-3.5" />
                                  </span>
                                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold">
                                    {isEn
                                      ? "Trigger"
                                      : language === "tr"
                                        ? "Tetikleyici"
                                        : "Trenutna Situacija"}
                                  </p>
                                  <p className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-snug line-clamp-4">
                                    {
                                      parsedData.frameworks_data.rebt
                                        .activating_event
                                    }
                                  </p>
                                </div>
                                {/* 2 */}
                                <div
                                  onClick={() =>
                                    setExpandedContent({
                                      title: isEn
                                        ? "Hidden Block"
                                        : language === "tr"
                                          ? "Gizli Engel"
                                          : "Nesvesna Blokada",
                                      description:
                                        parsedData.frameworks_data.rebt
                                          .irrational_belief,
                                      bgColor:
                                        "bg-[#FF3B30]/5 dark:bg-[#FF453A]/5",
                                      borderColor:
                                        "border-[#FF3B30]/30 dark:border-[#FF453A]/15",
                                      textColor: "text-[#FF3B30]",
                                      darkTextColor:
                                        "text-[#FF3B30] dark:text-[#FF453A]",
                                    })
                                  }
                                  className="w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#FF3B30]/5 dark:bg-[#FF453A]/5 border border-[#FF3B30]/30 dark:border-[#FF453A]/15 space-y-1 cursor-pointer transition-transform active:scale-95"
                                >
                                  <span className="w-5.5 h-5.5 rounded-lg bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] font-semibold text-xs flex items-center justify-center">
                                    <Brain className="w-3.5 h-3.5" />
                                  </span>
                                  <p className="text-[13px] text-[#FF3B30] font-semibold">
                                    {isEn
                                      ? "Block"
                                      : language === "tr"
                                        ? "Engel"
                                        : "Nesvesna Blokada"}
                                  </p>
                                  <p className="text-xs font-medium text-[#FF3B30] dark:text-[#FF453A] leading-snug line-clamp-4">
                                    {
                                      parsedData.frameworks_data.rebt
                                        .irrational_belief
                                    }
                                  </p>
                                </div>
                                {/* 3 */}
                                <div
                                  onClick={() =>
                                    setExpandedContent({
                                      title: isEn
                                        ? "The Friction"
                                        : language === "tr"
                                          ? "Sürtünme"
                                          : "Posledica Blokade",
                                      description:
                                        parsedData.frameworks_data.rebt
                                          .consequences,
                                      bgColor:
                                        "bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5",
                                      borderColor:
                                        "border-[#FF9500]/30 dark:border-[#FF9F0A]/15",
                                      textColor: "text-[#FF9500]",
                                      darkTextColor:
                                        "text-[#FF9500] dark:text-[#FF9F0A]",
                                    })
                                  }
                                  className="w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#FF9500]/5 dark:bg-[#FF9F0A]/5 border border-[#FF9500]/30 dark:border-[#FF9F0A]/15 space-y-1 cursor-pointer transition-transform active:scale-95"
                                >
                                  <span className="w-5.5 h-5.5 rounded-lg bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] font-semibold text-xs flex items-center justify-center">
                                    <Zap className="w-3.5 h-3.5" />
                                  </span>
                                  <p className="text-[13px] text-[#FF9500] font-semibold">
                                    {isEn
                                      ? "Consequence"
                                      : language === "tr"
                                        ? "Sonuç"
                                        : "Posledica Blokade"}
                                  </p>
                                  <p className="text-xs font-medium text-[#FF9500] dark:text-[#FF9F0A] leading-snug line-clamp-4">
                                    {
                                      parsedData.frameworks_data.rebt
                                        .consequences
                                    }
                                  </p>
                                </div>
                                {/* 4 */}
                                <div
                                  onClick={() =>
                                    setExpandedContent({
                                      title: isEn
                                        ? "New Perspective"
                                        : language === "tr"
                                          ? "Yeni Bakış Açısı"
                                          : "Nova Perspektiva",
                                      description: `"${parsedData.frameworks_data.rebt.disputing}"`,
                                      bgColor: "bg-[#007AFF]/5",
                                      borderColor:
                                        "border-black/5 dark:border-white/5",
                                      textColor:
                                        "text-[#007AFF] dark:text-[#0A84FF]",
                                      darkTextColor:
                                        "text-[#007AFF] dark:text-[#0A84FF] italic",
                                    })
                                  }
                                  className="w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#007AFF]/5 border border-black/5 dark:border-white/5 space-y-1 cursor-pointer transition-transform active:scale-95"
                                >
                                  <span className="w-5.5 h-5.5 rounded-lg bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] font-semibold text-xs flex items-center justify-center">
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </span>
                                  <p className="text-[13px] text-[#007AFF] font-semibold">
                                    {isEn
                                      ? "Reframe"
                                      : language === "tr"
                                        ? "Yeniden Çerçeveleme"
                                        : "Nova Perspektiva"}
                                  </p>
                                  <p className="text-xs font-medium text-[#007AFF] dark:text-[#0A84FF] leading-snug italic line-clamp-4">
                                    "{parsedData.frameworks_data.rebt.disputing}
                                    "
                                  </p>
                                </div>
                                {/* 5 */}
                                <div
                                  onClick={() =>
                                    setExpandedContent({
                                      title: isEn
                                        ? "Healthy Clarity"
                                        : language === "tr"
                                          ? "Sağlıklı Netlik"
                                          : "Zdrava Realnost",
                                      description:
                                        parsedData.frameworks_data.rebt
                                          .effective_belief,
                                      bgColor:
                                        "bg-[#34C759]/5 dark:bg-[#30D158]/5",
                                      borderColor:
                                        "border-[#34C759]/30 dark:border-[#30D158]/15",
                                      textColor:
                                        "text-[#34C759] dark:text-[#30D158]",
                                      darkTextColor:
                                        "text-[#34C759] dark:text-[#30D158]",
                                    })
                                  }
                                  className="w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#34C759]/5 dark:bg-[#30D158]/5 border border-[#34C759]/30 dark:border-[#30D158]/15 space-y-1 cursor-pointer transition-transform active:scale-95"
                                >
                                  <span className="w-5.5 h-5.5 rounded-lg bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] font-semibold text-xs flex items-center justify-center">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </span>
                                  <p className="text-[13px] text-[#34C759] font-semibold">
                                    {isEn
                                      ? "Healthy Reality"
                                      : language === "tr"
                                        ? "Sağlıklı Gerçeklik"
                                        : "Zdrava Realnost"}
                                  </p>
                                  <p className="text-xs font-medium text-[#34C759] dark:text-[#30D158] leading-snug line-clamp-4">
                                    {
                                      parsedData.frameworks_data.rebt
                                        .effective_belief
                                    }
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  const msg = `Osećam se blokirano povodom ovoga:\nSituacija: ${parsedData.frameworks_data.rebt.activating_event}\nMentalna prepreka: ${parsedData.frameworks_data.rebt.irrational_belief}\nMožeš li mi pomoći da ovo preoblikujem i rešim?`;
                                  safeStorage.setItem(
                                    "abcde_pending_mindset_thoughts",
                                    JSON.stringify([msg]),
                                  );
                                  safeStorage.setItem(
                                    "abcde_pending_mindset_tab",
                                    "Protocol",
                                  );
                                  onNavigateToTab("mindset");
                                }}
                                className="w-full mt-3 py-2.5 bg-[#007AFF] active:opacity-70 font-semibold rounded-xl text-[13px] text-white text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <Wand2 className="w-4 h-4" />
                                {isEn
                                  ? "Deep-Dive in Omni Coach"
                                  : language === "tr"
                                    ? "Omni Koçuna Derin Bakış"
                                    : "Detaljna AI Analiza"}
                              </button>
                            </div>
                          )}

                        {/* Protocol Framework */}
                        {parsedData.frameworks_data.protocol &&
                          parsedData.frameworks_data.protocol
                            .potential_failure && (
                            <div className="p-6 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-3.5 text-left animate-in fade-in">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl select-none">🛡️</span>
                                <div>
                                  <span className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 font-semibold block select-none">
                                    PRE-MORTEM ANTI-FRAGILITY
                                  </span>
                                  <h4 className="text-xs font-semibold text-black dark:text-white tracking-wide">
                                    {isEn
                                      ? "Anti-Fragility Master Plan"
                                      : language === "tr"
                                        ? "Kırılganlığa Karşı Master Plan"
                                        : "Plan Izdržljivosti i Odbrane"}
                                  </h4>
                                </div>
                              </div>
                              <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3.5 pt-1.5 pb-2 -mx-5.5 px-5.5 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible md:snap-none select-none font-sans">
                                <div
                                  onClick={() =>
                                    setExpandedContent({
                                      title: isEn
                                        ? "What could go wrong?"
                                        : language === "tr"
                                          ? "Ne yanlış gidebilir?"
                                          : "Šta može krenuti po zlu?",
                                      description:
                                        parsedData.frameworks_data.protocol
                                          .potential_failure,
                                      bgColor:
                                        "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10",
                                      borderColor:
                                        "border-[#FF3B30]/20 dark:border-[#FF453A]/20",
                                      textColor: "text-[#FF3B30]",
                                      darkTextColor:
                                        "text-[#FF3B30] dark:text-[#FF3B30]",
                                    })
                                  }
                                  className="w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 border border-[#FF3B30]/20 dark:border-[#FF453A]/20 space-y-1 cursor-pointer transition-transform active:scale-95"
                                >
                                  <p className="text-[13px] text-[#FF3B30] font-semibold">
                                    {isEn
                                      ? "What could go wrong?"
                                      : language === "tr"
                                        ? "Ne yanlış gidebilir?"
                                        : "Šta može krenuti po zlu?"}
                                  </p>
                                  <p className="text-xs font-medium text-[#FF3B30] dark:text-[#FF3B30] leading-snug line-clamp-4">
                                    {
                                      parsedData.frameworks_data.protocol
                                        .potential_failure
                                    }
                                  </p>
                                </div>
                                <div
                                  onClick={() =>
                                    setExpandedContent({
                                      title: isEn
                                        ? "Preventative Action"
                                        : language === "tr"
                                          ? "Önleyici Faaliyet"
                                          : "Preventivna akcija",
                                      description:
                                        parsedData.frameworks_data.protocol
                                          .preventative_action,
                                      bgColor:
                                        "bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20",
                                      borderColor:
                                        "border-black/5 dark:border-white/10",
                                      textColor: "text-[#007AFF]",
                                      darkTextColor:
                                        "text-[#007AFF] dark:text-[#0A84FF]",
                                    })
                                  }
                                  className="w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#007AFF]/10 dark:bg-[#1C1C1E]/20 border border-black/5 dark:border-white/10 space-y-1 cursor-pointer transition-transform active:scale-95"
                                >
                                  <p className="text-[13px] text-[#007AFF] font-semibold">
                                    {isEn
                                      ? "Preventative Action"
                                      : language === "tr"
                                        ? "Önleyici Faaliyet"
                                        : "Preventivna akcija"}
                                  </p>
                                  <p className="text-xs font-medium text-[#007AFF] dark:text-[#0A84FF] leading-snug line-clamp-4">
                                    {
                                      parsedData.frameworks_data.protocol
                                        .preventative_action
                                    }
                                  </p>
                                </div>
                                <div
                                  onClick={() =>
                                    setExpandedContent({
                                      title: isEn
                                        ? "Recovery Plan"
                                        : language === "tr"
                                          ? "Kurtarma Planı"
                                          : "Plan oporavka",
                                      description:
                                        parsedData.frameworks_data.protocol
                                          .recovery_plan,
                                      bgColor:
                                        "bg-[#34C759]/10 dark:bg-[#30D158]/10",
                                      borderColor:
                                        "border-[#34C759]/20 dark:border-[#30D158]/20",
                                      textColor: "text-[#34C759]",
                                      darkTextColor:
                                        "text-[#34C759] dark:text-[#34C759]",
                                    })
                                  }
                                  className="w-[85%] shrink-0 snap-center md:w-auto p-3.5 rounded-xl bg-[#34C759]/10 dark:bg-[#30D158]/10 border border-[#34C759]/20 dark:border-[#30D158]/20 space-y-1 cursor-pointer transition-transform active:scale-95"
                                >
                                  <p className="text-[13px] text-[#34C759] font-semibold">
                                    {isEn
                                      ? "Recovery Plan"
                                      : language === "tr"
                                        ? "Kurtarma Planı"
                                        : "Plan oporavka"}
                                  </p>
                                  <p className="text-xs font-medium text-[#34C759] dark:text-[#34C759] leading-snug line-clamp-4">
                                    {
                                      parsedData.frameworks_data.protocol
                                        .recovery_plan
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* BIOHACKING Framework */}
                        {parsedData.frameworks_data.biohacking &&
                          parsedData.frameworks_data.biohacking
                            .protocol_name && (
                            <div className="p-6 bg-white dark:bg-[#1C1C1E] border border-black/5 shadow-sm dark:border-white/5 rounded-[20px] space-y-3.5 text-left animate-in fade-in">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl select-none">🧬</span>
                                <div>
                                  <span className="text-[13px] text-[#34C759] dark:text-[#34C759] font-semibold block select-none">
                                    PHYSIOLOGICAL PROTOCOL
                                  </span>
                                  <h4 className="text-xs font-semibold text-black dark:text-white tracking-wide">
                                    {isEn
                                      ? "Targeted Biohack"
                                      : language === "tr"
                                        ? "Hedefli Biyolojik Saldırı"
                                        : "Ciljani biohakerski protokol"}
                                  </h4>
                                </div>
                              </div>
                              <div className="mt-3 space-y-3 bg-white dark:bg-[#000000] p-4 border border-black/5 dark:border-white/5 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <span className="bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#34C759] px-2 py-1 rounded-md text-xs font-semibold">
                                    {
                                      parsedData.frameworks_data.biohacking
                                        .protocol_name
                                    }
                                  </span>
                                </div>
                                <div>
                                  <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                    {isEn
                                      ? "Why it helps"
                                      : language === "tr"
                                        ? "Neden yardımcı olur?"
                                        : "Zašto ovo pomaže"}
                                  </p>
                                  <p className="text-sm font-sans italic text-[#3C3C43] dark:text-[#EBEBF5]/80">
                                    "
                                    {
                                      parsedData.frameworks_data.biohacking
                                        .why_it_helps
                                    }
                                    "
                                  </p>
                                </div>
                                <div className="pt-2 border-t border-black/5 dark:border-white/5">
                                  <p className="text-[13px] text-[#007AFF] font-semibold mb-1">
                                    {isEn
                                      ? "How to execute"
                                      : language === "tr"
                                        ? "Nasıl yürütülür"
                                        : "Kako da ovo izvedeš"}
                                  </p>
                                  <p className="text-sm font-semibold text-black dark:text-white whitespace-pre-line leading-relaxed">
                                    {
                                      parsedData.frameworks_data.biohacking
                                        .how_to_do_it
                                    }
                                  </p>
                                </div>
                                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex justify-end">
                                  <button
                                    onClick={() => {
                                      const textToCopy = `${parsedData.frameworks_data.biohacking.protocol_name}\n\n${
                                        isEn ? "Why it helps" : language === "tr" ? "Neden yardımcı olur?" : "Zašto ovo pomaže"
                                      }:\n${parsedData.frameworks_data.biohacking.why_it_helps}\n\n${
                                        isEn ? "How to execute" : language === "tr" ? "Nasıl yürütülür" : "Kako da ovo izvedeš"
                                      }:\n${parsedData.frameworks_data.biohacking.how_to_do_it}`;
                                      navigator.clipboard.writeText(textToCopy);
                                      setCopiedProtocol(true);
                                      setTimeout(() => setCopiedProtocol(false), 2000);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                                  >
                                    {copiedProtocol ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        {isEn ? "Copied!" : language === "tr" ? "Kopyalandı!" : "Kopirano!"}
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        {isEn ? "Copy advice" : language === "tr" ? "Tavsiyeyi kopyala" : "Kopiraj savet"}
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => {
                    if (resetCompletedToday) {
                      setStep(5);
                    } else {
                      setStep(2);
                    }
                  }}
                  className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-center gap-1 cursor-pointer"
                >
                  ← {isEn ? "Back" : language === "tr" ? "Geri" : "Nazad"}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVaultOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 text-amber-600 dark:text-[#FF9500] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    🗄️ {isEn ? "Vault" : language === "tr" ? "Kasa" : "Trezor"}
                  </button>
                  {resetCompletedToday ? (
                    showResetConfirm ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 rounded-xl p-1 animate-in fade-in zoom-in-95 duration-200">
                        <span className="text-[11px] font-bold text-red-600 dark:text-red-400 px-2">
                          {isEn
                            ? "Are you sure?"
                            : language === "tr"
                              ? "Emin misiniz?"
                              : "Sigurni ste?"}
                        </span>
                        <button
                          onClick={() => {
                            handleRestartReset();
                            setShowResetConfirm(false);
                          }}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          {isEn ? "Yes" : language === "tr" ? "Evet" : "Da"}
                        </button>
                        <button
                          onClick={() => setShowResetConfirm(false)}
                          className="px-2.5 py-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] text-black dark:text-white rounded-lg text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-700 transition-all cursor-pointer"
                        >
                          {isEn ? "No" : language === "tr" ? "Hayır" : "Ne"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="px-4 py-2 bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#D1D1D6] dark:hover:bg-[#3A3A3C] text-black dark:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        🔄{" "}
                        {isEn
                          ? "Redo Reset"
                          : language === "tr"
                            ? "Yeniden Sıfırla"
                            : "Ponovi reset"}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleFinalizeReset()}
                      className="px-6 py-2.5 bg-[#E5E5EA] dark:bg-[#FF9F0A] hover:bg-[#1C1C1E] hover:text-white transition-all cursor-pointer text-xs font-semibold text-black dark:text-[#1C1C1E] rounded-xl flex items-center gap-1"
                    >
                      <span>
                        {isEn
                          ? "Finish & Save"
                          : language === "tr"
                            ? "Bitir ve Kaydet"
                            : "Završi i Sačuvaj"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expanded Content Overlay */}
      <AnimatePresence>
        {expandedContent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedContent(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`relative z-10 w-full max-w-sm p-6 rounded-2xl border shadow-2xl bg-white dark:bg-[#1C1C1E] ${expandedContent.borderColor} space-y-4`}
            >
              <h3
                className={`text-lg font-semibold ${expandedContent.textColor}`}
              >
                {expandedContent.title}
              </h3>
              <p
                className={`text-base leading-relaxed max-w-[280px] md:max-w-none break-words text-black dark:text-white`}
              >
                {expandedContent.description}
              </p>
              <button
                onClick={() => setExpandedContent(null)}
                className="mt-6 w-full py-3 bg-black/5 dark:bg-white/10 rounded-xl font-bold text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 active:scale-95 transition-transform"
              >
                {isEn ? "Close" : language === "tr" ? "Kapalı" : "Zatvori"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Vault Side Drawer */}
      <AnimatePresence>
        {vaultOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVaultOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-screen max-w-md md:max-w-xl relative z-10"
            >
              <div className="h-full flex flex-col bg-white dark:bg-[#1C1C1E] shadow-2xl border-l border-black/10 dark:border-white/10 overflow-hidden rounded-l-2xl">
                {/* Header */}
                <div className="p-6 border-b border-black/5 dark:border-white/5 bg-[#F2F2F7] dark:bg-[#000000]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🗄️</span>
                    <div>
                      <h2 className="text-sm font-bold text-black dark:text-white">
                        {isEn
                          ? "Your Archive"
                          : language === "tr"
                            ? "Arşiviniz"
                            : "Tvoja Arhiva"}
                      </h2>
                      <p className="text-[10px] sm:text-[11px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60">
                        {isEn
                          ? "Browse & review past prompts and AI solutions"
                          : language === "tr"
                            ? "Geçmiş istemlere ve yapay zeka çözümlerine göz atın ve inceleyin"
                            : "Pregledajte ranije upite i AI rešenja"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setVaultOpen(false)}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-[#1C1C1E] dark:hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Filters & Search */}
                <div className="p-4 space-y-3 bg-[#EFEFF4]/50 dark:bg-[#121214]/50 border-b border-black/5 dark:border-white/5">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search className="w-3.5 h-3.5 text-[#8E8E93] dark:text-[#EBEBF5]/60" />
                    </span>
                    <input
                      type="text"
                      value={vaultSearch}
                      onChange={(e) => setVaultSearch(e.target.value)}
                      placeholder={
                        isEn
                          ? "Search inside past history..."
                          : language === "tr"
                            ? "Geçmiş tarihin içinde arama yapın..."
                            : "Pretraži u istoriji..."
                      }
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-xl text-[14px] font-medium text-black dark:text-[#EBEBF5]/90 outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] placeholder-[#8E8E93] dark:placeholder-[#EBEBF5]/40 shadow-sm transition-all"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["all", "morning", "nlp", "rebt", "ta", "biohack"].map(
                      (f) => (
                        <button
                          key={f}
                          onClick={() => setVaultFilter(f as any)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                            vaultFilter === f
                              ? "bg-[#007AFF] border-[#007AFF] text-white"
                              : "bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/5 text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white"
                          }`}
                        >
                          {f === "nlp"
                            ? isEn
                              ? "CHAT"
                              : language === "tr"
                                ? "SOHBET"
                                : "RAZGOVOR"
                            : f === "rebt"
                              ? isEn
                                ? "BELIEFS"
                                : language === "tr"
                                  ? "İNANÇLAR"
                                  : "UVERENJA"
                              : f === "ta"
                                ? isEn
                                  ? "MINDMAP"
                                  : language === "tr"
                                    ? "ZİHİN HARİTASI"
                                    : "MAPA UMA"
                                : f === "biohack"
                                  ? isEn
                                    ? "BODY & ENERGY"
                                    : language === "tr"
                                      ? "BEDEN & ENERJİ"
                                      : "TELO I ENERGIJA"
                                  : f === "morning"
                                    ? isEn
                                      ? "MORNING"
                                      : language === "tr"
                                        ? "SABAH"
                                        : "JUTRO"
                                    : f.toUpperCase()}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-white dark:bg-[#1C1C1E] shadow-sm dark:bg-[#000000]/10">
                  {(() => {
                    const items = getAllVaultItems();
                    if (items.length === 0) {
                      return (
                        <div className="text-center py-20">
                          <Layers className="w-10 h-10 mx-auto text-[#8E8E93] dark:text-[#EBEBF5]/60 mb-3" />
                          <p className="mt-3 text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 font-semibold">
                            {isEn
                              ? "No saved prompts match your search."
                              : language === "tr"
                                ? "Aramanızla eşleşen kayıtlı istem yok."
                                : "Nema sačuvanih upita."}
                          </p>
                        </div>
                      );
                    }
                    return items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#2C2C2E]/40 space-y-2.5 shadow-sm text-left"
                      >
                        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 text-[10px] font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-[#1C1C1E] text-black dark:text-white font-bold">
                              {item.label}
                            </span>
                            <span className="font-mono text-[9px]">
                              {item.date}
                            </span>
                            {item.theme && (
                              <span className="text-[9px] text-[#007AFF] uppercase">
                                {item.theme}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                navigator.clipboard
                                  .writeText(
                                    item.userPrompt + "\n\n" + item.aiResponse,
                                  )
                                  .catch(() => {});
                                triggerHaptics("light");
                              }}
                              className="p-1 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-md text-[#8E8E93] dark:text-[#EBEBF5]/60"
                              title="Copy"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVaultItem(item)}
                              className="p-1 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase block">
                            {isEn
                              ? "Your Input:"
                              : language === "tr"
                                ? "Girişiniz:"
                                : "Unos korisnika:"}
                          </span>
                          <p className="text-xs font-semibold text-black dark:text-white whitespace-pre-wrap">
                            {item.userPrompt}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1">
                          <span className="text-[9px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase block">
                            {isEn
                              ? "Agent's Solution:"
                              : language === "tr"
                                ? "Temsilcinin Çözümü:"
                                : "Rešenje Agenta:"}
                          </span>
                          <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed italic whitespace-pre-wrap overflow-hidden">
                            {item.aiResponse}
                          </p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {expandedCard &&
        (() => {
          const safeType =
            typeof expandedCard.type === "string"
              ? expandedCard.type.toLowerCase()
              : "";
          const isWorryCard =
            safeType.includes("briga") ||
            safeType.includes("worry") ||
            safeType.includes("anxiety");
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                <button
                  onClick={() => setExpandedCard(null)}
                  className="absolute top-4 right-4 text-[#8E8E93] hover:text-black dark:text-white dark:hover:text-white transition-colors"
                  id="close-expanded-card"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="mb-4">
                  <div className="text-[12px] font-bold uppercase text-[#FF3B30] mb-1">
                    {expandedCard.type}
                  </div>
                  {expandedCard.title && (
                    <h3 className="text-xl font-bold text-[#8E8E93] dark:text-white leading-tight">
                      {expandedCard.title}
                    </h3>
                  )}
                </div>

                {isWorryCard ? (
                  <div className="space-y-5 text-left">
                    <div className="p-3 bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-xl">
                      <span className="text-[11px] font-bold text-[#FF3B30] uppercase block mb-1">
                        {isEn
                          ? "ANALYZED WORRY:"
                          : language === "tr"
                            ? "ANALİZ EDİLMİŞ ENDİŞE:"
                            : "IDENTIFIKOVANA BRIGA:"}
                      </span>
                      <p className="text-sm font-semibold text-[#8E8E93] dark:text-[#EBEBF5]/60 italic leading-relaxed">
                        "{expandedCard.description}"
                      </p>
                    </div>

                    {!worryCbtChoice && (
                      <div className="space-y-4 text-center">
                        <p className="text-[13px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60">
                          {isEn
                            ? "Does this worry fall under your direct sphere of control?"
                            : language === "tr"
                              ? "Bu endişe doğrudan kontrol alanınıza mı giriyor?"
                              : "Da li ova briga spada pod tvoju direktnu sferu uticaja?"}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setWorryCbtChoice("control");
                              triggerHaptics("medium");
                            }}
                            className="p-3 bg-[#34C759]/10 hover:bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/20 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <span className="text-lg">🟢</span>
                            <span>
                              {isEn
                                ? "Under Control"
                                : language === "tr"
                                  ? "Kontrol Altında"
                                  : "Pod kontrolom"}
                            </span>
                            <span className="text-[10px] opacity-75 font-medium leading-none mt-0.5">
                              {isEn
                                ? "Extremely actionable"
                                : language === "tr"
                                  ? "Son derece uygulanabilir"
                                  : "Mogu da delujem"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWorryCbtChoice("no-control");
                              setWorryBreatheCount(-1);
                              triggerHaptics("medium");
                            }}
                            className="p-3 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/20 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <span className="text-lg">🔵</span>
                            <span>
                              {isEn
                                ? "Outside Control"
                                : language === "tr"
                                  ? "Dış Kontrol"
                                  : "Van kontrole"}
                            </span>
                            <span className="text-[10px] opacity-75 font-medium leading-none mt-0.5">
                              {isEn
                                ? "Practice acceptance"
                                : language === "tr"
                                  ? "Alıştırma kabulü"
                                  : "Treba da prihvatim"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {worryCbtChoice === "no-control" && (
                      <div className="space-y-4">
                        {!worryCbtCompleted ? (
                          <div className="space-y-3.5 p-4 bg-[#007AFF]/5 border border-[#007AFF]/10 rounded-xl text-center">
                            <span className="text-2xl animate-pulse inline-block">
                              🌬️
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-[#007AFF]">
                              {isEn
                                ? "CBT Acceptance & Letting Go"
                                : language === "tr"
                                  ? "TCMB Kabulü ve Bırakma"
                                  : "CBT Prihvatanje i otpuštanje"}
                            </h4>
                            <p className="text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 font-semibold leading-relaxed">
                              {isEn
                                ? "Since you cannot act on this directly, let's consciously release control. Ready for a quick 3-second breathing space?"
                                : language === "tr"
                                  ? "Bu konuda doğrudan harekete geçemeyeceğiniz için, kontrolü bilinçli olarak bırakalım. 3 saniyelik hızlı bir nefes almaya hazır mısınız?"
                                  : "S obzirom na to da na ovo ne možeš uticati direktno, svesno ćemo smiriti um i otpustiti napetost. Da li si spreman za kratku 3-sekundnu pauzu za uzdah?"}
                            </p>
                            {worryBreatheCount === -1 ? (
                              <button
                                type="button"
                                onClick={() => {
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
                                  }, 1000);
                                }}
                                className="mt-2 py-2 px-4 bg-[#007AFF] text-white hover:bg-[#007AFF]/95 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95"
                              >
                                {isEn
                                  ? "Breathe Out & Release"
                                  : language === "tr"
                                    ? "Nefes Verin ve Bırakın"
                                    : "Započni izdah i otpusti"}
                              </button>
                            ) : (
                              <div className="text-lg font-extrabold text-[#007AFF] animate-ping py-2">
                                {worryBreatheCount}...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4 p-4 bg-[#34C759]/5 border border-[#34C759]/10 rounded-xl text-center">
                            <span className="text-xl text-[#3C3C43]">🌿</span>
                            <h4 className="text-sm font-bold text-[#34C759]">
                              {isEn
                                ? "Worry Released"
                                : language === "tr"
                                  ? "Endişe Yayınlandı"
                                  : "Briga uspešno otpuštena"}
                            </h4>
                            <p className="text-xs text-[#8E8E93] font-semibold leading-relaxed">
                              {isEn
                                ? "Splendid! You have consciously acknowledged this worry and chosen to release it. Your mind is secure."
                                : language === "tr"
                                  ? "Görkemli! Bu endişeyi bilinçli olarak kabul ettiniz ve onu salıvermeyi seçtiniz. Zihniniz güvende."
                                  : "Izvanredno! Svesno si prepoznao ovu brigu, shvatio da je van tvoje sfere kontrole i doneo zrelu odluku da je otpustiš."}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptics("success");
                                setExpandedCard(null);
                              }}
                              className="w-full py-2 bg-[#34C759] text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                            >
                              {isEn
                                ? "Done"
                                : language === "tr"
                                  ? "Tamamlamak"
                                  : "Završi"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {worryCbtChoice === "control" && (
                      <div className="space-y-4">
                        {!worryCbtCompleted ? (
                          <div className="space-y-3.5 p-4 bg-[#34C759]/5 border border-[#34C759]/10 rounded-xl text-left">
                            <span className="text-xl">📥</span>
                            <h4 className="text-xs sm:text-sm font-bold text-[#34C759]">
                              {isEn
                                ? "Extract a Small Protective Step"
                                : language === "tr"
                                  ? "Küçük Bir Koruyucu Adım Çıkarın"
                                  : "Pretvori brigu u akciju"}
                            </h4>
                            <p className="text-[11px] text-[#8E8E93] dark:text-[#EBEBF5]/60 font-semibold leading-relaxed">
                              {isEn
                                ? "Don't put the messy worry itself in your task list. Instead, write down ONE clear, positive action step you can take to make progress."
                                : language === "tr"
                                  ? "Dağınık endişenin kendisini görev listenize koymayın. Bunun yerine, ilerleme kaydetmek için atabileceğiniz BİR net, olumlu eylem adımını yazın."
                                  : "Umesto stavljanja cele brige na spisak (što samo stvara stres), zapiši JEDNU malu, sasvim konkretnu aktivnost koju možeš preduzeti u znak preventive."}
                            </p>
                            <input
                              type="text"
                              value={worryActionStep}
                              onChange={(e) =>
                                setWorryActionStep(e.target.value)
                              }
                              placeholder={
                                isEn
                                  ? "E.g. Call dentist tomorrow at 9 AM"
                                  : language === "tr"
                                    ? "Örn. Yarın sabah 9'da dişçiyi ara"
                                    : "Npr: Pozvati automehaničara sutra u 9h"
                              }
                              className="w-full p-2.5 bg-white dark:bg-[#2C2C2E] border border-black/10 dark:border-white/10 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[#34C759]/30 focus:border-[#34C759] text-black dark:text-[#EBEBF5]/90 placeholder-[#8E8E93] dark:placeholder-[#EBEBF5]/40 font-medium shadow-sm transition-all"
                            />
                            <button
                              type="button"
                              disabled={!worryActionStep.trim()}
                              onClick={() => {
                                if (onAddTask) {
                                  onAddTask(
                                    worryActionStep.trim(),
                                    `${isEn ? "Action extracted from worry:" : language === "tr" ? "Endişeden çıkarılan eylem:" : "Preventivna akcija izdvojena iz brige:"} ${expandedCard.description}`,
                                    "B",
                                  );
                                }
                                triggerHaptics("success");
                                setWorryCbtCompleted(true);
                              }}
                              className="w-full py-2.5 bg-[#34C759] text-white disabled:opacity-50 font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <span>📥</span>
                              <span>
                                {isEn
                                  ? "Save Action to Inbox"
                                  : language === "tr"
                                    ? "Eylemi Gelen Kutusuna Kaydet"
                                    : "Sačuvaj akciju u Inbox"}
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                            <span className="text-xl text-[#3C3C43]">🚀</span>
                            <h4 className="text-sm font-bold text-[#34C759]">
                              {isEn
                                ? "Action Saved!"
                                : language === "tr"
                                  ? "İşlem Kaydedildi!"
                                  : "Akcija sačuvana!"}
                            </h4>
                            <p className="text-xs text-[#8E8E93] font-semibold leading-relaxed">
                              {isEn
                                ? "Fantastic! The small step has been placed cleanly in your Inbox, freeing your mind to focus on execution."
                                : language === "tr"
                                  ? "Fantastik! Küçük adım, Gelen Kutunuza temiz bir şekilde yerleştirildi ve zihninizi uygulamaya odaklanma konusunda özgür bıraktı."
                                  : "Savršeno! Konkretan preventivni zadatak je sada u tvom Inboxu. Tvoj um je rasterećen od brige."}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedCard(null);
                              }}
                              className="w-full py-2 bg-[#34C759] text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                            >
                              {isEn
                                ? "Close"
                                : language === "tr"
                                  ? "Kapalı"
                                  : "Zatvori"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {expandedCard.category && (
                        <div className="text-xs font-semibold px-2.5 py-1 bg-black/5 dark:bg-white/5 dark:bg-[#000000]/20 text-[#8E8E93] dark:text-[#EBEBF5]/60 rounded">
                          {isEn
                            ? `Category: ${expandedCard.category}`
                            : language === "tr"
                              ? `Kategori: ${expandedCard.category}`
                              : `Kategorija: ${expandedCard.category}`}
                        </div>
                      )}
                      {expandedCard.duration !== undefined && (
                        <div className="text-xs font-semibold px-2.5 py-1 bg-black/5 dark:bg-white/5 dark:bg-[#000000]/20 text-[#8E8E93] dark:text-[#EBEBF5]/60 rounded">
                          ⏱️ {expandedCard.duration} min
                        </div>
                      )}
                      {expandedCard.complexity !== undefined && (
                        <div className="text-xs font-semibold px-2.5 py-1 bg-black/5 dark:bg-white/5 dark:bg-[#000000]/20 text-[#8E8E93] dark:text-[#EBEBF5]/60 rounded capitalize">
                          🧠{" "}
                          {expandedCard.complexity === "high"
                            ? isEn
                              ? "High effort"
                              : language === "tr"
                                ? "Yüksek efor"
                                : "Visok napor"
                            : expandedCard.complexity === "medium"
                              ? isEn
                                ? "Medium effort"
                                : language === "tr"
                                  ? "Orta efor"
                                  : "Srednji napor"
                              : isEn
                                ? "Low effort"
                                : language === "tr"
                                  ? "Düşük efor"
                                  : "Mali napor"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 text-left">
                      {expandedCard.description && (
                        <div className="text-[#8E8E93] dark:text-[#EBEBF5]/60 text-[15px] leading-relaxed">
                          {expandedCard.description}
                        </div>
                      )}
                      {expandedCard.explanation && (
                        <div className="text-[#8E8E93] dark:text-[#EBEBF5]/60 text-[14px] italic border-l-2 border-black/5 dark:border-white/5 dark:border-black/5 dark:border-white/5 pl-3">
                          {expandedCard.explanation}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/10">
                  <button
                    onClick={() => setExpandedCard(null)}
                    className="w-full py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/5 dark:hover:bg-white dark:bg-[#1C1C1E]/10 rounded-xl font-semibold text-[#8E8E93] dark:text-white transition-colors"
                  >
                    Zatvori
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: "100%", scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: "100%", scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`w-full sm:max-w-2xl max-h-[90vh] flex flex-col rounded-t-[32px] sm:rounded-2xl border-t sm:border shadow-2xl relative overflow-hidden ${
                isEvening
                  ? "bg-[#1C1C1E] border-white/10"
                  : "bg-white dark:bg-[#1C1C1E] shadow-sm border-black/5 dark:border-white/5"
              }`}
            >
              {/* Drag Handle (Mobile only) */}
              <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-black/20 dark:bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 text-[#007AFF] dark:text-[#0A84FF] rounded-xl">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-black dark:text-white">
                      {isEn
                        ? "Brain Dump History"
                        : language === "tr"
                          ? "Beyin Dökümü Tarihi"
                          : "Istorija Unosa"}
                    </h2>
                    <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium">
                      {isEn
                        ? "Your past morning inputs"
                        : language === "tr"
                          ? "Geçmiş sabah girişleriniz"
                          : "Vaši prethodni jutarnji unosi"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 bg-white/50 dark:bg-[#1C1C1E]/50">
                {resetsHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-sm italic">
                      {isEn
                        ? "No past entries found."
                        : language === "tr"
                          ? "Geçmiş giriş bulunamadı."
                          : "Nema prethodnih unosa."}
                    </p>
                  </div>
                ) : (
                  [...resetsHistory].reverse().map((entry, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-[#2C2C2E] border border-black/5 dark:border-white/5 rounded-xl p-4 shadow-sm space-y-3 relative"
                    >
                      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
                        <span className="text-[11px] font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 uppercase tracking-wider">
                          {entry.date}
                        </span>
                        {entry.energyRating && (
                          <span className="text-[11px] font-bold bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-lg">
                            Energy: {entry.energyRating}/10
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#3C3C43] dark:text-[#EBEBF5]/80 whitespace-pre-wrap leading-relaxed">
                        {entry.rawInput ||
                          entry.data?.brainDumpText ||
                          (isEn
                            ? "(No text saved)"
                            : language === "tr"
                              ? "(Metin kaydedilmedi)"
                              : "(Nema sačuvanog teksta)")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Client-side heuristics removed in favor of pure AI Cognitive Engine logic.
