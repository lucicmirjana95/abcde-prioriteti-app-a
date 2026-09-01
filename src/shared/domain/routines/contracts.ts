export type RoutineLanguage = "en" | "sr" | "tr";

export type RoutineStatus = "active" | "paused" | "archived";

export type RoutineSource = "user" | "ai_suggested" | "legacy_import";

export type RoutineExecutionStatus = "full" | "minimum" | "skipped" | "paused";

export type RoutineSourceApp = "app_a" | "app_b" | "app_c";

export type RoutineWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RoutineRecurrence =
  | { type: "daily" }
  | { type: "selected_weekdays"; weekdays: RoutineWeekday[] };

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
}

export interface DailyRoutineSnapshot {
  routine: SharedRoutine;
  completion?: RoutineCompletion;
}

