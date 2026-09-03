import React from "react";

interface BoxVisualizerProps {
  phase: "inhale" | "hold_full" | "exhale" | "hold_empty";
  phaseElapsedMs: number;
  phaseDurationMs: number;
  prefersReducedMotion: boolean;
  phaseLabel: string;
  countdownSec: number;
}

/**
 * Accessible Square-Path Visualization for Balanced Box (4-4-4-4).
 * 
 * Side 0 (Top, left to right): Inhale (0–4s)
 * Side 1 (Right, top to bottom): Hold Full (4–8s)
 * Side 2 (Bottom, right to left): Exhale (8–12s)
 * Side 3 (Left, bottom to top): Hold Empty (12–16s)
 */
export function BoxVisualizer({
  phase,
  phaseElapsedMs,
  phaseDurationMs,
  prefersReducedMotion,
  phaseLabel,
  countdownSec,
}: BoxVisualizerProps) {
  const size = 220;
  const strokeWidth = 6;
  const padding = 20;
  const sideLength = size - padding * 2; // 180px

  const progress = Math.min(1, Math.max(0, phaseElapsedMs / phaseDurationMs));

  // Compute marker (x, y) along square sides
  let markerX = padding;
  let markerY = padding;

  if (phase === "inhale") {
    // Top side: (padding, padding) -> (padding + sideLength, padding)
    markerX = padding + sideLength * progress;
    markerY = padding;
  } else if (phase === "hold_full") {
    // Right side: (padding + sideLength, padding) -> (padding + sideLength, padding + sideLength)
    markerX = padding + sideLength;
    markerY = padding + sideLength * progress;
  } else if (phase === "exhale") {
    // Bottom side: (padding + sideLength, padding + sideLength) -> (padding, padding + sideLength)
    markerX = padding + sideLength * (1 - progress);
    markerY = padding + sideLength;
  } else {
    // Left side: (padding, padding + sideLength) -> (padding, padding)
    markerX = padding;
    markerY = padding + sideLength * (1 - progress);
  }

  // Active side highlight
  const side0Active = phase === "inhale";
  const side1Active = phase === "hold_full";
  const side2Active = phase === "exhale";
  const side3Active = phase === "hold_empty";
  const breathScale = prefersReducedMotion
    ? 0.86
    : phase === "inhale"
      ? 0.68 + 0.26 * progress
      : phase === "hold_full"
        ? 0.94
        : phase === "exhale"
          ? 0.94 - 0.26 * progress
          : 0.68;

  return (
    <div className="relative mx-auto flex h-[240px] w-[240px] items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        {/* Background Base Square */}
        <rect
          x={padding}
          y={padding}
          width={sideLength}
          height={sideLength}
          rx="12"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/10 dark:text-white/10"
        />

        {/* 4 Active Side Overlays */}
        {/* Side 0: Inhale (Top) */}
        <line
          x1={padding + 12}
          y1={padding}
          x2={padding + sideLength - 12}
          y2={padding}
          stroke="currentColor"
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          className={`transition-colors duration-300 ${
            side0Active ? "text-[#0071e3] dark:text-[#2997ff]" : "text-transparent"
          }`}
        />
        {/* Side 1: Hold Full (Right) */}
        <line
          x1={padding + sideLength}
          y1={padding + 12}
          x2={padding + sideLength}
          y2={padding + sideLength - 12}
          stroke="currentColor"
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          className={`transition-colors duration-300 ${
            side1Active ? "text-[#0071e3] dark:text-[#2997ff]" : "text-transparent"
          }`}
        />
        {/* Side 2: Exhale (Bottom) */}
        <line
          x1={padding + sideLength - 12}
          y1={padding + sideLength}
          x2={padding + 12}
          y2={padding + sideLength}
          stroke="currentColor"
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          className={`transition-colors duration-300 ${
            side2Active ? "text-[#0071e3] dark:text-[#2997ff]" : "text-transparent"
          }`}
        />
        {/* Side 3: Hold Empty (Left) */}
        <line
          x1={padding}
          y1={padding + sideLength - 12}
          x2={padding}
          y2={padding + 12}
          stroke="currentColor"
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          className={`transition-colors duration-300 ${
            side3Active ? "text-[#0071e3] dark:text-[#2997ff]" : "text-transparent"
          }`}
        />

        {/* Moving Progress Marker (hidden if prefersReducedMotion) */}
        {!prefersReducedMotion && (
          <circle
            cx={markerX}
            cy={markerY}
            r="8"
            fill="currentColor"
            className="text-[#0071e3] shadow-md dark:text-[#2997ff]"
          />
        )}
      </svg>

      <div
        aria-hidden="true"
        className="absolute h-32 w-32 rounded-[42%_58%_55%_45%/48%_42%_58%_52%] bg-gradient-to-br from-[#64D2FF]/25 via-[#0071E3]/18 to-[#AF52DE]/20 shadow-[0_0_45px_rgba(0,113,227,0.16)]"
        style={{
          transform: `scale(${breathScale}) rotate(${prefersReducedMotion ? 0 : progress * 5}deg)`,
          transition: prefersReducedMotion ? "none" : "transform 120ms linear",
        }}
      />

      {/* Central Accessible Phase & Countdown Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-[#555558] dark:text-[#a1a1a6]">
          {phaseLabel}
        </span>
        <span className="mt-1 text-[38px] font-bold tabular-nums tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          {countdownSec}s
        </span>
      </div>
    </div>
  );
}

interface CircleExpanderProps {
  phase: "inhale" | "exhale";
  phaseElapsedMs: number;
  phaseDurationMs: number;
  prefersReducedMotion: boolean;
  phaseLabel: string;
  countdownSec: number;
}

/**
 * Gentle Longer Exhale Circle Animation:
 * Expands gently on Inhale (4s), contracts smoothly on Exhale (6s).
 */
export function CircleExpander({
  phase,
  phaseElapsedMs,
  phaseDurationMs,
  prefersReducedMotion,
  phaseLabel,
  countdownSec,
}: CircleExpanderProps) {
  const progress = Math.min(1, Math.max(0, phaseElapsedMs / phaseDurationMs));
  
  // Scale between 0.70 (empty) and 1.0 (full)
  let scale = 0.70;
  if (phase === "inhale") {
    scale = 0.70 + 0.30 * progress;
  } else {
    scale = 1.0 - 0.30 * progress;
  }

  if (prefersReducedMotion) {
    scale = 0.85; // Fixed neutral scale for reduced motion
  }

  return (
    <div className="relative mx-auto flex h-[240px] w-[240px] items-center justify-center">
      {/* Outer subtle guide ring */}
      <div className="absolute h-[210px] w-[210px] rounded-full border border-black/10 dark:border-white/10" />

      {/* Expanding / Contracting Breathing Sphere */}
      <div
        style={{
          transform: `scale(${scale})`,
          transition: prefersReducedMotion ? "none" : "transform 100ms linear",
        }}
        className="flex h-[190px] w-[190px] items-center justify-center rounded-full bg-gradient-to-br from-[#0071e3]/15 to-[#0071e3]/5 border border-[#0071e3]/30 dark:from-[#2997ff]/20 dark:to-[#2997ff]/5 dark:border-[#2997ff]/30"
      >
        <div className="text-center">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-[#555558] dark:text-[#a1a1a6]">
            {phaseLabel}
          </span>
          <p className="mt-1 text-[38px] font-bold tabular-nums tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            {countdownSec}s
          </p>
        </div>
      </div>
    </div>
  );
}

interface DoubleInhaleVisualizerProps {
  phase: "first_inhale" | "topup_inhale" | "exhale";
  phaseElapsedMs: number;
  phaseDurationMs: number;
  prefersReducedMotion: boolean;
  phaseLabel: string;
  countdownSec: number;
}

/**
 * Double Inhale Visualizer:
 * 1. First Inhale (3s): Scale 0.65 -> 0.88
 * 2. Top-up Inhale (1.5s): Quick expansion pulse 0.88 -> 1.0
 * 3. Exhale (5.5s): Slow calm contraction 1.0 -> 0.65
 */
export function DoubleInhaleVisualizer({
  phase,
  phaseElapsedMs,
  phaseDurationMs,
  prefersReducedMotion,
  phaseLabel,
  countdownSec,
}: DoubleInhaleVisualizerProps) {
  const progress = Math.min(1, Math.max(0, phaseElapsedMs / phaseDurationMs));
  
  let scale = 0.65;
  if (phase === "first_inhale") {
    scale = 0.65 + 0.23 * progress;
  } else if (phase === "topup_inhale") {
    scale = 0.88 + 0.12 * progress;
  } else {
    scale = 1.0 - 0.35 * progress;
  }

  if (prefersReducedMotion) {
    scale = 0.82;
  }

  return (
    <div className="relative mx-auto flex h-[240px] w-[240px] items-center justify-center">
      {/* Target bounds */}
      <div className="absolute h-[210px] w-[210px] rounded-full border border-dashed border-black/15 dark:border-white/15" />

      {/* Breathing Bubble */}
      <div
        style={{
          transform: `scale(${scale})`,
          transition: prefersReducedMotion ? "none" : "transform 100ms linear",
        }}
        className="flex h-[190px] w-[190px] items-center justify-center rounded-full bg-gradient-to-br from-[#1a7f37]/15 to-[#0071e3]/10 border border-[#1a7f37]/30 dark:from-[#34c759]/20 dark:to-[#2997ff]/10 dark:border-[#34c759]/30"
      >
        <div className="text-center px-2">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#555558] dark:text-[#a1a1a6]">
            {phaseLabel}
          </span>
          <p className="mt-1 text-[36px] font-bold tabular-nums tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            {countdownSec}s
          </p>
        </div>
      </div>
    </div>
  );
}

interface GuidedRestVisualizerProps {
  stage: "settle" | "body_attention" | "quiet_rest" | "gradual_return";
  stageIndex: number;
  stageRemainingMs: number;
  totalRemainingMs: number;
  stageDescription: string;
}

/**
 * Calm Progress Ring and Timeline for Guided Deep Rest (10 min).
 * No distracting moving oscillations.
 */
export function GuidedRestVisualizer({
  stageIndex,
  totalRemainingMs,
  stageDescription,
}: GuidedRestVisualizerProps) {
  const totalDurationMs = 600000;
  const progressPercent = Math.min(100, Math.max(0, ((totalDurationMs - totalRemainingMs) / totalDurationMs) * 100));

  const totalMin = Math.floor(totalRemainingMs / 60000);
  const totalSec = Math.floor((totalRemainingMs % 60000) / 1000);
  const formattedTime = `${totalMin}:${String(totalSec).padStart(2, "0")}`;

  const stages = ["Settle", "Body Attention", "Quiet Rest", "Return"];

  return (
    <div className="mx-auto max-w-md text-center">
      {/* Large readable remaining time */}
      <p className="text-[48px] font-bold tabular-nums tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
        {formattedTime}
      </p>

      {/* Stage Timeline */}
      <div className="mt-4 flex items-center justify-between gap-1.5 px-2">
        {stages.map((stg, idx) => {
          const isCurrent = idx === stageIndex;
          const isDone = idx < stageIndex;

          return (
            <div key={stg} className="flex-1">
              <div
                className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                  isDone
                    ? "bg-[#0071e3] dark:bg-[#2997ff]"
                    : isCurrent
                    ? "bg-[#0071e3] dark:bg-[#2997ff] ring-2 ring-[#0071e3]/30"
                    : "bg-black/10 dark:bg-white/10"
                }`}
              />
              <p
                className={`mt-1.5 text-[11px] font-medium tracking-tight truncate ${
                  isCurrent
                    ? "text-[#0071e3] font-semibold dark:text-[#2997ff]"
                    : "text-[#76767b] dark:text-[#7c7c82]"
                }`}
              >
                {stg}
              </p>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
        <div
          className="h-full bg-[#0071e3] transition-all duration-300 dark:bg-[#2997ff]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Guidance Text Card */}
      <div className="mt-6 rounded-2xl bg-black/[0.03] p-5 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
        <p className="text-[17px] font-normal leading-relaxed text-[#1d1d1f] dark:text-[#f5f5f7]">
          {stageDescription}
        </p>
      </div>
    </div>
  );
}
