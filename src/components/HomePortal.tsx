import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Target,
  Zap,
  ArrowRight,
  KanbanSquare,
  LayoutGrid,
  BrainCircuit,
  PieChart,
  CheckCircle,
  Check,
  Plus,
  Brain,
  Filter,
  Activity,
  Flame,
  RotateCcw,
  Users,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Info,
  X,
  Compass,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task } from "../types";
import { MorningAIHub } from "./MorningAIHub";
import VoiceInputNode from "./VoiceInputNode";
import { getDiscoveryStats, getUnlockItems, subscribeToDiscovery, triggerDiscoveryEvent } from "../lib/discoveryEngine";
import { safeStorage } from "../lib/safeStorageSetup";

export type TabType =
  | "board"
  | "Vision"
  | "wheel"
  | "pareto"
  | "progress"
  | "braindump_inbox"
  | "dopamine"
  | "mindset"
  | "home"
  | "discovery"
  | "companion";

interface HomePortalProps {
  language: "sr" | "en" | "tr";
  activeTab: TabType;
  onNavigateToTab: (tab: TabType) => void;
  onAddTask?: (
    title: string,
    description: string,
    category: "A" | "B" | "C" | "D" | "E",
  ) => void;
  onAddMultipleTasks?: (newAITasks: any[]) => Promise<void> | void;
  tasksCount: {
    total: number;
    completed: number;
    critical: number;
  };
  isDayLocked?: boolean;
  isEvening?: boolean;
  eveningAdvice?: string;
  eveningWin?: string;
  eveningLoss?: string;
  onSendToMichaelVance?: (text: string) => Promise<void>;
  isBrainDumpProcessing?: boolean;
  tasks: Task[];
  onToggleTask?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onUnlockDay?: () => void;
  currentUser?: any;
  activeAiTone?: string;
}

// Helper to get local YYYY-MM-DD date string consistently
const getLocalTodayStr = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const localNow = new Date(now.getTime() - offsetMs);
  return localNow.toISOString().split("T")[0];
};

