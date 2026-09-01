import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import type { AppALanguage, DailyResetData } from "../types";
import { convertDataToInput } from "../screens/todayFlow";
import { validatePlanDraft } from "../domain/daily-reset/validation";

export const APP_A_DAILY_PLAN_SCHEMA_VERSION = 1 as const;

function toFirestoreSafeValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface AppADailyPlanDocument {
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
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDateKeyInTimeZone(timezone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
    const year = value("year");
    const month = value("month");
    const day = value("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid zones normally cannot reach this path because preferences are validated.
  }
  return getLocalDateKey(date);
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
      ...(normalized.availableMinutes !== undefined
        ? { availableMinutes: normalized.availableMinutes }
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
    brainDump: "",
  };
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
        candidate.execution.completedItemIds.every((id) => typeof id === "string")))
  );
  if (!hasValidEnvelope) return false;

  try {
    return validatePlanDraft(candidate.plan as DailyPlanDraft).valid;
  } catch {
    return false;
  }
}
