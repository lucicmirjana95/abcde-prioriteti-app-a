import type { FieldValue, Timestamp, WithFieldValue } from "firebase/firestore";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import type { AppALanguage, DailyResetData } from "../types";
import { convertDataToInput } from "../screens/todayFlow";
import { validatePlanDraft } from "../domain/daily-reset/validation";

export const APP_A_DAILY_PLAN_SCHEMA_VERSION = 1 as const;

function toFirestoreSafeValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Persisted updatedAt representation read from Firestore:
 * - Firestore Timestamp
 * - Valid ISO string (backward compatibility for existing stored documents)
 */
export type AppADocumentUpdatedAtRead = Timestamp | string;
export type AppADocumentUpdatedAt = AppADocumentUpdatedAtRead;

export interface AppADailyPlanDocument {
  revision?: number;
  schemaVersion: typeof APP_A_DAILY_PLAN_SCHEMA_VERSION;
  localDate: string;
  timezone: string;
  language: AppALanguage;
  status: "confirmed";
  checkIn: {
    energy?: number;
    pleasantness?: number;
    availableMinutes?: number;
    stateNote?: string;
  };
  plan: DailyPlanDraft;
  execution?: {
    completedItemIds: string[];
  };
  updatedAt?: AppADocumentUpdatedAtRead;
}

/**
 * Write payload type for Firestore write operations.
 * Allows Firestore FieldValue sentinels (e.g. serverTimestamp()) via WithFieldValue.
 */
export type AppADailyPlanDocumentWrite = WithFieldValue<AppADailyPlanDocument>;

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDateKeyInTimeZone(
  timezone?: string,
  date = new Date(),
  dayResetHour = 0,
): string {
  const effectiveZone = timezone && timezone.trim() ? timezone : getLocalTimezone();
  const adjustedDate =
    dayResetHour > 0
      ? new Date(date.getTime() - dayResetHour * 60 * 60 * 1000)
      : date;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: effectiveZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(adjustedDate);
    const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
    const year = value("year");
    const month = value("month");
    const day = value("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid zones normally cannot reach this path because preferences are validated.
  }
  return getLocalDateKey(adjustedDate);
}

export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function createDailyPlanDocument(
  input: DailyResetData,
  plan: DailyPlanDraft,
  language: AppALanguage,
  localDate = getLocalDateKey(),
  timezone = getLocalTimezone(),
): AppADailyPlanDocument {
  const normalized = convertDataToInput(input, language);
  const stateNote = normalized.stateNote?.trim();

  return {
    schemaVersion: APP_A_DAILY_PLAN_SCHEMA_VERSION,
    localDate,
    timezone,
    language,
    status: "confirmed",
    checkIn: {
      ...(normalized.energy !== undefined ? { energy: normalized.energy } : {}),
      ...(normalized.pleasantness !== undefined
        ? { pleasantness: normalized.pleasantness }
        : {}),
      ...(plan.availableMinutes !== undefined
        ? { availableMinutes: plan.availableMinutes }
        : {}),
      ...(stateNote ? { stateNote } : {}),
    },
    // Firestore rejects explicit `undefined` values produced by optional edits.
    plan: toFirestoreSafeValue(plan),
    execution: {
      completedItemIds: [],
    },
  };
}

export function dailyResetDataFromDocument(
  document: AppADailyPlanDocument,
  fallbackBrainDump = "",
): DailyResetData {
  const minutes = document.checkIn.availableMinutes;
  return {
    ...(document.checkIn.energy !== undefined
      ? { energy: document.checkIn.energy as DailyResetData["energy"] }
      : {}),
    ...(document.checkIn.pleasantness !== undefined
      ? { pleasantness: document.checkIn.pleasantness as DailyResetData["pleasantness"] }
      : {}),
    ...(minutes !== undefined
      ? {
          availableTime: {
            type: "custom" as const,
            customHours: Math.floor(minutes / 60),
            customMinutes: minutes % 60,
          },
        }
      : {}),
    stateNote: document.checkIn.stateNote || "",
    brainDump: fallbackBrainDump,
  };
}

/** Restores an explicitly supplied capacity from legacy document envelopes. */
export function planDraftFromDocument(document: AppADailyPlanDocument): DailyPlanDraft {
  const availableMinutes = document.plan.availableMinutes ?? document.checkIn.availableMinutes;
  return availableMinutes === undefined
    ? document.plan
    : { ...document.plan, availableMinutes };
}

/**
 * Read/envelope validator for persisted updatedAt.
 * Strictly accepts:
 * - undefined (optional field)
 * - valid ISO 8601 string (for backwards compatibility with existing stored documents)
 * - Firestore Timestamp instance (or valid Timestamp object with numeric seconds, nanoseconds, and toDate)
 *
 * Strictly REJECTS:
 * - FieldValue / serverTimestamp sentinel
 * - Date instance
 * - number (positive, zero, negative, NaN, Infinity)
 * - null
 * - empty object `{}`
 * - arbitrary object
 * - invalid or non-ISO string
 */
export function isValidUpdatedAt(value: unknown): boolean {
  if (value === undefined) return true;
  if (value === null) return false;
  if (typeof value === "number") return false;
  if (value instanceof Date) return false;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    // Strict ISO 8601 regex: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    const isoRegex =
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)?)?$/;
    if (!isoRegex.test(trimmed)) return false;
    const time = Date.parse(trimmed);
    return !isNaN(time);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    // Strictly reject FieldValue sentinels (e.g. serverTimestamp())
    if (
      typeof record._methodName === "string" ||
      record.constructor?.name === "FieldValue"
    ) {
      return false;
    }

    // Firestore Timestamp: has numeric seconds and nanoseconds, and toDate function or Timestamp shape
    const hasSeconds = typeof record.seconds === "number" && Number.isFinite(record.seconds);
    const hasNanos =
      typeof record.nanoseconds === "number" &&
      Number.isFinite(record.nanoseconds) &&
      record.nanoseconds >= 0 &&
      record.nanoseconds < 1e9;
    const hasToDate = typeof record.toDate === "function";

    if (hasSeconds && hasNanos) {
      if (hasToDate || record.constructor?.name === "Timestamp") {
        return true;
      }
      // Pure Timestamp plain object { seconds, nanoseconds }
      const allowedKeys = new Set(["seconds", "nanoseconds", "toDate"]);
      const allKeysValid = Object.keys(record).every((k) => allowedKeys.has(k));
      if (allKeysValid) {
        return true;
      }
    }

    return false;
  }

  return false;
}

export function isAppADailyPlanDocument(
  value: unknown,
): value is AppADailyPlanDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppADailyPlanDocument>;
  const hasValidEnvelope = (
    candidate.schemaVersion === APP_A_DAILY_PLAN_SCHEMA_VERSION &&
    candidate.status === "confirmed" &&
    typeof candidate.localDate === "string" &&
    typeof candidate.timezone === "string" &&
    (candidate.language === "en" || candidate.language === "sr" || candidate.language === "tr") &&
    !!candidate.checkIn &&
    typeof candidate.checkIn === "object" &&
    !!candidate.plan &&
    typeof candidate.plan === "object" &&
    (!candidate.execution ||
      (Array.isArray(candidate.execution.completedItemIds) &&
        candidate.execution.completedItemIds.every((id) => typeof id === "string"))) &&
    isValidUpdatedAt(candidate.updatedAt)
  );
  if (!hasValidEnvelope) return false;

  try {
    return validatePlanDraft(candidate.plan as DailyPlanDraft).valid;
  } catch {
    return false;
  }
}
