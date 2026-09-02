import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
  Wind,
  Moon,
  Sparkles,
  Info,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import type { AppALanguage } from "../../types";
import {
  type ResetExperienceId,
  type ResetSessionStatus,
  calculateBoxTiming,
  calculateLongerExhaleTiming,
  calculateDoubleInhaleTiming,
  calculateGuidedRestTiming,
} from "./resetTimingEngine";
import { RESET_LOCALIZATION } from "./resetLocalization";
import { lightChimeSynth } from "./lightChimeSynth";
import {
  BoxVisualizer,
  CircleExpander,
  DoubleInhaleVisualizer,
  GuidedRestVisualizer,
} from "./ResetVisualizers";

interface ResetSessionsProps {
  language: AppALanguage;
}

export default function ResetSessions({ language }: ResetSessionsProps) {
  const [selectedExperience, setSelectedExperience] = useState<ResetExperienceId | null>(null);
  const [sessionStatus, setSessionStatus] = useState<ResetSessionStatus>("idle");
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Experience configuration
  const [boxTargetCycles, setBoxTargetCycles] = useState<number>(12); // 4 (1:04), 8 (2:08), 12 (3:12) cycles default
  const [durationPresetMs, setDurationPresetMs] = useState<number>(180000); // 1 or 3 min default for Exhale
  const [doubleInhaleTargetCycles, setDoubleInhaleTargetCycles] = useState<number>(3); // 3 cycles for Double Inhale

  // Monotonic Timing State
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimestampRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastPhaseIdRef = useRef<string | null>(null);
  const hasCompletedRef = useRef(false);

  // Reduced motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  const loc = useMemo(() => RESET_LOCALIZATION[language] || RESET_LOCALIZATION.en, [language]);
  const tCommon = loc.common;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      lightChimeSynth.cleanup();
    };
  }, []);

  // Total session target duration in milliseconds
  const totalDurationMs = useMemo(() => {
    if (selectedExperience === "balanced_box") {
      return boxTargetCycles * 16000; // 4 cycles = 64s, 8 cycles = 128s, 12 cycles = 192s (3:12)
    }
    if (selectedExperience === "longer_exhale") {
      return durationPresetMs; // 60s (1m) or 180s (3m)
    }
    if (selectedExperience === "double_inhale") {
      return doubleInhaleTargetCycles * 10000; // 10s per cycle
    }
    if (selectedExperience === "guided_rest") {
      return 600000; // 10 minutes (600s)
    }
    return 192000;
  }, [selectedExperience, boxTargetCycles, durationPresetMs, doubleInhaleTargetCycles]);

  // Handle session completion
  const handleComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setSessionStatus("completed");
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (soundEnabled) {
      lightChimeSynth.playPhaseChime("complete");
    }
  }, [soundEnabled]);

  // Main animation frame loop (monotonic timestamp based)
  useEffect(() => {
    if (sessionStatus !== "running") {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    const step = (timestamp: number) => {
      if (startTimestampRef.current === null) {
        startTimestampRef.current = timestamp;
      }

      const currentRunElapsed = timestamp - startTimestampRef.current;
      const totalCurrentElapsed = accumulatedMsRef.current + currentRunElapsed;

      if (totalCurrentElapsed >= totalDurationMs) {
        setElapsedMs(totalDurationMs);
        handleComplete();
        return;
      }

      setElapsedMs(totalCurrentElapsed);
      animationFrameIdRef.current = requestAnimationFrame(step);
    };

    animationFrameIdRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [sessionStatus, totalDurationMs, handleComplete]);

  // Calculate current timing metrics
  const timingState = useMemo(() => {
    if (selectedExperience === "balanced_box") {
      return calculateBoxTiming(elapsedMs, totalDurationMs);
    }
    if (selectedExperience === "longer_exhale") {
      return calculateLongerExhaleTiming(elapsedMs, totalDurationMs);
    }
    if (selectedExperience === "double_inhale") {
      return calculateDoubleInhaleTiming(elapsedMs, doubleInhaleTargetCycles);
    }
    if (selectedExperience === "guided_rest") {
      return calculateGuidedRestTiming(elapsedMs, totalDurationMs);
    }
    return calculateBoxTiming(0, 180000);
  }, [selectedExperience, elapsedMs, totalDurationMs, doubleInhaleTargetCycles]);

  // Trigger phase chimes upon phase boundary crossing
  useEffect(() => {
    if (sessionStatus !== "running" || !soundEnabled) return;

    let currentPhaseKey = "";
    let chimeType: "inhale" | "hold" | "exhale" | "stage" = "inhale";

    if (selectedExperience === "balanced_box") {
      const box = timingState as ReturnType<typeof calculateBoxTiming>;
      currentPhaseKey = `${box.cycle}_${box.phase}`;
      if (box.phase === "inhale") chimeType = "inhale";
      else if (box.phase === "hold_full" || box.phase === "hold_empty") chimeType = "hold";
      else chimeType = "exhale";
    } else if (selectedExperience === "longer_exhale") {
      const exh = timingState as ReturnType<typeof calculateLongerExhaleTiming>;
      currentPhaseKey = `${exh.cycle}_${exh.phase}`;
      chimeType = exh.phase === "inhale" ? "inhale" : "exhale";
    } else if (selectedExperience === "double_inhale") {
      const dbl = timingState as ReturnType<typeof calculateDoubleInhaleTiming>;
      currentPhaseKey = `${dbl.cycle}_${dbl.phase}`;
      chimeType = dbl.phase === "exhale" ? "exhale" : "inhale";
    } else if (selectedExperience === "guided_rest") {
      const rst = timingState as ReturnType<typeof calculateGuidedRestTiming>;
      currentPhaseKey = `stage_${rst.stage}`;
      chimeType = "stage";
    }

    if (lastPhaseIdRef.current !== currentPhaseKey) {
      if (lastPhaseIdRef.current !== null) {
        lightChimeSynth.playPhaseChime(chimeType);
      }
      lastPhaseIdRef.current = currentPhaseKey;
    }
  }, [selectedExperience, timingState, sessionStatus, soundEnabled]);

  // User control handlers
  const handleSelectExperience = (id: ResetExperienceId) => {
    setSelectedExperience(id);
    setSessionStatus("idle");
    setElapsedMs(0);
    accumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    lastPhaseIdRef.current = null;
    hasCompletedRef.current = false;

    if (id === "balanced_box") setBoxTargetCycles(12);
    if (id === "longer_exhale") setDurationPresetMs(180000);
    if (id === "double_inhale") setDoubleInhaleTargetCycles(3);
  };

  const handleStart = () => {
    if (soundEnabled) {
      lightChimeSynth.init();
    }
    hasCompletedRef.current = false;
    lastPhaseIdRef.current = null;
    accumulatedMsRef.current = elapsedMs;
    startTimestampRef.current = null;
    setSessionStatus("running");
  };

  const handlePause = () => {
    setSessionStatus("paused");
    accumulatedMsRef.current = elapsedMs;
    startTimestampRef.current = null;
  };

  const handleResume = () => {
    if (soundEnabled) {
      lightChimeSynth.init();
    }
    accumulatedMsRef.current = elapsedMs;
    startTimestampRef.current = null;
    setSessionStatus("running");
  };

  const handleRestart = () => {
    setSessionStatus("idle");
    setElapsedMs(0);
    accumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    lastPhaseIdRef.current = null;
    hasCompletedRef.current = false;
  };

  const handleStop = () => {
    setSessionStatus("idle");
    setSelectedExperience(null);
    setElapsedMs(0);
    accumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    lastPhaseIdRef.current = null;
    hasCompletedRef.current = false;
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      lightChimeSynth.init();
      lightChimeSynth.playPhaseChime("inhale");
    }
  };

  // Get human phase description for the active screen
  const currentPhaseDescription = useMemo(() => {
    if (!selectedExperience) return "";
    const expLoc = loc[
      selectedExperience === "balanced_box"
        ? "balancedBox"
        : selectedExperience === "longer_exhale"
        ? "longerExhale"
        : selectedExperience === "double_inhale"
        ? "doubleInhale"
        : "guidedRest"
    ];

    if (selectedExperience === "balanced_box") {
      const box = timingState as ReturnType<typeof calculateBoxTiming>;
      if (box.phase === "inhale") return expLoc.phaseInhale;
      if (box.phase === "hold_full") return expLoc.phaseHoldFull;
      if (box.phase === "exhale") return expLoc.phaseExhale;
      return expLoc.phaseHoldEmpty;
    }
    if (selectedExperience === "longer_exhale") {
      const exh = timingState as ReturnType<typeof calculateLongerExhaleTiming>;
      return exh.phase === "inhale" ? expLoc.phaseInhale : expLoc.phaseExhale;
    }
    if (selectedExperience === "double_inhale") {
      const dbl = timingState as ReturnType<typeof calculateDoubleInhaleTiming>;
      if (dbl.phase === "first_inhale") return expLoc.phaseFirstInhale;
      if (dbl.phase === "topup_inhale") return expLoc.phaseTopupInhale;
      return expLoc.phaseExhale;
    }
    if (selectedExperience === "guided_rest") {
      const rst = timingState as ReturnType<typeof calculateGuidedRestTiming>;
      if (rst.stage === "settle") return expLoc.stageSettle;
      if (rst.stage === "body_attention") return expLoc.stageBodyAttention;
      if (rst.stage === "quiet_rest") return expLoc.stageQuietRest;
      return expLoc.stageGradualReturn;
    }
    return "";
  }, [selectedExperience, timingState, loc]);

  return (
    <section
      id="app-a-reset-sessions"
      className="mx-auto mt-7 w-full max-w-[760px] px-5 pb-2 sm:px-6"
      aria-labelledby="reset-sessions-heading"
    >
      {/* Header & Subtitle */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="reset-sessions-heading"
            className="text-[19px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
          >
            {tCommon.sectionTitle}
          </h2>
          <p className="mt-0.5 text-[14px] leading-relaxed text-[#555558] dark:text-[#a1a1a6]">
            {tCommon.sectionSubtitle}
          </p>
        </div>

        {/* Global Sound & Motion Badges */}
        <div className="flex items-center gap-2">
          {prefersReducedMotion && (
            <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium text-[#555558] dark:bg-white/10 dark:text-[#a1a1a6]">
              {tCommon.reducedMotionBadge}
            </span>
          )}
          <button
            type="button"
            id="app-a-reset-sound-toggle"
            onClick={toggleSound}
            aria-label={soundEnabled ? tCommon.soundOn : tCommon.soundOff}
            className="app-a-focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-black/5 dark:border-white/15 dark:text-[#f5f5f7] dark:hover:bg-white/5"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-[#0071e3] dark:text-[#2997ff]" />
                <span>{tCommon.soundOn}</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-[#76767b] dark:text-[#7c7c82]" />
                <span>{tCommon.soundOff}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Surface Container */}
      <div className="app-a-surface p-4 sm:p-6">
        {/* VIEW 1: EXPERIENCE SELECTION GRID */}
        {!selectedExperience ? (
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Option A: Balanced Box */}
              <button
                type="button"
                id="reset-card-box"
                onClick={() => handleSelectExperience("balanced_box")}
                className="app-a-focus-ring flex flex-col justify-between rounded-2xl border border-black/10 p-4 text-left transition-all hover:border-[#0071e3]/40 hover:bg-[#0071e3]/[0.02] dark:border-white/15 dark:hover:border-[#2997ff]/40 dark:hover:bg-[#2997ff]/[0.02]"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#0071e3] dark:text-[#2997ff]">
                    <Square className="h-4 w-4" />
                    <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {loc.balancedBox.name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-[#555558] dark:text-[#a1a1a6]">
                    {loc.balancedBox.shortDesc}
                  </p>
                </div>
                <span className="mt-3 inline-block text-[11px] font-medium text-[#76767b] dark:text-[#7c7c82]">
                  4–12 Cycles (1:04–3:12) • 4-4-4-4
                </span>
              </button>

              {/* Option B: Gentle Longer Exhale */}
              <button
                type="button"
                id="reset-card-exhale"
                onClick={() => handleSelectExperience("longer_exhale")}
                className="app-a-focus-ring flex flex-col justify-between rounded-2xl border border-black/10 p-4 text-left transition-all hover:border-[#0071e3]/40 hover:bg-[#0071e3]/[0.02] dark:border-white/15 dark:hover:border-[#2997ff]/40 dark:hover:bg-[#2997ff]/[0.02]"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#0071e3] dark:text-[#2997ff]">
                    <Wind className="h-4 w-4" />
                    <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {loc.longerExhale.name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-[#555558] dark:text-[#a1a1a6]">
                    {loc.longerExhale.shortDesc}
                  </p>
                </div>
                <span className="mt-3 inline-block text-[11px] font-medium text-[#76767b] dark:text-[#7c7c82]">
                  4s Inhale • 6s Exhale
                </span>
              </button>

              {/* Option C: Short Double-Inhale Reset */}
              <button
                type="button"
                id="reset-card-double-inhale"
                onClick={() => handleSelectExperience("double_inhale")}
                className="app-a-focus-ring flex flex-col justify-between rounded-2xl border border-black/10 p-4 text-left transition-all hover:border-[#1a7f37]/40 hover:bg-[#1a7f37]/[0.02] dark:border-white/15 dark:hover:border-[#34c759]/40 dark:hover:bg-[#34c759]/[0.02]"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#1a7f37] dark:text-[#34c759]">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {loc.doubleInhale.name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-[#555558] dark:text-[#a1a1a6]">
                    {loc.doubleInhale.shortDesc}
                  </p>
                </div>
                <span className="mt-3 inline-block text-[11px] font-medium text-[#76767b] dark:text-[#7c7c82]">
                  1–3 Guided Cycles
                </span>
              </button>

              {/* Option D: Guided Deep Rest */}
              <button
                type="button"
                id="reset-card-guided-rest"
                onClick={() => handleSelectExperience("guided_rest")}
                className="app-a-focus-ring flex flex-col justify-between rounded-2xl border border-black/10 p-4 text-left transition-all hover:border-[#0071e3]/40 hover:bg-[#0071e3]/[0.02] dark:border-white/15 dark:hover:border-[#2997ff]/40 dark:hover:bg-[#2997ff]/[0.02]"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#0071e3] dark:text-[#2997ff]">
                    <Moon className="h-4 w-4" />
                    <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {loc.guidedRest.name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-[#555558] dark:text-[#a1a1a6]">
                    {loc.guidedRest.shortDesc}
                  </p>
                </div>
                <span className="mt-3 inline-block text-[11px] font-medium text-[#76767b] dark:text-[#7c7c82]">
                  10 Minutes • Text-guided
                </span>
              </button>
            </div>

            {/* Comfort & Safety Note */}
            <div className="mt-5 rounded-xl bg-black/[0.03] p-3.5 text-[12px] leading-relaxed text-[#555558] dark:bg-white/[0.04] dark:text-[#a1a1a6]">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#76767b] dark:text-[#7c7c82]" />
                <div>
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {tCommon.safetyBannerTitle}:
                  </span>{" "}
                  {tCommon.safetyBannerText}
                </div>
              </div>
            </div>
          </div>
        ) : sessionStatus === "completed" ? (
          /* VIEW 2: COMPLETION SCREEN */
          <div className="py-6 text-center" role="status" aria-live="polite">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1a7f37]/10 text-[#1a7f37] dark:bg-[#34c759]/20 dark:text-[#34c759]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-[20px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {tCommon.completedTitle}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[#555558] dark:text-[#a1a1a6]">
              {tCommon.completedSubtitle}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                id="reset-completed-restart-btn"
                onClick={handleRestart}
                className="app-a-secondary-button app-a-focus-ring gap-2 px-4 py-2"
              >
                <RotateCcw className="h-4 w-4" />
                {tCommon.restart}
              </button>
              <button
                type="button"
                id="reset-completed-return-btn"
                onClick={handleStop}
                className="app-a-primary-button app-a-focus-ring gap-2 px-5 py-2"
              >
                {tCommon.completedReturnButton}
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 3: ACTIVE / PAUSED / IDLE SESSION INTERFACE */
          <div role="timer" aria-live="polite" className="text-center">
            {/* Top Navigation & Title */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                id="reset-back-btn"
                onClick={handleStop}
                className="app-a-focus-ring inline-flex items-center gap-1.5 text-[13px] font-medium text-[#555558] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{tCommon.completedReturnButton}</span>
              </button>

              <span className="text-[13px] font-semibold uppercase tracking-wider text-[#76767b] dark:text-[#7c7c82]">
                {selectedExperience === "balanced_box" && loc.balancedBox.name}
                {selectedExperience === "longer_exhale" && loc.longerExhale.name}
                {selectedExperience === "double_inhale" && loc.doubleInhale.name}
                {selectedExperience === "guided_rest" && loc.guidedRest.name}
              </span>
            </div>

            {/* Preset Selector (Visible before starting) */}
            {sessionStatus === "idle" && selectedExperience === "balanced_box" && (
              <div className="mb-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  id="preset-box-4-btn"
                  onClick={() => setBoxTargetCycles(4)}
                  className={`app-a-focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium border ${
                    boxTargetCycles === 4
                      ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3] dark:border-[#2997ff] dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
                      : "border-black/10 text-[#555558] dark:border-white/15 dark:text-[#a1a1a6]"
                  }`}
                >
                  {tCommon.presetBox4}
                </button>
                <button
                  type="button"
                  id="preset-box-8-btn"
                  onClick={() => setBoxTargetCycles(8)}
                  className={`app-a-focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium border ${
                    boxTargetCycles === 8
                      ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3] dark:border-[#2997ff] dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
                      : "border-black/10 text-[#555558] dark:border-white/15 dark:text-[#a1a1a6]"
                  }`}
                >
                  {tCommon.presetBox8}
                </button>
                <button
                  type="button"
                  id="preset-box-12-btn"
                  onClick={() => setBoxTargetCycles(12)}
                  className={`app-a-focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium border ${
                    boxTargetCycles === 12
                      ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3] dark:border-[#2997ff] dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
                      : "border-black/10 text-[#555558] dark:border-white/15 dark:text-[#a1a1a6]"
                  }`}
                >
                  {tCommon.presetBox12}
                </button>
              </div>
            )}

            {sessionStatus === "idle" && selectedExperience === "longer_exhale" && (
              <div className="mb-5 flex justify-center gap-2">
                <button
                  type="button"
                  id="preset-1min-btn"
                  onClick={() => setDurationPresetMs(60000)}
                  className={`app-a-focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium border ${
                    durationPresetMs === 60000
                      ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3] dark:border-[#2997ff] dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
                      : "border-black/10 text-[#555558] dark:border-white/15 dark:text-[#a1a1a6]"
                  }`}
                >
                  {tCommon.preset1Min}
                </button>
                <button
                  type="button"
                  id="preset-3min-btn"
                  onClick={() => setDurationPresetMs(180000)}
                  className={`app-a-focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium border ${
                    durationPresetMs === 180000
                      ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3] dark:border-[#2997ff] dark:bg-[#2997ff]/15 dark:text-[#2997ff]"
                      : "border-black/10 text-[#555558] dark:border-white/15 dark:text-[#a1a1a6]"
                  }`}
                >
                  {tCommon.preset3Min}
                </button>
              </div>
            )}

            {sessionStatus === "idle" && selectedExperience === "double_inhale" && (
              <div className="mb-5 flex justify-center gap-2">
                {[1, 2, 3].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    id={`preset-cycles-${cnt}-btn`}
                    onClick={() => setDoubleInhaleTargetCycles(cnt)}
                    className={`app-a-focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium border ${
                      doubleInhaleTargetCycles === cnt
                        ? "border-[#1a7f37] bg-[#1a7f37]/10 text-[#1a7f37] dark:border-[#34c759] dark:bg-[#34c759]/15 dark:text-[#34c759]"
                        : "border-black/10 text-[#555558] dark:border-white/15 dark:text-[#a1a1a6]"
                    }`}
                  >
                    {tCommon.presetCycles(cnt)}
                  </button>
                ))}
              </div>
            )}

            {/* VISUALIZER PRESENTATION */}
            <div className="my-3">
              {selectedExperience === "balanced_box" && (
                <BoxVisualizer
                  phase={(timingState as ReturnType<typeof calculateBoxTiming>).phase}
                  phaseElapsedMs={(timingState as ReturnType<typeof calculateBoxTiming>).phaseElapsedMs}
                  phaseDurationMs={(timingState as ReturnType<typeof calculateBoxTiming>).phaseDurationMs}
                  prefersReducedMotion={prefersReducedMotion}
                  phaseLabel={currentPhaseDescription}
                  countdownSec={Math.ceil(
                    (timingState as ReturnType<typeof calculateBoxTiming>).phaseRemainingMs / 1000
                  )}
                />
              )}

              {selectedExperience === "longer_exhale" && (
                <CircleExpander
                  phase={(timingState as ReturnType<typeof calculateLongerExhaleTiming>).phase}
                  phaseElapsedMs={(timingState as ReturnType<typeof calculateLongerExhaleTiming>).phaseElapsedMs}
                  phaseDurationMs={(timingState as ReturnType<typeof calculateLongerExhaleTiming>).phaseDurationMs}
                  prefersReducedMotion={prefersReducedMotion}
                  phaseLabel={currentPhaseDescription}
                  countdownSec={Math.ceil(
                    (timingState as ReturnType<typeof calculateLongerExhaleTiming>).phaseRemainingMs / 1000
                  )}
                />
              )}

              {selectedExperience === "double_inhale" && (
                <DoubleInhaleVisualizer
                  phase={(timingState as ReturnType<typeof calculateDoubleInhaleTiming>).phase}
                  phaseElapsedMs={(timingState as ReturnType<typeof calculateDoubleInhaleTiming>).phaseElapsedMs}
                  phaseDurationMs={(timingState as ReturnType<typeof calculateDoubleInhaleTiming>).phaseDurationMs}
                  prefersReducedMotion={prefersReducedMotion}
                  phaseLabel={currentPhaseDescription}
                  countdownSec={Math.ceil(
                    (timingState as ReturnType<typeof calculateDoubleInhaleTiming>).phaseRemainingMs / 1000
                  )}
                />
              )}

              {selectedExperience === "guided_rest" && (
                <GuidedRestVisualizer
                  stage={(timingState as ReturnType<typeof calculateGuidedRestTiming>).stage}
                  stageIndex={(timingState as ReturnType<typeof calculateGuidedRestTiming>).stageIndex}
                  stageRemainingMs={(timingState as ReturnType<typeof calculateGuidedRestTiming>).stageRemainingMs}
                  totalRemainingMs={totalDurationMs - elapsedMs}
                  stageDescription={currentPhaseDescription}
                />
              )}
            </div>

            {/* Active Cycle / Remaining Stats */}
            {selectedExperience !== "guided_rest" && (
              <div className="mt-3 flex items-center justify-center gap-6 text-[13px] text-[#555558] dark:text-[#a1a1a6]">
                <span>
                  {tCommon.cycleLabel}:{" "}
                  <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {timingState.isComplete
                      ? selectedExperience === "balanced_box"
                        ? boxTargetCycles
                        : selectedExperience === "double_inhale"
                        ? doubleInhaleTargetCycles
                        : (timingState as { cycle?: number }).cycle || 1
                      : (timingState as { cycle?: number }).cycle || 1}
                  </strong>
                  {selectedExperience === "balanced_box" && (
                    <span className="text-[#76767b] dark:text-[#7c7c82]"> / {boxTargetCycles}</span>
                  )}
                  {selectedExperience === "double_inhale" && (
                    <span className="text-[#76767b] dark:text-[#7c7c82]"> / {doubleInhaleTargetCycles}</span>
                  )}
                </span>
                <span>
                  {tCommon.remainingLabel}:{" "}
                  <strong className="font-semibold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {(() => {
                      const totalSec = Math.max(0, Math.ceil((totalDurationMs - elapsedMs) / 1000));
                      const mins = Math.floor(totalSec / 60);
                      const secs = totalSec % 60;
                      return `${mins}:${secs.toString().padStart(2, "0")}`;
                    })()}
                  </strong>
                </span>
              </div>
            )}

            {/* Interaction Buttons */}
            <div className="mt-6 flex items-center justify-center gap-3">
              {sessionStatus === "idle" && (
                <button
                  type="button"
                  id="reset-start-btn"
                  onClick={handleStart}
                  className="app-a-primary-button app-a-focus-ring gap-2 px-6 py-2.5 text-[15px] font-semibold"
                >
                  <Play className="h-4 w-4" />
                  {tCommon.start}
                </button>
              )}

              {sessionStatus === "running" && (
                <button
                  type="button"
                  id="reset-pause-btn"
                  onClick={handlePause}
                  className="app-a-primary-button app-a-focus-ring gap-2 px-5 py-2.5 text-[15px] font-semibold"
                >
                  <Pause className="h-4 w-4" />
                  {tCommon.pause}
                </button>
              )}

              {sessionStatus === "paused" && (
                <button
                  type="button"
                  id="reset-resume-btn"
                  onClick={handleResume}
                  className="app-a-primary-button app-a-focus-ring gap-2 px-5 py-2.5 text-[15px] font-semibold"
                >
                  <Play className="h-4 w-4" />
                  {tCommon.resume}
                </button>
              )}

              {sessionStatus !== "idle" && (
                <button
                  type="button"
                  id="reset-restart-btn"
                  onClick={handleRestart}
                  className="app-a-secondary-button app-a-focus-ring gap-1.5 px-4 py-2.5 text-[14px]"
                >
                  <RotateCcw className="h-4 w-4" />
                  {tCommon.restart}
                </button>
              )}

              <button
                type="button"
                id="reset-stop-btn"
                onClick={handleStop}
                className="app-a-secondary-button app-a-focus-ring gap-1.5 px-4 py-2.5 text-[14px]"
              >
                {tCommon.stop}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
