import type {
  RoutineAvailabilityResult,
  RoutineCompletion,
  RoutineFrequency,
  RoutineWeekday,
  RoutineWeeklyProgress,
  SharedRoutine,
} from "./contracts";
import { isValidLocalDate, validateSharedRoutine } from "./validation";

/**
 * Returns ISO weekday for a local date string (YYYY-MM-DD).
 * 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday.
 */
export function getIsoWeekday(localDate: string, _timeZone?: string): RoutineWeekday {
  if (!isValidLocalDate(localDate)) {
    throw new Error(`Invalid local date: ${localDate}`);
  }
  const [year, month, day] = localDate.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const jsDay = utcDate.getUTCDay();
  return (jsDay === 0 ? 7 : jsDay) as RoutineWeekday;
}

/**
 * Calculates Monday–Sunday local calendar week bounds and all 7 date strings.
 */
export function getLocalWeekBounds(
  localDate: string,
  timeZone?: string,
): {
  weekStartDate: string;
  weekEndDate: string;
  localDates: string[];
  startLocalDate: string;
  endLocalDate: string;
  datesInWeek: string[];
} {
  if (!isValidLocalDate(localDate)) {
    throw new Error(`Invalid local date: ${localDate}`);
  }
  const weekday = getIsoWeekday(localDate, timeZone);
  const [year, month, day] = localDate.split("-").map(Number);
  const currentUtcMs = Date.UTC(year, month - 1, day);
  const mondayOffset = weekday - 1;
  const mondayUtcMs = currentUtcMs - mondayOffset * 86400000;

  const localDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayUtcMs + i * 86400000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getUTCDate()).padStart(2, "0");
    localDates.push(`${y}-${m}-${dayStr}`);
  }

  return {
    weekStartDate: localDates[0],
    weekEndDate: localDates[6],
    localDates,
    startLocalDate: localDates[0],
    endLocalDate: localDates[6],
    datesInWeek: localDates,
  };
}

/**
 * Resolves the effective schedule frequency for a routine:
 * 1. Valid new frequency if present;
 * 2. Safely mapped legacy recurrence;
 * 3. Otherwise needsSchedule without guessing.
 * Does not mutate Firestore document during read.
 */
export function resolveEffectiveFrequency(
  routine: SharedRoutine,
): { frequency?: RoutineFrequency; needsSchedule: boolean; diagnosticCode?: string } {
  if (routine.frequency !== undefined) {
    const freq = routine.frequency;
    let diagnosticCode: string | undefined;

    // Check if new frequency contradicts legacy recurrence
    if (routine.recurrence) {
      if (freq.kind === "daily" && routine.recurrence.type !== "daily") {
        diagnosticCode = "frequency_recurrence_mismatch";
      } else if (freq.kind === "weekdays") {
        if (
          routine.recurrence.type !== "selected_weekdays" ||
          JSON.stringify([...routine.recurrence.weekdays].sort()) !== JSON.stringify([1, 2, 3, 4, 5])
        ) {
          diagnosticCode = "frequency_recurrence_mismatch";
        }
      } else if (freq.kind === "selected_days") {
        if (
          routine.recurrence.type !== "selected_weekdays" ||
          JSON.stringify([...freq.daysOfWeek].sort()) !== JSON.stringify([...routine.recurrence.weekdays].sort())
        ) {
          diagnosticCode = "frequency_recurrence_mismatch";
        }
      } else if (freq.kind === "times_per_week") {
        diagnosticCode = "frequency_recurrence_mismatch";
      }
    }

    if (freq.kind === "selected_days") {
      const sortedDays = [...new Set(freq.daysOfWeek)].sort((a, b) => a - b) as RoutineWeekday[];
      return {
        frequency: { kind: "selected_days", daysOfWeek: sortedDays },
        needsSchedule: false,
        diagnosticCode,
      };
    }

    return { frequency: freq, needsSchedule: false, diagnosticCode };
  }

  // Safe mapping from legacy recurrence
  if (routine.recurrence) {
    if (routine.recurrence.type === "daily") {
      return { frequency: { kind: "daily" }, needsSchedule: false };
    }
    if (
      routine.recurrence.type === "selected_weekdays" &&
      Array.isArray(routine.recurrence.weekdays) &&
      routine.recurrence.weekdays.length > 0 &&
      routine.recurrence.weekdays.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)
    ) {
      const sorted = [...new Set(routine.recurrence.weekdays)].sort((a, b) => a - b) as RoutineWeekday[];
      return {
        frequency: { kind: "selected_days", daysOfWeek: sorted },
        needsSchedule: false,
      };
    }
  }

  return { needsSchedule: true };
}

/**
 * Checks whether a routine is deterministically scheduled for a given local date.
 * Note: `times_per_week` routines are NEVER deterministically scheduled.
 */
