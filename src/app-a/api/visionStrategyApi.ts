import type { VisionDecompositionResult, VisionFeasibilityResult, VisionStepRefinementResult, VisionStrategyResult } from "../../shared/domain/vision";
import type { AppALanguage } from "../types";
import { appAAuthHeaders } from './authHeaders';

export async function createVisionStrategy(
  idea: string,
  language: AppALanguage,
  signal?: AbortSignal,
  planningContext?: string,
): Promise<VisionStrategyResult> {
  const response = await fetch("/api/app-a/vision-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await appAAuthHeaders() },
    body: JSON.stringify({ idea, language, planningContext }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.strategy) {
    if (response.status === 401 || body?.code === "authentication_required") throw new Error("authentication_required");
    throw new Error("vision_strategy_failed");
  }
  return body.strategy as VisionStrategyResult;
}

export async function assessVisionFeasibility(
  idea: string,
  timeframe: string,
  language: AppALanguage,
  signal?: AbortSignal,
): Promise<VisionFeasibilityResult> {
  const response = await fetch("/api/app-a/vision-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await appAAuthHeaders() },
    body: JSON.stringify({ idea, timeframe: timeframe.trim() || undefined, language, mode: "feasibility" }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.feasibility) {
    if (response.status === 401 || body?.code === "authentication_required") throw new Error("authentication_required");
    throw new Error("vision_feasibility_failed");
  }
  return body.feasibility as VisionFeasibilityResult;
}

export async function decomposeVisionStep(input: { idea: string; step: string; depth: number; language: AppALanguage; planningContext?: string }, signal?: AbortSignal): Promise<VisionDecompositionResult> {
  const response = await fetch("/api/app-a/vision-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await appAAuthHeaders() },
    body: JSON.stringify({ ...input, mode: "decompose" }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.decomposition) {
    if (response.status === 401 || body?.code === "authentication_required") throw new Error("authentication_required");
    throw new Error("vision_decomposition_failed");
  }
  return body.decomposition as VisionDecompositionResult;
}

export async function refineVisionStep(
  input: {
    idea: string;
    step: string;
    language: AppALanguage;
    userFeedback?: string;
    selectedIssues?: string[];
    currentOutcome?: string;
    timeframe?: string;
    previousSteps?: string[];
    nextSteps?: string[];
    planningContext?: string;
  },
  signal?: AbortSignal
): Promise<VisionStepRefinementResult> {
  const response = await fetch("/api/app-a/vision-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await appAAuthHeaders() },
    body: JSON.stringify({ ...input, mode: "refine_step" }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.refinement) {
    if (response.status === 401 || body?.code === "authentication_required") throw new Error("authentication_required");
    throw new Error("vision_refinement_failed");
  }
  return body.refinement as VisionStepRefinementResult;
}
