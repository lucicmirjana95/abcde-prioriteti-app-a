import type { VisionDecompositionResult, VisionFeasibilityResult, VisionStrategyResult } from "../../shared/domain/vision";
import type { AppALanguage } from "../types";

export async function createVisionStrategy(
  idea: string,
  language: AppALanguage,
  signal?: AbortSignal,
): Promise<VisionStrategyResult> {
  const response = await fetch("/api/app-a/vision-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, language }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.strategy) throw new Error("vision_strategy_failed");
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, timeframe: timeframe.trim() || undefined, language, mode: "feasibility" }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.feasibility) throw new Error("vision_feasibility_failed");
  return body.feasibility as VisionFeasibilityResult;
}

export async function decomposeVisionStep(input: { idea: string; step: string; depth: number; language: AppALanguage }, signal?: AbortSignal): Promise<VisionDecompositionResult> {
  const response = await fetch("/api/app-a/vision-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, mode: "decompose" }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.decomposition) throw new Error("vision_decomposition_failed");
  return body.decomposition as VisionDecompositionResult;
}