export function isRoutineDeterministicallyScheduledOnDate(
  routine: SharedRoutine,
  localDate: string,
  timeZone?: string,
): boolean {
  if (!isValidLocalDate(localDate) || localDate < routine.activeFrom || routine.status !== "active") {
    return false;
  }
  if (routine.pausedAt && localDate >= routine.pausedAt) {
    return false;
  }

  const effective = resolveEffectiveFrequency(routine);
  if (effective.needsSchedule || !effective.frequency) {
    return false;
  }

  const freq = effective.frequency;
  if (freq.kind === "daily") {
    return true;
  }
  if (freq.kind === "weekdays") {
    const iso = getIsoWeekday(localDate, timeZone);
    return iso >= 1 && iso <= 5;
  }
  if (freq.kind === "selected_days") {
    const iso = getIsoWeekday(localDate, timeZone);
    return freq.daysOfWeek.includes(iso);
  }
  if (freq.kind === "times_per_week") {
    return false;
  }

  return false;
}

/**
 * Backward compatibility alias for isRoutineDeterministicallyScheduledOnDate.
 */
export function isRoutineScheduledOnDate(
  routine: SharedRoutine,
  localDate: string,
  timeZone?: string,
): boolean {
  return isRoutineDeterministicallyScheduledOnDate(routine, localDate, timeZone);
}

/**
 * Computes weekly progress for a routine across the current local calendar week (Monday to Sunday).
 * At most 1 completion per local calendar date counts.
 * Status 'skipped' does NOT count as completion.
 * Status 'full' and 'minimum' count as 1 completion.
 */
export function getWeeklyRoutineProgress(
  routine: SharedRoutine,
  completions: RoutineCompletion[],
  localDate: string,
  timeZone?: string,
): RoutineWeeklyProgress {
  const effective = resolveEffectiveFrequency(routine);
  const targetCount = effective.frequency?.kind === "times_per_week" ? effective.frequency.count : 7;
  const { weekStartDate, weekEndDate } = getLocalWeekBounds(localDate, timeZone);

  const completedDatesSet = new Set<string>();
  for (const c of completions) {
    if (c.routineId === routine.id && c.localDate >= weekStartDate && c.localDate <= weekEndDate) {
      if (c.status === "full" || c.status === "minimum") {
        completedDatesSet.add(c.localDate);
      }
    }
  }

  const completedDates = Array.from(completedDatesSet).sort();
  const completedCount = completedDates.length;
  const isTargetMet = completedCount >= targetCount;

  return {
    targetCount,
    completedCount,
    completedDates,
    isTargetMet,
  };
}

/**
 * Canonical availability resolution for a routine on a given local date.
 */
export function getRoutineAvailabilityForDate(params: {
  routine: SharedRoutine;
  localDate: string;
  timeZone?: string;
  completions?: RoutineCompletion[];
  isExplicitlyPlannedToday?: boolean;
}): RoutineAvailabilityResult {
  const { routine, localDate, timeZone, completions = [], isExplicitlyPlannedToday = false } = params;

  if (!isValidLocalDate(localDate) || localDate < routine.activeFrom || !validateSharedRoutine(routine).valid) {
    return {
      status: "invalid",
      routine,
      isPlannedToday: false,
      reason: "invalid_routine_or_date",
    };
  }

  if (routine.status === "archived") {
    return {
      status: "archived",
      routine,
      isPlannedToday: false,
    };
  }

  if (routine.status === "paused" || (routine.pausedAt && localDate >= routine.pausedAt)) {
    return {
      status: "paused",
      routine,
      isPlannedToday: false,
    };
  }

  const effective = resolveEffectiveFrequency(routine);
  if (effective.needsSchedule || !effective.frequency) {
    return {
      status: "needs_schedule",
      routine,
      isPlannedToday: false,
      diagnosticCode: effective.diagnosticCode,
    };
  }

  const freq = effective.frequency;

  if (freq.kind === "times_per_week") {
    const weeklyProgress = getWeeklyRoutineProgress(routine, completions, localDate, timeZone);

    if (isExplicitlyPlannedToday) {
      return {
        status: "scheduled_today",
        routine,
        isPlannedToday: true,
        effectiveFrequency: freq,
        weeklyProgress,
        diagnosticCode: effective.diagnosticCode,
      };
    }

    if (weeklyProgress.isTargetMet) {
      return {
        status: "weekly_target_met",
        routine,
        isPlannedToday: false,
        effectiveFrequency: freq,
        weeklyProgress,
        diagnosticCode: effective.diagnosticCode,
      };
    }

    return {
      status: "available_flexible",
      routine,
      isPlannedToday: false,
      effectiveFrequency: freq,
      weeklyProgress,
      diagnosticCode: effective.diagnosticCode,
    };
  }

  // Deterministic schedule (daily, weekdays, selected_days)
  const isScheduled = isRoutineDeterministicallyScheduledOnDate(routine, localDate, timeZone);
  if (isScheduled) {
    return {
      status: "scheduled_today",
      routine,
      isPlannedToday: true,
      effectiveFrequency: freq,
      diagnosticCode: effective.diagnosticCode,
    };
  }

  return {
    status: "not_scheduled_today",
    routine,
    isPlannedToday: false,
    effectiveFrequency: freq,
    diagnosticCode: effective.diagnosticCode,
  };
}
