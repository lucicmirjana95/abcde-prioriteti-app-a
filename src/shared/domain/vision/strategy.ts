export interface VisionStrategyResult {
  outcome: string;
  importance: string;
  milestones: Array<{ title: string; result: string; steps: string[] }>;
  risks: string[];
  assumptions: string[];
  nextStep: string;
}

export interface VisionDecompositionResult {
  shouldDecompose: boolean;
  reason: "already_actionable" | "multiple_actions" | "unclear_deliverable" | "too_broad";
  substeps: string[];
}

export interface VisionFeasibilityResult {
  status: "feasible" | "feasible_with_assumptions" | "unrealistic_for_timeframe" | "insufficient_information";
  normalizedGoal: string;
  reason: string;
  assumptions: string[];
  questions: string[];
  adjustedGoal?: string;
  adjustedTimeframe?: string;
}

function isText(value: unknown, max = 500): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export function isVisionStrategyResult(value: unknown): value is VisionStrategyResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (!isText(item.outcome) || !isText(item.importance)) return false;
  if (!Array.isArray(item.milestones) || item.milestones.length < 1 || item.milestones.length > 5) return false;
  if (!item.milestones.every((milestone) => {
    if (!milestone || typeof milestone !== "object") return false;
    const row = milestone as Record<string, unknown>;
    return isText(row.title, 200) && isText(row.result) && Array.isArray(row.steps) && row.steps.length >= 1 && row.steps.length <= 5 && row.steps.every((step) => isText(step, 300));
  })) return false;
  if (!Array.isArray(item.risks) || item.risks.length > 5 || !item.risks.every((risk) => isText(risk, 300))) return false;
  if (!Array.isArray(item.assumptions) || item.assumptions.length > 5 || !item.assumptions.every((assumption) => isText(assumption, 300))) return false;
  return isText(item.nextStep, 300);
}

export function isVisionDecompositionResult(value: unknown): value is VisionDecompositionResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (typeof item.shouldDecompose !== "boolean") return false;
  if (!(["already_actionable", "multiple_actions", "unclear_deliverable", "too_broad"] as unknown[]).includes(item.reason)) return false;
  if (!Array.isArray(item.substeps) || item.substeps.length > 5 || !item.substeps.every((step) => isText(step, 240))) return false;
  return item.shouldDecompose ? item.substeps.length >= 2 : item.substeps.length === 0 && item.reason === "already_actionable";
}

export function isVisionFeasibilityResult(value: unknown): value is VisionFeasibilityResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (!(["feasible", "feasible_with_assumptions", "unrealistic_for_timeframe", "insufficient_information"] as unknown[]).includes(item.status)) return false;
  if (!isText(item.normalizedGoal, 4000) || !isText(item.reason, 500)) return false;
  if (!Array.isArray(item.assumptions) || item.assumptions.length > 5 || !item.assumptions.every((value) => isText(value, 240))) return false;
  if (!Array.isArray(item.questions) || item.questions.length > 3 || !item.questions.every((value) => isText(value, 240))) return false;
  if (item.adjustedGoal !== undefined && !isText(item.adjustedGoal, 4000)) return false;
  if (item.adjustedTimeframe !== undefined && !isText(item.adjustedTimeframe, 200)) return false;
  if (item.status === "unrealistic_for_timeframe" && !item.adjustedGoal && !item.adjustedTimeframe) return false;
  if (item.status === "insufficient_information" && item.questions.length === 0) return false;
  return true;
}
