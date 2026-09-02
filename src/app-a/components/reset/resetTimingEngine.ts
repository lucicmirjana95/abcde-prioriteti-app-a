import type { AppALanguage } from "../../types";

export type ResetExperienceId =
  | "balanced_box"
  | "longer_exhale"
  | "double_inhale"
  | "guided_rest";

export type ResetSessionStatus = "idle" | "running" | "paused" | "completed";

export interface ResetTimingState {
  status: ResetSessionStatus;
  elapsedMs: number;
  totalDurationMs: number;
  remainingMs: number;
  currentPhaseIndex: number;
  currentPhaseElapsedMs: number;
  currentPhaseDurationMs: number;
  currentPhaseRemainingMs: number;
  currentCycle: number;
  totalCycles?: number;
  phaseName: string;
}

export interface BoxPhase {
  id: "inhale" | "hold_full" | "exhale" | "hold_empty";
  durationSec: number;
}

export interface ExhalePhase {
  id: "inhale" | "exhale";
  durationSec: number;
}

export interface DoubleInhalePhase {
  id: "first_inhale" | "topup_inhale" | "exhale";
  durationSec: number;
}

export interface GuidedRestStage {
  id: "settle" | "body_attention" | "quiet_rest" | "gradual_return";
  durationSec: number;
}

export const BALANCED_BOX_PHASES: readonly BoxPhase[] = Object.freeze([
  Object.freeze({ id: "inhale", durationSec: 4 }),
  Object.freeze({ id: "hold_full", durationSec: 4 }),
  Object.freeze({ id: "exhale", durationSec: 4 }),
  Object.freeze({ id: "hold_empty", durationSec: 4 }),
]);

export const LONGER_EXHALE_PHASES: readonly ExhalePhase[] = Object.freeze([
  Object.freeze({ id: "inhale", durationSec: 4 }),
  Object.freeze({ id: "exhale", durationSec: 6 }),
]);

export const DOUBLE_INHALE_PHASES: readonly DoubleInhalePhase[] = Object.freeze([
  Object.freeze({ id: "first_inhale", durationSec: 3 }),
  Object.freeze({ id: "topup_inhale", durationSec: 1.5 }),
  Object.freeze({ id: "exhale", durationSec: 5.5 }),
]);

export const GUIDED_REST_STAGES: readonly GuidedRestStage[] = Object.freeze([
  Object.freeze({ id: "settle", durationSec: 90 }), // 1.5 min
  Object.freeze({ id: "body_attention", durationSec: 210 }), // 3.5 min (up to 5 min total)
  Object.freeze({ id: "quiet_rest", durationSec: 240 }), // 4 min (up to 9 min total)
  Object.freeze({ id: "gradual_return", durationSec: 60 }), // 1 min (10 min total)
]);

export const BOX_CYCLE_PRESETS = Object.freeze([
  Object.freeze({ cycles: 4, durationMs: 64000, durationSec: 64, formattedTime: "1:04" }),
  Object.freeze({ cycles: 8, durationMs: 128000, durationSec: 128, formattedTime: "2:08" }),
  Object.freeze({ cycles: 12, durationMs: 192000, durationSec: 192, formattedTime: "3:12" }),
]);

/**
 * Calculates current timing state for Balanced Box (4-4-4-4).
 * Total cycle = 16 seconds.
 * Presets: 4 cycles (1:04), 8 cycles (2:08), 12 cycles (3:12).
 * Default = 12 cycles (192,000ms = 3:12).
 */
export function calculateBoxTiming(
  elapsedMs: number,
  totalDurationMs = 192000,
): {
  phase: "inhale" | "hold_full" | "exhale" | "hold_empty";
  phaseIndex: number;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  phaseRemainingMs: number;
  cycle: number;
  isComplete: boolean;
} {
  const safeElapsed = Math.max(0, elapsedMs);
  if (safeElapsed >= totalDurationMs) {
    return {
      phase: "hold_empty",
      phaseIndex: 3,
      phaseElapsedMs: 4000,
      phaseDurationMs: 4000,
      phaseRemainingMs: 0,
      cycle: Math.max(1, Math.round(totalDurationMs / 16000)),
      isComplete: true,
    };
  }

  const cycleLengthMs = 16000;
  const cycle = Math.floor(safeElapsed / cycleLengthMs) + 1;
  const inCycleMs = safeElapsed % cycleLengthMs;

  if (inCycleMs < 4000) {
    return {
      phase: "inhale",
      phaseIndex: 0,
      phaseElapsedMs: inCycleMs,
      phaseDurationMs: 4000,
      phaseRemainingMs: 4000 - inCycleMs,
      cycle,
      isComplete: false,
    };
  } else if (inCycleMs < 8000) {
    return {
      phase: "hold_full",
      phaseIndex: 1,
      phaseElapsedMs: inCycleMs - 4000,
      phaseDurationMs: 4000,
      phaseRemainingMs: 8000 - inCycleMs,
      cycle,
      isComplete: false,
    };
  } else if (inCycleMs < 12000) {
    return {
      phase: "exhale",
      phaseIndex: 2,
      phaseElapsedMs: inCycleMs - 8000,
      phaseDurationMs: 4000,
      phaseRemainingMs: 12000 - inCycleMs,
      cycle,
      isComplete: false,
    };
  } else {
    return {
      phase: "hold_empty",
      phaseIndex: 3,
      phaseElapsedMs: inCycleMs - 12000,
      phaseDurationMs: 4000,
      phaseRemainingMs: 16000 - inCycleMs,
      cycle,
      isComplete: false,
    };
  }
}

/**
 * Calculates current timing state for Gentle Longer Exhale (4-6).
 * Total cycle = 10 seconds.
 */
