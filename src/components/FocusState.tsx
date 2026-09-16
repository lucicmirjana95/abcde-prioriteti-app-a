import { useState, useEffect, useRef } from "react";
import { Task } from "../types";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Clock,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { translations, Language } from "../translations";
import { triggerDiscoveryEvent } from "../lib/discoveryEngine";

interface FocusStateProps {
  nextTask: Task | null;
  onCompleteTask: (id: string) => void;
  language: Language;
}

export default function FocusState({
  nextTask,
  onCompleteTask,
  language,
}: FocusStateProps) {
  const [focusDuration, setFocusDuration] = useState(25);
  const POMODORO_BREAK_SECS = 5 * 60;

  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const t = translations[language];

  // Keep timer synced when duration changes while paused
  useEffect(() => {
    if (!isActive && mode === "focus") {
      setTimerSeconds(focusDuration * 60);
    }
  }, [focusDuration, isActive, mode]);

  // Auto-switch mode when timer resets on completion
  const handleTimerComplete = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (mode === "focus") {
      // 1. Trigger Discovery Lab event instead of pet rewards
      triggerDiscoveryEvent("task_completed", { source: "focus_timer" });
      triggerDiscoveryEvent("pomodoro_completed", { duration: focusDuration });

      // 2. Micro-Habit Stacking Engine sync (Connection 5)
      const oldStreak = Number(
        safeStorage.getItem("abcde_completed_timers_streak") || "0",
      );
      safeStorage.setItem(
        "abcde_completed_timers_streak",
        String(oldStreak + 1),
      );

      // If we completed a focus timer on an A1 task, auto-log habit "priority_a" for today
      if (nextTask && nextTask.category === "A" && nextTask.subPriority === 1) {
        try {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          const dateStr = `${yyyy}-${mm}-${dd}`;

          const savedLogs = safeStorage.getItem("abcde_calendar_logs");
          const logs = savedLogs ? JSON.parse(savedLogs) : {};
          if (!logs[dateStr]) logs[dateStr] = [];
          if (!logs[dateStr].includes("priority_a")) {
            logs[dateStr].push("priority_a");
            safeStorage.setItem("abcde_calendar_logs", JSON.stringify(logs));
          }
        } catch (e) {
          console.error("Habit tracking error in Focus Complete: ", e);
        }
      }

      // 3. Dispatch global sync event so companion and habitat update instantly
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("companion-sync"));
      window.dispatchEvent(new Event("trigger-adrenaline"));

      setMode("break");
      setTimerSeconds(POMODORO_BREAK_SECS);
    } else {
      setMode("focus");
      setTimerSeconds(focusDuration * 60);
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimeout(() => handleTimerComplete(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimerSeconds(
      mode === "focus" ? focusDuration * 60 : POMODORO_BREAK_SECS,
    );
  };

  const skipBreak = () => {
    setIsActive(false);
    setMode("focus");
    setTimerSeconds(focusDuration * 60);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!nextTask) {
    return (
      <div
        className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-xl p-6 text-center font-sans h-full flex flex-col items-center justify-center min-h-[280px]"
        id="focus-empty"
      >
        <div className="p-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-full border border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-3">
          <Check className="w-8 h-8" />
        </div>
        <h3 className="text-black dark:text-white font-medium text-lg">
          {t.emptyFocusTitle}
        </h3>
        <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-sm mt-1 max-w-xs mx-auto">
          {t.emptyFocusDesc}
        </p>
      </div>
    );
  }

  const isA = nextTask.category === "A";
  const isB = nextTask.category === "B";
  const isC = nextTask.category === "C";
  const isD = nextTask.category === "D";
  const isE = nextTask.category === "E";

  return (
    <div
      className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 border-l-4 border-l-amber-500 rounded-xl p-6 font-sans relative overflow-hidden h-full flex flex-col justify-between"
      id={`focus-task-spotlight-${nextTask.id}`}
    >
      {/* Background ambient pulse if timer is active */}
      {isActive && (
        <div className="absolute inset-0 bg-[#FF9500] dark:bg-[#FF9F0A]/[0.03] transition-opacity pointer-events-none" />
      )}

      <div>
        <div className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="transition-opacity absolute inline-flex h-full w-full rounded-full bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500] dark:bg-[#FF9F0A]"></span>
            </span>
            <span className="text-xs text-[#FF9500] font-medium">
              {t.currentMainFocus}
            </span>
          </div>

          <div
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isA
                ? "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20"
                : isB
                  ? "bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 text-[#FF9500] dark:text-[#FF9F0A] border border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
                  : isC
                    ? "bg-[#34C759]/10 dark:bg-[#30D158]/10 text-[#34C759] dark:text-[#30D158] border border-[#34C759]/20 dark:border-[#30D158]/20"
                    : isD
                      ? "bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF] border border-black/5 dark:border-white/5"
                      : "bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 dark:border-[#FF453A]/20"
            }`}
          >
            {t.priority} {nextTask.category}
            {nextTask.subPriority}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-medium text-black dark:text-white leading-snug">
            {nextTask.title}
          </h2>
          {nextTask.description && (
            <p className="text-[#3C3C43] dark:text-[#EBEBF5]/80 text-sm leading-relaxed max-w-xl">
              {nextTask.description}
            </p>
          )}

          {/* Quick rule guidance snippet */}
          <div className="pt-2 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 flex items-start gap-1">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#FF9500]" />
            <span>
              {isA && t.ruleDetails.A}
              {isB && t.ruleDetails.B}
              {isC && t.ruleDetails.C}
              {isD &&
                t.ruleDetails.D.replace(
                  "{delegatedTo}",
                  nextTask.delegatedTo || t.ruleDetails.defaultD,
                )}
              {isE &&
                t.ruleDetails.E.replace(
                  "{reason}",
                  nextTask.eliminationReason || t.ruleDetails.defaultE,
                )}
            </span>
          </div>

          {nextTask.aiExplanation && (
            <div className="mt-3 text-[13px] font-sans text-[#34C759] dark:text-[#30D158] bg-[#34C759]/10 dark:bg-[#30D158]/10 p-2.5 rounded-xl border border-[#34C759]/20 dark:border-[#30D158]/20 flex items-start gap-1">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 text-[#34C759] shrink-0" />
              <span>
                <strong>{t.aiAnalysisLabel}</strong> {nextTask.aiExplanation}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timer & Completion area */}
      <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Timer Section */}
        <div className="flex items-center gap-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] p-2 rounded-xl border border-black/5 dark:border-white/5 shrink-0 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 px-1">
            <Clock
              className={`w-4 h-4 ${isActive ? (mode === "focus" ? "text-[#FF9500]" : "text-[#34C759]") + " animate-spin" : "text-[#3C3C43] dark:text-[#EBEBF5]/80"}`}
            />
            <span
              className={`text-base font-medium ${mode === "break" ? "text-[#34C759]" : "text-black dark:text-white"}`}
            >
              {formatTime(timerSeconds)}
            </span>
            <span className="text-[11px] uppercase tracking-normal font-bold text-[#8E8E93] dark:text-[#EBEBF5]/60 ml-1">
              {mode === "break"
                ? language === "en" ? "BREAK" : language === "tr" ? "KIRMAK" : "PAUZA"
                : "FOCUS"}
            </span>
          </div>
          {mode === "focus" && !isActive && (
            <div className="flex items-center gap-1 ml-2 mr-2 border-l border-r border-[#E5E5EA] dark:border-[#3A3A3C] px-2 h-6">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setIsActive(false);
                    setFocusDuration(mins);
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${focusDuration === mins ? "bg-[#FF9500]/20 text-[#FF9500]" : "text-[#8E8E93] dark:text-[#EBEBF5]/60 hover:text-black dark:text-white dark:hover:text-white"}`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTimer}
              className="p-1.5 hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]/50 rounded text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-black dark:text-white transition-all cursor-pointer"
              id="btn-timer-toggle"
              title={isActive ? t.pause : t.startFocus}
            >
              {isActive ? (
                <Pause className="w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" />
              ) : (
                <Play className="w-4 h-4 text-[#34C759]" />
              )}
            </button>
            <button
              onClick={resetTimer}
              className="p-1.5 hover:bg-[#E5E5EA] dark:bg-[#3A3A3C]/50 rounded text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 transition-all cursor-pointer"
              id="btn-timer-reset"
              title={t.resetTimer}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center w-full md:w-auto gap-2">
          {mode === "break" && (
            <button
              onClick={skipBreak}
              className="flex-1 md:flex-none border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white dark:bg-[#1C1C1E]/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 font-medium px-4 py-2.5 rounded-xl transition-all cursor-pointer text-sm"
              id={`btn-skip-break-${nextTask.id}`}
            >
              {language === "en" ? "Skip Break" : language === "tr" ? "Arayı Atla" : "Preskoči pauzu"}
            </button>
          )}
          {/* Big Done Button */}
          <button
            onClick={() => {
              setIsActive(false);
              onCompleteTask(nextTask.id);
            }}
            className="flex-1 md:flex-none bg-[#1C1C1E] hover:bg-black/80 dark:bg-[#1C1C1E] text-white font-medium px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-[1.01]"
            id={`btn-complete-focus-${nextTask.id}`}
          >
            <Check className="w-5 h-5 stroke-[3]" /> {t.finishPriority}
          </button>
        </div>
      </div>
    </div>
  );
}