export default function HomePortal({
  language,
  activeTab,
  onNavigateToTab,
  tasksCount,
  isEvening = false,
  tasks = [],
  onAddTask,
  onAddMultipleTasks,
  currentUser,
  activeAiTone = "default",
  onToggleTask,
}: HomePortalProps) {
  const isEn = language === "en";

  const [discoveryStats, setDiscoveryStats] = useState(() => getDiscoveryStats());
  const [unlockItems, setUnlockItems] = useState(() => getUnlockItems());

  useEffect(() => {
    const unsubscribe = subscribeToDiscovery(() => {
      setDiscoveryStats(getDiscoveryStats());
      setUnlockItems(getUnlockItems());
    });
    return () => unsubscribe();
  }, []);

  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [guideStep, setGuideStep] = useState<number>(0);

  const actionModules = [
    {
      id: "wheel",
      icon: <PieChart />,
      iconBg: "bg-[#AF52DE] dark:bg-[#BF5AF2]",
      labelEn: "Life Balance Wheel",
      labelSr: "Krug Životnog Balansa",
      labelTr: "Yaşam Dengesi Çemberi",
      descEn: "Assess, visualize, and harmonize key domains of your life",
      descSr: "Analiziraj, vizuelizuj i uskladi ključne sfere života",
      descTr: "Hayatınızın temel alanlarını analiz edin, görselleştirin ve uyumlu hale getirin",
    },
    {
      id: "Vision",
      icon: <Sparkles />,
      iconBg: "bg-[#007AFF] dark:bg-[#0A84FF]",
      labelEn: "Vision Strategy",
      labelSr: "Kreativni Plan",
      labelTr: "Vizyon Stratejisi",
      descEn: "Translate ambitious long-term visions into tactical daily action steps",
      descSr: "Pretvori dugoročne vizije u jasne i ostvarive operativne korake",
      descTr: "İddialı uzun vadeli vizyonları taktiksel günlük eylem adımlarına dönüştürün",
    },
    {
      id: "pareto",
      icon: <Filter />,
      iconBg: "bg-[#FF9500] dark:bg-[#FF9F0A]",
      labelEn: "Pareto 80/20 Leverage",
      labelSr: "Pareto 80/20 Poluge",
      labelTr: "Pareto 80/20 Kaldıracı",
      descEn: "Isolate the critical 20% tasks that generate 80% of your results",
      descSr: "Pronađi i izdvoji ključnih 20% aktivnosti koje donose 80% rezultata",
      descTr: "Sonuçlarınızın %80'ini sağlayan en kritik %20'lik görevleri belirleyin",
    },
    {
      id: "progress",
      icon: <Activity />,
      iconBg: "bg-[#34C759] dark:bg-[#32D74B]",
      labelEn: "Somatic Habit Tracker",
      labelSr: "Somatske Navike",
      labelTr: "Somatik Takipçisi",
      descEn: "Install high-leverage routines and build consistent daily momentum",
      descSr: "Izgradi održive rituale i pokreni stabilan dnevni napredak",
      descTr: "Yüksek kaldıraçlı rutinler oluşturun ve günlük ivme kazanın",
    }
  ];

  const educationModules = [
    {
      id: "dopamine",
      icon: <Flame />,
      iconBg: "bg-[#FF3B30] dark:bg-[#FF453A]",
      labelEn: "Neuro-Energy Monitor",
      labelSr: "Neuro-Energija",
      labelTr: "Nöro-Enerji Monitörü",
      descEn: "Audit daily stimulation and protect your dopamine focus baseline",
      descSr: "Evidentiraj stimulaciju i zaštiti bazni nivo dopamina za zdrav fokus",
      descTr: "Günlük uyarımı denetleyin ve odaklanma için dopamin seviyenizi koruyun",
    },
    {
      id: "mindset",
      icon: <Brain />,
      iconBg: "bg-[#5856D6] dark:bg-[#5E5CE6]",
      labelEn: "Mindset Coach",
      labelSr: "Mentalni Trener",
      labelTr: "Zihniyet Koçu",
      descEn: "Overcome blocks, reframe negative thoughts, and gain absolute clarity",
      descSr: "Prevaziđi mentalne blokade, misaone zamke i razbistri um",
      descTr: "Zihinsel engelleri aşın, olumsuz düşünceleri dönüştürün ve netlik kazanın",
    }
  ];

  const calculateActiveCalendarStreak = () => {
    const savedLogs = safeStorage.getItem("abcde_calendar_logs");
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        let calculatedStreak = 0;
        const today = new Date();
        let currentCheck = new Date();

        while (true) {
          const yyyy = currentCheck.getFullYear();
          const mm = String(currentCheck.getMonth() + 1).padStart(2, "0");
          const dd = String(currentCheck.getDate()).padStart(2, "0");
          const dateKey = `${yyyy}-${mm}-${dd}`;
          const checkedHabits = parsed[dateKey] || [];

          if (checkedHabits.length > 0) {
            calculatedStreak++;
            currentCheck.setDate(currentCheck.getDate() - 1);
          } else {
            // Allow check fallback for today if yesterday was active
            if (
              calculatedStreak === 0 &&
              dateKey ===
                `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
            ) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              currentCheck = yesterday;
              continue;
            }
            break;
          }
        }
        return calculatedStreak;
      } catch (e) {
        console.error("Streak calculation in HomePortal:", e);
      }
    }
    return 0;
  };

  const [streak, setStreak] = useState<number>(() => {
    const calculated = calculateActiveCalendarStreak();
    const saved = safeStorage.getItem("kaizen_focus_streak");
    const timers = safeStorage.getItem("abcde_completed_timers_streak");
    const parsedSaved = saved ? parseInt(saved, 10) : 0;
    const parsedTimers = timers ? parseInt(timers, 10) : 0;
    return Math.max(calculated, parsedSaved, parsedTimers);
  });

  // Re-synchronize when tab becomes home, honoring the maximum of manual and automatic indices
  useEffect(() => {
    const savedLogsStreak = calculateActiveCalendarStreak();
    const saved = safeStorage.getItem("kaizen_focus_streak"); // Manual adjustment
    const timersStreak = safeStorage.getItem("abcde_completed_timers_streak"); // System auto-increment from Pomodoros
    const parsedSaved = saved ? parseInt(saved, 10) : 0;
    const parsedTimers = timersStreak ? parseInt(timersStreak, 10) : 0;

    // We want the absolute max of what they've manually set, organically achieved via calendar, or organically via timers
    const bestStreak = Math.max(savedLogsStreak, parsedSaved, parsedTimers);
    setStreak(bestStreak);
  }, [activeTab]);

  const updateStreak = (newVal: number) => {
    const clamped = Math.max(0, newVal);
    setStreak(clamped);
    safeStorage.setItem("kaizen_focus_streak", clamped.toString());
  };

  const currentHour = new Date().getHours();
  let greeting = isEn ? "Good Morning" : language === "tr" ? "Günaydın" : "Dobro Jutro";
  if (currentHour >= 12 && currentHour < 18) {
    greeting = isEn ? "Good Afternoon" : language === "tr" ? "Tünaydın" : "Dobar Dan";
  } else if (currentHour >= 18 || currentHour < 4) {
    greeting = isEn ? "Good Evening" : language === "tr" ? "İyi akşamlar" : "Dobro Veče";
  }

  const [isEditingName, setIsEditingName] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);
  const [userName, setUserName] = useState<string>(() => {
    return safeStorage.getItem("user_display_name") || "";
  });

  const userDispName =
    currentUser?.displayName ||
    userName ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "");

  const saveName = () => {
    setUserName(userName);
    safeStorage.setItem("user_display_name", userName);
    setIsEditingName(false);
  };

  const [agentState, setAgentState] = useState<{
    loading: boolean;
    input: string;
    advice: string | null;
    moduleToOpen: TabType | null;
  }>({ loading: false, input: "", advice: null, moduleToOpen: null });

  // Track active morning step to conditionally display widgets based on HIG focus principles
  const [morningStep, setMorningStep] = useState<number>(() => {
    const todayStr = getLocalTodayStr();
    const saved = safeStorage.getItem(`kaizen_morning_reset_data_${todayStr}`);
    const savedStep = safeStorage.getItem("kaizen_morning_active_step");
    if (savedStep) {
      const parsed = parseInt(savedStep, 10);
      if (parsed === 5 && !saved) {
        return 1;
      }
      return parsed;
    }
    return saved ? 5 : 1;
  });

  const [showMoreTools, setShowMoreTools] = useState(false);
  const [isMorningResetActive, setIsMorningResetActive] = useState(false);
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [initialBrainDumpForHub, setInitialBrainDumpForHub] = useState<string>("");
  const [initialStepForHub, setInitialStepForHub] = useState<number>(1);

  const [dailyFocus, setDailyFocus] = useState<string>(() => {
    return safeStorage.getItem("kaizen_custom_daily_focus") || "";
  });
  const [isDailyFocusCompleted, setIsDailyFocusCompleted] = useState<boolean>(() => {
    return safeStorage.getItem("kaizen_custom_daily_focus_completed") === "true";
  });

  const handleSaveDailyFocus = (text: string) => {
    const trimmed = text.trim();
    setDailyFocus(trimmed);
    setIsDailyFocusCompleted(false);
    safeStorage.setItem("kaizen_custom_daily_focus", trimmed);
    safeStorage.setItem("kaizen_custom_daily_focus_completed", "false");
  };

  const handleToggleDailyFocus = () => {
    const nextCompleted = !isDailyFocusCompleted;
    setIsDailyFocusCompleted(nextCompleted);
    safeStorage.setItem("kaizen_custom_daily_focus_completed", String(nextCompleted));
    if (nextCompleted) {
      triggerDiscoveryEvent("task_completed", { source: "daily_focus" });
    }
  };

  const handleResetDailyFocus = () => {
    setDailyFocus("");
    setIsDailyFocusCompleted(false);
    safeStorage.setItem("kaizen_custom_daily_focus", "");
    safeStorage.setItem("kaizen_custom_daily_focus_completed", "false");
  };

  // Filter active high-impact tasks (Categories A and B)
  const highImpactTasks = tasks.filter((t) => t.category === "A" || t.category === "B");
  const activeHighImpactTasks = highImpactTasks.filter((t) => !t.done);
  const sortedFocusTasks = [...highImpactTasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.category !== b.category) return a.category === "A" ? -1 : 1;
    return (a.subPriority || 0) - (b.subPriority || 0);
  });

  // Limit home focus view to strictly the top 3 tasks to prevent cognitive overload
  const displayedFocusTasks = sortedFocusTasks.filter(t => !t.done).slice(0, 3);
  const completedFocusTasks = sortedFocusTasks.filter(t => t.done);
  
  // If no uncompleted focus tasks, show the recently completed ones
  const finalTasksToDisplay = displayedFocusTasks.length > 0 
    ? displayedFocusTasks 
    : completedFocusTasks.slice(0, 2);

  const handleAgentSubmit = () => {
    if (!agentState.input.trim()) return;
    setInitialBrainDumpForHub(agentState.input);
    setInitialStepForHub(2); // Go straight to step 2 (Energy & Pleasantness assessment) inside MorningAIHub
    setIsMorningResetActive(true);
    // Clear input after taking them to the hub
    setAgentState((prev) => ({ ...prev, input: "" }));
  };

  return (
    <div
      className="max-w-2xl mx-auto space-y-8 select-none text-left"
      id="home-portal-root"
    >
      {/* 1. WELCOME BANNER - HIG Clear Hierarchy */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="pt-6 pb-2 space-y-1 px-4 sm:px-0"
      >
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#8E8E93] dark:text-[#EBEBF5]/60 flex items-center gap-1.5">
          {greeting},{" "}
          {isEditingName ? (
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
              }}
              autoFocus
              className="bg-transparent border-b border-[#007AFF] text-[#007AFF] dark:text-[#0A84FF] outline-none normal-case"
              placeholder={isEn ? "Your name" : language === "tr" ? "Adınız" : "Vaše ime"}
            />
          ) : (
            <span
              className={`cursor-pointer hover:opacity-85 transition-opacity normal-case ${!userDispName ? "italic opacity-60" : ""}`}
              onClick={() => setIsEditingName(true)}
            >
              {userDispName || (isEn ? "Enter your name" : language === "tr" ? "Adınızı girin" : "Unesite ime")}
            </span>
          )}
        </h2>
        <h1 className="text-[32px] font-bold tracking-[-0.5px] text-black dark:text-white leading-tight">
          {isEvening 
            ? (isEn ? "Evening Reflection" : language === "tr" ? "Akşam Yansıması" : "Večernja refleksija") 
            : (isEn ? "Today's Focus" : language === "tr" ? "Bugünün Odağı" : "Današnji fokus")
          }
        </h1>
      </motion.div>

      {/* ACTIVE FOCUSED RESET OVERLAY / MODE */}
      <AnimatePresence mode="wait">
        {isMorningResetActive ? (
          <motion.div
            key="morning-reset-focus-mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full relative z-20 shadow-lg dark:shadow-none bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-[24px] overflow-hidden"
          >
            <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 py-3 flex items-center justify-between border-b border-black/5 dark:border-white/5">
              <span className="text-xs font-bold tracking-wider uppercase text-[#8E8E93] dark:text-[#EBEBF5]/60 flex items-center gap-1.5">
                🎯 {language === "en" ? "FOCUSED MORNING RESET" : language === "tr" ? "ODAKLANMIŞ SABAH RESET" : "FOKUSIRANI JUTARNJI RESET"}
              </span>
              <button
                type="button"
                onClick={() => setIsMorningResetActive(false)}
                className="text-[13px] font-bold text-[#007AFF] dark:text-[#0A84FF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4 shrink-0" />
                <span>{language === "en" ? "Close & Back" : language === "tr" ? "Kapat ve Dön" : "Zatvori i vrati se"}</span>
              </button>
            </div>
            
            <MorningAIHub
              language={language}
              tasks={tasks || []}
              onAddTask={onAddTask || (() => {})}
              onAddMultipleTasks={onAddMultipleTasks}
              onNavigateToTab={onNavigateToTab}
              isEvening={isEvening}
              onStepChange={(step) => {
                setMorningStep(step);
              }}
              activeAiTone={activeAiTone}
              initialBrainDump={initialBrainDumpForHub}
              initialStep={initialStepForHub}
            />
          </motion.div>
        ) : (
          <motion.div
            key="serene-home-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {!showModuleSelector ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-12"
              >
                {/* 2. MINIMALIST BRAIN DUMP HERO SECTION (Perfect mental temple) */}
                <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[32px] p-6 sm:p-10 shadow-xs flex flex-col space-y-6">
                  {!agentState.advice ? (
                    <div className="w-full space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/10 dark:bg-[#0A84FF]/10 flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF]">
                          <Brain className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="text-left">
                          <h2 className="text-lg font-bold tracking-tight text-black dark:text-white">
                            {language === "en" ? "Clear Your Mind (Brain Dump)" : language === "tr" ? "Zihnini Boşalt (Brain Dump)" : "Oslobodi Um (Brain Dump)"}
                          </h2>
                          <p className="text-xs text-[#8E8E93] dark:text-[#EBEBF5]/60 font-medium">
                            {language === "en" ? "De-clutter your thoughts instantly. Write freely, then let AI structure your day." : language === "tr" ? "Düşüncelerinizi anında temizleyin. Özgürce yazın, ardından yapay zekanın gününüzü yapılandırmasına izin verin." : "Očisti glavu u sekundi. Piši slobodno, pa pusti AI da ti organizuje dan."}
                          </p>
                        </div>
                      </div>

                      <div className="relative group">
                        <textarea
                          value={agentState.input}
                          onChange={(e) => setAgentState((prev) => ({ ...prev, input: e.target.value }))}
                          placeholder={
                            language === "en" 
                              ? "What is on your mind right now? Tasks, ideas, worries, or simple notes... write everything down without holding back." 
                              : language === "tr" 
                                ? "Şu an aklınızda ne var? Görevler, fikirler, endişeler veya basit notlar... kendinizi sınırlamadan her şeyi yazın." 
                                : "Šta ti je na umu u ovom trenutku? Zadaci, ideje, brige ili obične beleške... zapiši baš sve bez ustručavanja."
                          }
                          rows={9}
                          className="w-full bg-[#F2F2F7]/40 dark:bg-[#2C2C2E]/30 border border-black/5 dark:border-white/5 rounded-2xl p-5 pr-14 text-[15px] leading-relaxed text-black dark:text-white placeholder:text-[#8E8E93]/80 focus:border-[#007AFF] dark:focus:border-[#0A84FF] focus:bg-white dark:focus:bg-[#1C1C1E] outline-none transition-all resize-none shadow-xs focus:ring-4 focus:ring-[#007AFF]/10 dark:focus:ring-[#0A84FF]/10 font-sans"
                          disabled={agentState.loading}
                        />
                        <VoiceInputNode 
                          onTranscript={(text) => setAgentState((prev) => ({ ...prev, input: prev.input + text }))} 
                          language={language}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 bg-[#F2F2F7]/50 dark:bg-[#2C2C2E]/40 px-2.5 py-1 rounded-full">
                          {agentState.input.length} {language === "en" ? "chars" : language === "tr" ? "karakter" : "karaktera"}
                        </span>
                        <button
                          type="button"
                          onClick={handleAgentSubmit}
                          disabled={agentState.loading || !agentState.input.trim()}
                          className="px-6 py-3 bg-[#007AFF] hover:bg-[#0062CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0] disabled:opacity-35 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          {agentState.loading ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>{language === "en" ? "Analyzing..." : language === "tr" ? "Analiz ediliyor..." : "Analiza..."}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 fill-white" />
                              <span>{language === "en" ? "Process & Organize" : language === "tr" ? "İşle ve Organize Et" : "Procesiraj i organizuj"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-5 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 flex items-center justify-center text-[#34C759]">
                          <Sparkles className="w-5 h-5 fill-current animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-black dark:text-white">
                            {language === "en" ? "AI Cognitive Guidance" : language === "tr" ? "Yapay Zeka Bilişsel Sentezi" : "Smernica Veštačke Inteligencije"}
                          </h3>
                          <p className="text-[10px] text-[#8E8E93] dark:text-[#EBEBF5]/60">
                            {language === "en" ? "Based on your brain dump synthesis" : language === "tr" ? "Zihin boşaltma sentezinize dayanarak" : "Zasnovano na analizi vašeg oslobađanja uma"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#F2F2F7]/50 dark:bg-[#2C2C2E]/40 border border-black/5 dark:border-white/5 rounded-2xl p-4">
                        <p className="text-[13px] leading-relaxed text-black dark:text-gray-200 font-medium">
                          {agentState.advice}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        {agentState.moduleToOpen && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToTab(agentState.moduleToOpen!);
                              // Auto clear advice after opening to keep clean
                              setAgentState((prev) => ({ ...prev, advice: null, input: "" }));
                            }}
                            className="px-4 py-2.5 bg-[#007AFF] hover:bg-[#0062CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0] text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <ArrowRight className="w-4 h-4" />
                            <span>
                              {language === "en" 
                                ? `Open ${String(agentState.moduleToOpen).toUpperCase()}` 
                                : language === "tr" 
                                  ? `${String(agentState.moduleToOpen).toUpperCase()} Modülünü Aç` 
                                  : `Otvori ${String(agentState.moduleToOpen).toUpperCase()}`}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setAgentState({ loading: false, input: "", advice: null, moduleToOpen: null })}
                          className="px-3.5 py-2.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-[#3A3A3C] dark:text-gray-300 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          {language === "en" ? "New Brain Dump" : language === "tr" ? "Yeni Zihin Boşaltma" : "Novi Brain Dump"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generous aesthetic negative space ("prazno prazno prazno") */}
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-black/15 dark:bg-white/15" />
                </div>

                {/* Button that leads to choosing other modules of the app, clearly named */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowModuleSelector(true)}
                    className="px-10 py-4.5 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-2xl text-[14px] font-bold tracking-tight shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2.5"
                  >
                    <LayoutGrid className="w-4.5 h-4.5" />
                    <span>
                      {language === "en" 
                        ? "Choose App Module" 
                        : language === "tr" 
                          ? "Uygulama Modülü Seçin" 
                          : "Izaberi modul aplikacije"}
                    </span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Clearly labeled headers with a retro Back button */}
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                  <span className="text-xs font-black tracking-wider uppercase text-[#8E8E93] dark:text-[#EBEBF5]/60">
                    {language === "en" ? "CHOOSE APP MODULE" : language === "tr" ? "UYGULAMA MODÜLÜ SEÇİN" : "IZBOR MODULA APLIKACIJE"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowModuleSelector(false)}
                    className="text-xs font-bold text-[#007AFF] dark:text-[#0A84FF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{language === "en" ? "Back" : language === "tr" ? "Geri" : "Nazad na praznu stranu"}</span>
                  </button>
                </div>

                {/* Elegant grid of clearly named modules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sunrise Morning Reset module */}
                  <div 
                    onClick={() => {
                      setInitialBrainDumpForHub("");
                      setInitialStepForHub(1);
                      setIsMorningResetActive(true);
                    }}
                    className="p-5.5 bg-gradient-to-br from-[#007AFF]/5 to-[#AF52DE]/5 hover:from-[#007AFF]/10 hover:to-[#AF52DE]/10 border border-[#007AFF]/15 dark:border-[#0A84FF]/20 rounded-[28px] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all text-left group flex flex-col justify-between min-h-[140px]"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#AF52DE] text-white flex items-center justify-center mb-3.5 shadow-sm">
                        <Sparkles className="w-4.5 h-4.5 fill-white" />
                      </div>
                      <h4 className="text-[15px] font-bold text-black dark:text-white group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors">
                        {language === "en" ? "🌅 Morning Reset & Brain Dump" : language === "tr" ? "🌅 Sabah Resetleme ve Zihin Boşaltma" : "🌅 Jutarnji Reset & Brain Dump"}
                      </h4>
                      <p className="text-[12px] text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-1.5 leading-normal">
                        {language === "en" 
                          ? "De-clutter thoughts and isolate high-impact targets with AI coach." 
                          : language === "tr" 
                            ? "Zihni boşaltın ve yapay zeka koçu ile yüksek etkili görevleri bulun." 
                            : "Uklonite mentalni šum i definišite visoko-uticajne zadatke uz AI koča."}
                      </p>
                    </div>
                  </div>

                  {/* Rest of the clearly named modules */}
                  {actionModules.map((mod) => (
                    <div 
                      key={mod.id}
                      onClick={() => onNavigateToTab(mod.id as any)}
                      className="p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 rounded-[28px] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all text-left group flex flex-col justify-between min-h-[140px]"
                    >
                      <div>
                        <div className={`w-10 h-10 rounded-xl ${mod.iconBg} text-white flex items-center justify-center mb-3.5 shadow-xs`}>
                          {React.cloneElement(mod.icon as React.ReactElement<any>, { className: "w-4.5 h-4.5" })}
                        </div>
                        <h4 className="text-[15px] font-bold text-black dark:text-white group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors">
                          {language === "en" ? mod.labelEn : language === "tr" ? mod.labelTr : mod.labelSr}
                        </h4>
                        <p className="text-[12px] text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-1.5 leading-normal">
                          {language === "en" ? mod.descEn : language === "tr" ? mod.descTr : mod.descSr}
                        </p>
                      </div>
                    </div>
                  ))}

                  {educationModules.map((mod) => (
                    <div 
                      key={mod.id}
                      onClick={() => onNavigateToTab(mod.id as any)}
                      className="p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 rounded-[28px] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all text-left group flex flex-col justify-between min-h-[140px]"
                    >
                      <div>
                        <div className={`w-10 h-10 rounded-xl ${mod.iconBg} text-white flex items-center justify-center mb-3.5 shadow-xs`}>
                          {React.cloneElement(mod.icon as React.ReactElement<any>, { className: "w-4.5 h-4.5" })}
                        </div>
                        <h4 className="text-[15px] font-bold text-black dark:text-white group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors">
                          {language === "en" ? mod.labelEn : language === "tr" ? mod.labelTr : mod.labelSr}
                        </h4>
                        <p className="text-[12px] text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-1.5 leading-normal">
                          {language === "en" ? mod.descEn : language === "tr" ? mod.descTr : mod.descSr}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Discovery Lab and rewards */}
                  <div 
                    onClick={() => onNavigateToTab("discovery")}
                    className="p-5.5 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 rounded-[28px] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all text-left group flex flex-col justify-between min-h-[140px]"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#AF52DE] text-white flex items-center justify-center mb-3.5 shadow-xs">
                        <Compass className="w-4.5 h-4.5" />
                      </div>
                      <h4 className="text-[15px] font-bold text-black dark:text-white group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors">
                        {language === "en" ? "🧪 Discovery Lab & Rewards" : language === "tr" ? "🧪 Keşif Laboratuvarı ve Ödüller" : "🧪 Istraživačka Laboratorija"}
                      </h4>
                      <p className="text-[12px] text-[#8E8E93] dark:text-[#EBEBF5]/60 mt-1.5 leading-normal">
                        {language === "en" 
                          ? "Unlock custom themes, auditory options, and system profiles." 
                          : language === "tr" 
                            ? "Özel temaların, yapay zeka tonlarının ve profillerin kilidini açın." 
                            : "Otključajte unikatne teme, specifične AI glasove i profile rada."}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