export function calculateLongerExhaleTiming(
  elapsedMs: number,
  totalDurationMs = 180000,
): {
  phase: "inhale" | "exhale";
  phaseIndex: number;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  phaseRemainingMs: number;
  cycle: number;
  isComplete: boolean;
} {
  const safeElapsed = Math.max(0, elapsedMs);
  if (safeElapsed >= totalDurationMs) {
    return {
      phase: "exhale",
      phaseIndex: 1,
      phaseElapsedMs: 6000,
      phaseDurationMs: 6000,
      phaseRemainingMs: 0,
      cycle: Math.floor(totalDurationMs / 10000),
      isComplete: true,
    };
  }

  const cycleLengthMs = 10000;
  const cycle = Math.floor(safeElapsed / cycleLengthMs) + 1;
  const inCycleMs = safeElapsed % cycleLengthMs;

  if (inCycleMs < 4000) {
    return {
      phase: "inhale",
      phaseIndex: 0,
      phaseElapsedMs: inCycleMs,
      phaseDurationMs: 4000,
      phaseRemainingMs: 4000 - inCycleMs,
      cycle,
      isComplete: false,
    };
  } else {
    return {
      phase: "exhale",
      phaseIndex: 1,
      phaseElapsedMs: inCycleMs - 4000,
      phaseDurationMs: 6000,
      phaseRemainingMs: 10000 - inCycleMs,
      cycle,
      isComplete: false,
    };
  }
}

/**
 * Calculates current timing state for Double Inhale (3s first inhale + 1.5s topup + 5.5s exhale = 10s per cycle).
 * Total cycles bounded to targetCycles (default 3 cycles = 30 seconds).
 */
export function calculateDoubleInhaleTiming(
  elapsedMs: number,
  targetCycles = 3,
): {
  phase: "first_inhale" | "topup_inhale" | "exhale";
  phaseIndex: number;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  phaseRemainingMs: number;
  cycle: number;
  isComplete: boolean;
} {
  const safeElapsed = Math.max(0, elapsedMs);
  const cycleLengthMs = 10000;
  const totalDurationMs = targetCycles * cycleLengthMs;

  if (safeElapsed >= totalDurationMs) {
    return {
      phase: "exhale",
      phaseIndex: 2,
      phaseElapsedMs: 5500,
      phaseDurationMs: 5500,
      phaseRemainingMs: 0,
      cycle: targetCycles,
      isComplete: true,
    };
  }

  const cycle = Math.floor(safeElapsed / cycleLengthMs) + 1;
  const inCycleMs = safeElapsed % cycleLengthMs;

  if (inCycleMs < 3000) {
    return {
      phase: "first_inhale",
      phaseIndex: 0,
      phaseElapsedMs: inCycleMs,
      phaseDurationMs: 3000,
      phaseRemainingMs: 3000 - inCycleMs,
      cycle,
      isComplete: false,
    };
  } else if (inCycleMs < 4500) {
    return {
      phase: "topup_inhale",
      phaseIndex: 1,
      phaseElapsedMs: inCycleMs - 3000,
      phaseDurationMs: 1500,
      phaseRemainingMs: 4500 - inCycleMs,
      cycle,
      isComplete: false,
    };
  } else {
    return {
      phase: "exhale",
      phaseIndex: 2,
      phaseElapsedMs: inCycleMs - 4500,
      phaseDurationMs: 5500,
      phaseRemainingMs: 10000 - inCycleMs,
      cycle,
      isComplete: false,
    };
  }
}

/**
 * Calculates current stage for Guided Deep Rest (10 minutes total = 600,000ms).
 */
export function calculateGuidedRestTiming(
  elapsedMs: number,
  totalDurationMs = 600000,
): {
  stage: "settle" | "body_attention" | "quiet_rest" | "gradual_return";
  stageIndex: number;
  stageElapsedMs: number;
  stageDurationMs: number;
  stageRemainingMs: number;
  isComplete: boolean;
} {
  const safeElapsed = Math.max(0, elapsedMs);
  if (safeElapsed >= totalDurationMs) {
    return {
      stage: "gradual_return",
      stageIndex: 3,
      stageElapsedMs: 60000,
      stageDurationMs: 60000,
      stageRemainingMs: 0,
      isComplete: true,
    };
  }

  // Settle: 0 - 90s (90,000ms)
  if (safeElapsed < 90000) {
    return {
      stage: "settle",
      stageIndex: 0,
      stageElapsedMs: safeElapsed,
      stageDurationMs: 90000,
      stageRemainingMs: 90000 - safeElapsed,
      isComplete: false,
    };
  }
  // Body Attention: 90s - 300s (210,000ms)
  if (safeElapsed < 300000) {
    return {
      stage: "body_attention",
      stageIndex: 1,
      stageElapsedMs: safeElapsed - 90000,
      stageDurationMs: 210000,
      stageRemainingMs: 300000 - safeElapsed,
      isComplete: false,
    };
  }
  // Quiet Rest: 300s - 540s (240,000ms)
  if (safeElapsed < 540000) {
    return {
      stage: "quiet_rest",
      stageIndex: 2,
      stageElapsedMs: safeElapsed - 300000,
      stageDurationMs: 240000,
      stageRemainingMs: 540000 - safeElapsed,
      isComplete: false,
    };
  }
  // Gradual Return: 540s - 600s (60,000ms)
  return {
    stage: "gradual_return",
    stageIndex: 3,
    stageElapsedMs: safeElapsed - 540000,
    stageDurationMs: 60000,
    stageRemainingMs: 600000 - safeElapsed,
    isComplete: false,
  };
}
