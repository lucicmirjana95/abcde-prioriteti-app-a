import type {
  RoutineCompletion,
  RoutineCue,
  RoutineRecurrence,
  SharedRoutine,
} from "./contracts";

export interface RoutineValidationResult {
  valid: boolean;
  errors: string[];
}

// Leaves room for the local date prefix in an idempotent completion document ID.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,96}$/;
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength = 500): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function isValidRoutineMutationId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{10,128}$/.test(value);
}

export function isValidLocalDate(value: unknown): value is string {
  if (typeof value !== "string" || !LOCAL_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidTimeZone(value: unknown): value is string {
  if (!isNonEmptyString(value, 100)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validateRecurrence(value: unknown, errors: string[]): value is RoutineRecurrence {
  if (!isRecord(value)) {
    errors.push("recurrence_invalid");
    return false;
  }
  if (value.type === "daily") return true;
  if (value.type !== "selected_weekdays" || !Array.isArray(value.weekdays)) {
    errors.push("recurrence_invalid");
    return false;
  }
  const weekdays = value.weekdays;
  if (
    weekdays.length === 0 ||
    weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7) ||
    new Set(weekdays).size !== weekdays.length
  ) {
    errors.push("recurrence_weekdays_invalid");
    return false;
  }
  return true;
}

function validateCue(value: unknown, errors: string[]): value is RoutineCue {
  if (!isRecord(value)) {
    errors.push("cue_invalid");
    return false;
  }
  if (value.type === "after_activity") {
    if (!isNonEmptyString(value.activity, 300)) errors.push("cue_activity_invalid");
    return errors.length === 0;
  }
  if (value.type === "time_and_place") {
    const hasTime = value.time !== undefined;
    const hasPlace = value.place !== undefined;
    if (!hasTime && !hasPlace) errors.push("cue_time_or_place_required");
    if (hasTime && (typeof value.time !== "string" || !TIME_PATTERN.test(value.time))) {
      errors.push("cue_time_invalid");
    }
    if (hasPlace && !isNonEmptyString(value.place, 300)) errors.push("cue_place_invalid");
    return errors.length === 0;
  }
  if (value.type === "custom") {
    if (!isNonEmptyString(value.prompt, 300)) errors.push("cue_prompt_invalid");
    return errors.length === 0;
  }
  errors.push("cue_invalid");
  return false;
}

export function validateSharedRoutine(value: unknown): RoutineValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["routine_invalid"] };

  if (typeof value.id !== "string" || !ID_PATTERN.test(value.id)) errors.push("id_invalid");
  if (!isNonEmptyString(value.title, 160)) errors.push("title_invalid");
  if (!isNonEmptyString(value.fullAction, 500)) errors.push("full_action_invalid");
  if (!isNonEmptyString(value.minimumAction, 500)) errors.push("minimum_action_invalid");
  validateRecurrence(value.recurrence, errors);
  if (!(["active", "paused", "archived"] as unknown[]).includes(value.status)) {
    errors.push("status_invalid");
  }
  if (value.cue !== undefined) validateCue(value.cue, errors);
  if (!isValidTimeZone(value.timeZone)) errors.push("time_zone_invalid");
  if (!(["en", "sr", "tr"] as unknown[]).includes(value.language)) errors.push("language_invalid");
  if (!(["user", "ai_suggested", "legacy_import"] as unknown[]).includes(value.source)) {
    errors.push("source_invalid");
  }
  if (!Number.isInteger(value.sortOrder) || (value.sortOrder as number) < 0) {
    errors.push("sort_order_invalid");
  }
  if (!Array.isArray(value.goalRelationships)) {
    errors.push("goal_relationships_invalid");
  } else {
    for (const relationship of value.goalRelationships) {
      if (!isRecord(relationship) || !isNonEmptyString(relationship.goalId, 128)) {
        errors.push("goal_relationship_invalid");
        continue;
      }
      if (relationship.milestoneId !== undefined && !isNonEmptyString(relationship.milestoneId, 128)) {
        errors.push("goal_milestone_invalid");
      }
      if (relationship.explanation !== undefined && !isNonEmptyString(relationship.explanation, 500)) {
        errors.push("goal_explanation_invalid");
      }
    }
  }
  if (!isValidLocalDate(value.activeFrom)) errors.push("active_from_invalid");
  if (!isIsoTimestamp(value.createdAt)) errors.push("created_at_invalid");
  if (!isIsoTimestamp(value.updatedAt)) errors.push("updated_at_invalid");
  if (value.pausedAt !== undefined && !isIsoTimestamp(value.pausedAt)) errors.push("paused_at_invalid");
  if (value.archivedAt !== undefined && !isIsoTimestamp(value.archivedAt)) errors.push("archived_at_invalid");
  if (value.status === "paused" && !isIsoTimestamp(value.pausedAt)) errors.push("paused_at_required");
  if (value.status === "archived" && !isIsoTimestamp(value.archivedAt)) errors.push("archived_at_required");

  // Phase 1A Backward-compatible extensions validation
  if (value.estimatedMinutes !== undefined) {
    if (!Number.isInteger(value.estimatedMinutes) || (value.estimatedMinutes as number) < 1 || (value.estimatedMinutes as number) > 180) {
      errors.push("estimated_minutes_invalid");
    }
  }

  if (value.revision !== undefined) {
    if (!Number.isInteger(value.revision) || (value.revision as number) < 0) {
      errors.push("revision_invalid");
    }
  }
  
  if (value.why !== undefined && !isNonEmptyString(value.why, 1000)) {
    errors.push("why_invalid");
  }

  if (value.preferredTime !== undefined && (typeof value.preferredTime !== "string" || !TIME_PATTERN.test(value.preferredTime))) {
    errors.push("preferred_time_invalid");
  }

  if (value.frequency !== undefined) {
    if (!isRecord(value.frequency)) {
      errors.push("frequency_invalid");
    } else {
      if (value.frequency.kind === "selected_days") {
        const days = value.frequency.daysOfWeek;
        if (!Array.isArray(days) || days.length === 0 || days.some(d => !Number.isInteger(d) || d < 1 || d > 7)) {
          errors.push("frequency_days_invalid");
        }
      } else if (value.frequency.kind === "times_per_week") {
        if (!Number.isInteger(value.frequency.count) || (value.frequency.count as number) < 1 || (value.frequency.count as number) > 7) {
          errors.push("frequency_count_invalid");
        }
      } else if (value.frequency.kind !== "daily" && value.frequency.kind !== "weekdays") {
        errors.push("frequency_kind_invalid");
      }
    }
  }
  
  if (value.origin !== undefined) {
    if (!isRecord(value.origin)) {
      errors.push("origin_invalid");
    } else {
      const kind = value.origin.kind;
      if (kind === "vision") {
        if (!isNonEmptyString(value.origin.visionId, 128) || !isNonEmptyString(value.origin.sourceFingerprint, 128)) {
          errors.push("origin_vision_invalid");
        }
      } else if (kind === "inbox") {
        if (!isNonEmptyString(value.origin.inboxItemId, 128) || !isNonEmptyString(value.origin.sourceFingerprint, 128)) {
          errors.push("origin_inbox_invalid");
        }
      } else if (kind !== "manual" && kind !== "ai_suggested" && kind !== "legacy_import") {
        errors.push("origin_kind_invalid");
      }
    }
  }

  if (value.mutationId !== undefined && !isValidRoutineMutationId(value.mutationId)) {
    errors.push("mutation_id_invalid");
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export type RoutineNormalizationResult = 
  | { type: "valid"; routine: SharedRoutine }
  | { type: "valid_legacy"; routine: SharedRoutine; needsDuration: boolean; needsSchedule: boolean }
  | { type: "invalid"; errors: string[] };

export function normalizeSharedRoutine(value: unknown): RoutineNormalizationResult {
  const result = validateSharedRoutine(value);
  if (!result.valid) return { type: "invalid", errors: result.errors };
  
  const routine = value as SharedRoutine;
  let frequency = routine.frequency;
  if (frequency && frequency.kind === "selected_days") {
    frequency = {
      ...frequency,
      daysOfWeek: Array.from(new Set(frequency.daysOfWeek)).sort((a, b) => a - b),
    };
  }

  const isLegacy = routine.estimatedMinutes === undefined || routine.frequency === undefined || routine.revision === undefined || routine.origin === undefined;
  
  if (!isLegacy) {
    return { type: "valid", routine: frequency ? { ...routine, frequency } : routine };
  }
  
  let needsSchedule = false;
  if (!frequency) {
    if (routine.recurrence.type === "daily") {
      frequency = { kind: "daily" };
    } else {
      needsSchedule = true;
    }
  }

  const needsDuration = routine.estimatedMinutes === undefined;

  const normalized: SharedRoutine = {
    ...routine,
    revision: routine.revision !== undefined ? routine.revision : 0,
    origin: routine.origin || { kind: "legacy_import" },
    frequency,
    needsDuration,
    needsSchedule,
  };
  
  return {
    type: "valid_legacy",
    routine: normalized,
    needsDuration,
    needsSchedule,
  };
}

export function getCanonicalLocalDate(timeZone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone && timeZone.trim() ? timeZone : "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
    const year = value("year");
    const month = value("month");
    const day = value("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // fallback if timezone string fails
  }
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validateRoutineCompletion(
  value: unknown,
  effectiveTimeZone?: string,
  now: Date = new Date(),
): RoutineValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["completion_invalid"] };

  if (typeof value.routineId !== "string" || !ID_PATTERN.test(value.routineId)) {
    errors.push("routine_id_invalid");
  }

  // Timezone validation rules:
  // 1. If effectiveTimeZone is explicitly provided, it must be a valid IANA timezone.
  // 2. If completion.timeZone is present, it must be a valid IANA timezone.
  // 3. If both are present, they must match exactly, else 'completion_timezone_mismatch'.
  // 4. An explicitly invalid timezone must produce 'completion_timezone_invalid' and never silently fall back to UTC.
  // 5. UTC fallback is permitted only for legacy calls where neither zone was supplied.
  let determinedTz: string | null = null;
  const rawCompletionTz = value.timeZone;
  const hasEffectiveTz = effectiveTimeZone !== undefined && effectiveTimeZone !== null && effectiveTimeZone !== "";
  const hasCompletionTz = rawCompletionTz !== undefined && rawCompletionTz !== null && rawCompletionTz !== "";

  if (hasEffectiveTz && !isValidTimeZone(effectiveTimeZone)) {
    errors.push("completion_timezone_invalid");
  }
  if (hasCompletionTz && !isValidTimeZone(rawCompletionTz)) {
    errors.push("completion_timezone_invalid");
  }

  if (hasEffectiveTz && hasCompletionTz) {
    if (isValidTimeZone(effectiveTimeZone) && isValidTimeZone(rawCompletionTz)) {
      if (effectiveTimeZone !== rawCompletionTz) {
        errors.push("completion_timezone_mismatch");
      } else {
        determinedTz = effectiveTimeZone;
      }
    }
  } else if (hasEffectiveTz) {
    if (isValidTimeZone(effectiveTimeZone)) {
      determinedTz = effectiveTimeZone;
    }
  } else if (hasCompletionTz) {
    if (isValidTimeZone(rawCompletionTz)) {
      determinedTz = rawCompletionTz;
    }
  } else {
    // Legacy call without any timezone provided
    determinedTz = "UTC";
  }

  if (!isValidLocalDate(value.localDate)) {
    errors.push("local_date_invalid");
  } else if (determinedTz) {
    const maxAllowedDate = getCanonicalLocalDate(determinedTz, now);
    if (value.localDate > maxAllowedDate) {
      errors.push("completion_future_date_forbidden");
    }
  }

  if (!(["full", "minimum", "skipped", "paused"] as unknown[]).includes(value.status)) {
    errors.push("completion_status_invalid");
  }
  if (!(["app_a", "app_b", "app_c"] as unknown[]).includes(value.sourceApp)) {
    errors.push("source_app_invalid");
  }
  if (!isIsoTimestamp(value.recordedAt)) errors.push("recorded_at_invalid");

  const isCompleted = value.status === "full" || value.status === "minimum";
  if (isCompleted && !isIsoTimestamp(value.completedAt)) errors.push("completed_at_required");
  if (!isCompleted && value.completedAt !== undefined) errors.push("completed_at_forbidden");

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function getRoutineCompletionDocumentId(routineId: string, localDate: string): string {
  if (!ID_PATTERN.test(routineId) || !isValidLocalDate(localDate)) {
    throw new Error("Invalid routine completion key");
  }
  return `${localDate}_${routineId}`;
}
