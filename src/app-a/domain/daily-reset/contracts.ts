export type SupportedLanguage = "en" | "sr" | "tr";
export type FiveLevelRating = 1 | 2 | 3 | 4 | 5;

export interface DailyResetInput {
  brainDump: string;
  language: SupportedLanguage;
  energy?: FiveLevelRating;
  pleasantness?: FiveLevelRating;
  availableMinutes?: number;
  stateNote?: string;
}

export interface ClarificationAnswer {
  questionId: string;
  answer: string;
}

export interface DailyResetClarificationSubmission extends DailyResetInput {
  clarificationAnswers: ClarificationAnswer[];
}

export type BrainDumpItemKind = "task" | "idea" | "worry" | "fact" | "waiting_for";

export type TimeHorizon = "today" | "this_week" | "later" | "long_term_idea" | "no_action";

export type PlanBlock = "first_focus" | "later_today" | "if_capacity_remains";

export type RequiredEnergy = 1 | 2 | 3 | 4 | 5;

export type TimeSensitivity = "none" | "soft" | "deadline" | "urgent";

export interface PriorityFactors {
  consequence?: 1 | 2 | 3 | 4 | 5;
  urgency?: 1 | 2 | 3 | 4 | 5;
  goalContribution?: 1 | 2 | 3 | 4 | 5;
  mentalLoad?: 1 | 2 | 3 | 4 | 5;
  dependencyPressure?: 1 | 2 | 3 | 4 | 5;
  explanation: string;
}

export interface GoalRelationship {
  goalId?: string;
  goalTitle?: string;
  projectId?: string;
  projectTitle?: string;
  relationshipExplanation?: string;
}

export interface ClassifiedBrainDumpItem {
  id: string;
  originalText: string;
  kind: BrainDumpItemKind;
  timeHorizon: TimeHorizon;
  suggestedAction?: string;
  estimatedMinutes?: number;
  requiredEnergy?: RequiredEnergy;
  timeSensitivity: TimeSensitivity;
  deadlineText?: string;
  deadlineIso?: string;
  isAmbiguous: boolean;
  needsCheck: boolean;
  relatedQuestionId?: string;
  priority: PriorityFactors;
  goalRelationship?: GoalRelationship;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  context: string;
  relatedItemIds: string[];
  materialImpact:
    | "priority"
    | "deadline"
    | "duration"
    | "classification"
    | "goal_relationship"
    | "other";
}

export interface ClarificationNeededResponse {
  success: true;
  phase: "clarification_needed";
  questions: ClarificationQuestion[];
}

export interface DailyPlanItem {
  id: string;
  sourceItemIds: string[];
  title: string;
  description?: string;
  block: PlanBlock;
  estimatedMinutes: number;
  requiredEnergy: RequiredEnergy;
  timeSensitivity: TimeSensitivity;
  deadlineText?: string;
  deadlineIso?: string;
  priority: PriorityFactors;
  goalRelationship?: GoalRelationship;
  reasoning?: string;
  needsCheck: boolean;
}

export interface SafeIntervention {
  type: "environment" | "movement" | "breathing" | "rest" | "hydration" | "light" | "focus";
  title: string;
  description: string;
  estimatedMinutes: number;
  reason: string;
}

export interface DailyPlanDraft {
  classifiedItems: ClassifiedBrainDumpItem[];
  firstFocus: DailyPlanItem[];
  laterToday: DailyPlanItem[];
  ifCapacityRemains: DailyPlanItem[];
  deferredItems: ClassifiedBrainDumpItem[];
  longTermIdeas: ClassifiedBrainDumpItem[];
  nonActionItems: ClassifiedBrainDumpItem[];
  planRationale: string;
  intervention?: SafeIntervention;
  availableMinutes?: number;
  plannedRequiredMinutes: number; // Sum of firstFocus + laterToday
  plannedOptionalMinutes: number; // Sum of ifCapacityRemains
}

export interface PlanReadyResponse {
  success: true;
  phase: "plan_ready";
  draft: DailyPlanDraft;
}

export type DailyResetErrorCode =
  | "invalid_input"
  | "clarification_required"
  | "invalid_ai_response"
  | "capacity_exceeded"
  | "rate_limited"
  | "service_unavailable"
  | "timeout"
  | "unknown";

export interface DailyResetErrorResponse {
  success: false;
  phase: "error";
  code: DailyResetErrorCode;
  error: string;
  retryable: boolean;
  fieldErrors?: Partial<
    Record<
      | "brainDump"
      | "language"
      | "energy"
      | "pleasantness"
      | "availableMinutes"
      | "stateNote"
      | "clarificationAnswers",
      string
    >
  >;
}

export type DailyResetApiResponse =
  | ClarificationNeededResponse
  | PlanReadyResponse
  | DailyResetErrorResponse;

export type IdFactory = () => string;
