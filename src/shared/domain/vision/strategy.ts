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
  if (item.status === "unrealistic_for_timeframe" && item.questions.length > 0) return false;
  if (item.status === "insufficient_information" && item.questions.length === 0) return false;
  if (item.status === "insufficient_information" && (item.adjustedGoal || item.adjustedTimeframe)) return false;
  return true;
}

export function normalizeVisionFeasibilityResult(value: unknown): VisionFeasibilityResult | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;

  const allowedStatuses = ["feasible", "feasible_with_assumptions", "unrealistic_for_timeframe", "insufficient_information"] as const;
  if (!allowedStatuses.includes(item.status as any)) return null;
  let status = item.status as VisionFeasibilityResult["status"];

  const normalizedGoal = typeof item.normalizedGoal === "string" ? item.normalizedGoal.trim() : "";
  if (normalizedGoal.length === 0 || normalizedGoal.length > 4000) return null;

  const reason = typeof item.reason === "string" ? item.reason.trim() : "";
  if (reason.length === 0 || reason.length > 500) return null;

  const assumptions = Array.isArray(item.assumptions)
    ? item.assumptions
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .map((a) => a.trim().slice(0, 240))
        .slice(0, 5)
    : [];

  let rawQuestions = Array.isArray(item.questions)
    ? item.questions
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .map((q) => q.trim().slice(0, 240))
        .slice(0, 3)
    : [];

  let adjustedGoal = typeof item.adjustedGoal === "string" && item.adjustedGoal.trim().length > 0
    ? item.adjustedGoal.trim().slice(0, 4000)
    : undefined;

  let adjustedTimeframe = typeof item.adjustedTimeframe === "string" && item.adjustedTimeframe.trim().length > 0
    ? item.adjustedTimeframe.trim().slice(0, 200)
    : undefined;

  // Requirement: A response containing material questions and an adjusted goal must normalize to:
  // - status: insufficient_information
  // - retain no more than 3 questions
  // - omit adjustedGoal and adjustedTimeframe
  if (rawQuestions.length > 0 && (adjustedGoal !== undefined || adjustedTimeframe !== undefined)) {
    status = "insufficient_information";
    adjustedGoal = undefined;
    adjustedTimeframe = undefined;
  }

  // Requirement: A response with unrealistic_for_timeframe and questions must not pass validation.
  if (status === "unrealistic_for_timeframe" && rawQuestions.length > 0) {
    return null;
  }

  if (status === "insufficient_information") {
    adjustedGoal = undefined;
    adjustedTimeframe = undefined;
    if (rawQuestions.length === 0) {
      return null;
    }
  }

  if (status === "unrealistic_for_timeframe") {
    if (!adjustedGoal && !adjustedTimeframe) {
      return null;
    }
    rawQuestions = [];
  }

  if (status === "feasible" || status === "feasible_with_assumptions") {
    adjustedGoal = undefined;
    adjustedTimeframe = undefined;
  }

  const candidate: VisionFeasibilityResult = {
    status,
    normalizedGoal,
    reason,
    assumptions,
    questions: rawQuestions,
    ...(adjustedGoal ? { adjustedGoal } : {}),
    ...(adjustedTimeframe ? { adjustedTimeframe } : {}),
  };

  return isVisionFeasibilityResult(candidate) ? candidate : null;
}

export function normalizeVisionStrategyResult(value: unknown): VisionStrategyResult | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;

  const outcome = typeof item.outcome === "string" ? item.outcome.trim() : "";
  const importance = typeof item.importance === "string" ? item.importance.trim() : "";
  const nextStep = typeof item.nextStep === "string" ? item.nextStep.trim() : "";

  if (!outcome || outcome.length > 500 || !importance || importance.length > 500 || !nextStep || nextStep.length > 300) {
    return null;
  }

  if (!Array.isArray(item.milestones) || item.milestones.length === 0) return null;

  const milestones = item.milestones
    .slice(0, 5)
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const row = m as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim().slice(0, 200) : "";
      const result = typeof row.result === "string" ? row.result.trim().slice(0, 500) : "";
      const steps = Array.isArray(row.steps)
        ? row.steps
            .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
            .map((s) => s.trim().slice(0, 300))
            .slice(0, 5)
        : [];
      if (!title || !result || steps.length === 0) return null;
      return { title, result, steps };
    })
    .filter((m): m is { title: string; result: string; steps: string[] } => m !== null);

  if (milestones.length === 0) return null;

  const risks = Array.isArray(item.risks)
    ? item.risks
        .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
        .map((r) => r.trim().slice(0, 300))
        .slice(0, 5)
    : [];

  const assumptions = Array.isArray(item.assumptions)
    ? item.assumptions
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .map((a) => a.trim().slice(0, 300))
        .slice(0, 5)
    : [];

  const candidate: VisionStrategyResult = {
    outcome,
    importance,
    milestones,
    risks,
    assumptions,
    nextStep,
  };

  return isVisionStrategyResult(candidate) ? candidate : null;
}

