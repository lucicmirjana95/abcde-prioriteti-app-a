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

function isValidTimeZone(value: unknown): value is string {
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

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function validateRoutineCompletion(value: unknown): RoutineValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["completion_invalid"] };

  if (typeof value.routineId !== "string" || !ID_PATTERN.test(value.routineId)) {
    errors.push("routine_id_invalid");
  }
  if (!isValidLocalDate(value.localDate)) errors.push("local_date_invalid");
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

export function isRoutineScheduledOnDate(routine: SharedRoutine, localDate: string): boolean {
  if (!isValidLocalDate(localDate) || localDate < routine.activeFrom || routine.status !== "active") {
    return false;
  }
  if (routine.recurrence.type === "daily") return true;
  const [year, month, day] = localDate.split("-").map(Number);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const weekday = (jsDay === 0 ? 7 : jsDay) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  return routine.recurrence.weekdays.includes(weekday);
}
