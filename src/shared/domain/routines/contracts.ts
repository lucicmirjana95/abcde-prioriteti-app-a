export type RoutineLanguage = "en" | "sr" | "tr";

export type RoutineStatus = "active" | "paused" | "archived";

export type RoutineSource = "user" | "ai_suggested" | "legacy_import";

export type RoutineExecutionStatus = "full" | "minimum" | "skipped" | "paused";

export type RoutineSourceApp = "app_a" | "app_b" | "app_c";

export type RoutineWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RoutineRecurrence =
  | { type: "daily" }
  | { type: "selected_weekdays"; weekdays: RoutineWeekday[] };

export type RoutineFrequency =
  | { kind: "daily" }
  | { kind: "weekdays" }
  | { kind: "selected_days"; daysOfWeek: number[] }
  | { kind: "times_per_week"; count: number };

export type RoutineOrigin =
  | { kind: "manual" }
  | {
      kind: "vision";
      visionId: string;
      visionStepId?: string;
      sourceFingerprint: string;
    }
  | {
      kind: "inbox";
      inboxItemId: string;
      sourceFingerprint: string;
    }
  | { kind: "ai_suggested" }
  | { kind: "legacy_import" };

export type RoutineCue =
  | { type: "after_activity"; activity: string }
  | { type: "time_and_place"; time?: string; place?: string }
  | { type: "custom"; prompt: string };

export interface RoutineGoalRelationship {
  goalId: string;
  milestoneId?: string;
  explanation?: string;
}

/**
 * Pure cross-app routine contract. Ownership is provided by the repository path,
 * so a user ID is intentionally not duplicated in the domain object.
 */
export interface SharedRoutine {
  id: string;
  title: string;
  fullAction: string;
  minimumAction: string;
  recurrence: RoutineRecurrence;
  status: RoutineStatus;
  cue?: RoutineCue;
  timeZone: string;
  language: RoutineLanguage;
  source: RoutineSource;
  sortOrder: number;
  goalRelationships: RoutineGoalRelationship[];
  activeFrom: string;
  pausedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Phase 1A Backward-compatible extensions
  estimatedMinutes?: number;
  frequency?: RoutineFrequency;
  origin?: RoutineOrigin;
  revision?: number;
  why?: string;
  preferredTime?: string;
  needsDuration?: boolean;
  needsSchedule?: boolean;
  mutationId?: string;
}

export interface RoutineMutationReceipt {
  mutationId: string;
  routineId: string;
  payloadFingerprint: string;
  createdAt: string;
}

/**
 * One record per routine and local calendar date. Absence of a record means
 * "not recorded" and must never be interpreted as "skipped".
 */
export interface RoutineCompletion {
  routineId: string;
  localDate: string;
  status: RoutineExecutionStatus;
  sourceApp: RoutineSourceApp;
  recordedAt: string;
  completedAt?: string;
  timeZone?: string;
}

export interface DailyRoutineSnapshot {
  routine: SharedRoutine;
  completion?: RoutineCompletion;
}

export type RoutineAvailabilityStatus =
  | "scheduled_today"
  | "available_flexible"
  | "weekly_target_met"
  | "not_scheduled_today"
  | "paused"
  | "archived"
  | "needs_schedule"
  | "invalid";

export interface RoutineWeeklyProgress {
  targetCount: number;
  completedCount: number;
  completedDates: string[];
  isTargetMet: boolean;
}

export interface RoutineAvailabilityResult {
  status: RoutineAvailabilityStatus;
  routine: SharedRoutine;
  isPlannedToday: boolean;
  effectiveFrequency?: RoutineFrequency;
  weeklyProgress?: RoutineWeeklyProgress;
  diagnosticCode?: string;
  reason?: string;
}

