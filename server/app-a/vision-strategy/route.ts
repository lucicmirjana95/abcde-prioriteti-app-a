import type { Request, Response } from "express";
import { isVisionDecompositionResult, isVisionFeasibilityResult, isVisionStepRefinementResult, isVisionStrategyResult } from "../../../src/shared/domain/vision";
export { isVisionDecompositionResult, isVisionFeasibilityResult, isVisionStepRefinementResult, isVisionStrategyResult } from "../../../src/shared/domain/vision";

export interface VisionStrategyRequest {
  planningContext?: string;
  language: "en" | "sr" | "tr";
  idea: string;
  mode?: "strategy";
}

export interface VisionDecompositionRequest {
  planningContext?: string;
  language: "en" | "sr" | "tr";
  idea: string;
  mode: "decompose";
  step: string;
  depth: number;
}
export interface VisionFeasibilityRequest {
  planningContext?: string;
  language: "en" | "sr" | "tr";
  idea: string;
  mode: "feasibility";
  timeframe?: string;
}
export interface VisionStepRefinementRequest {
  planningContext?: string;
  language: "en" | "sr" | "tr";
  idea: string;
  mode: "refine_step";
  step: string;
  userFeedback?: string;
  selectedIssues?: string[];
  currentOutcome?: string;
  timeframe?: string;
  previousSteps?: string[];
  nextSteps?: string[];
}

export type VisionStrategyGenerator = (input: VisionStrategyRequest | VisionDecompositionRequest | VisionFeasibilityRequest | VisionStepRefinementRequest) => Promise<unknown>;

export function createVisionStrategyRoute(generate: VisionStrategyGenerator) {
  return async (req: Request, res: Response) => {
    const language = req.body?.language;
    const planningContext = req.body?.planningContext;
    if (planningContext !== undefined && (typeof planningContext !== 'string' || planningContext.length > 16000)) return res.status(400).json({ success: false, code: 'INVALID_CONTEXT' });
    const idea = typeof req.body?.idea === "string" ? req.body.idea.trim() : "";
    const mode = req.body?.mode === "decompose" ? "decompose" : req.body?.mode === "feasibility" ? "feasibility" : req.body?.mode === "refine_step" ? "refine_step" : "strategy";
    if (!(["en", "sr", "tr"] as const).includes(language) || idea.length < 3 || idea.length > 4000) {
      return res.status(400).json({ success: false, code: "INVALID_INPUT" });
    }
    if (mode === "decompose") {
      const step = typeof req.body?.step === "string" ? req.body.step.trim() : "";
      const depth = req.body?.depth;
      if (step.length < 3 || step.length > 500 || !Number.isInteger(depth) || depth < 0 || depth >= 2) {
        return res.status(400).json({ success: false, code: "INVALID_DECOMPOSITION" });
      }
      try {
        const result = await generate({ language, idea, mode, step, depth, ...(planningContext ? { planningContext } : {}) });
        if (!isVisionDecompositionResult(result)) return res.status(502).json({ success: false, code: "INVALID_AI_RESPONSE" });
        return res.status(200).json({ success: true, decomposition: result });
      } catch {
        return res.status(503).json({ success: false, code: "AI_UNAVAILABLE" });
      }
    }
    if (mode === "feasibility") {
      const timeframe = typeof req.body?.timeframe === "string" ? req.body.timeframe.trim() : undefined;
      if (timeframe && timeframe.length > 200) return res.status(400).json({ success: false, code: "INVALID_TIMEFRAME" });
      try {
        const result = await generate({ language, idea, mode, ...(timeframe ? { timeframe } : {}) });
        if (!isVisionFeasibilityResult(result)) return res.status(502).json({ success: false, code: "INVALID_AI_RESPONSE" });
        return res.status(200).json({ success: true, feasibility: result });
      } catch {
        return res.status(503).json({ success: false, code: "AI_UNAVAILABLE" });
      }
    }
    if (mode === "refine_step") {
      const step = typeof req.body?.step === "string" ? req.body.step.trim() : "";
      if (step.length < 3 || step.length > 500) {
        return res.status(400).json({ success: false, code: "INVALID_STEP" });
      }
      const userFeedback = typeof req.body?.userFeedback === "string" ? req.body.userFeedback.slice(0, 1000) : undefined;
      const selectedIssues = Array.isArray(req.body?.selectedIssues) ? req.body.selectedIssues.filter((s: unknown) => typeof s === "string" && s.length <= 100).slice(0, 10) : undefined;
      const currentOutcome = typeof req.body?.currentOutcome === "string" ? req.body.currentOutcome.slice(0, 500) : undefined;
      const timeframe = typeof req.body?.timeframe === "string" ? req.body.timeframe.slice(0, 200) : undefined;
      const previousSteps = Array.isArray(req.body?.previousSteps) ? req.body.previousSteps.filter((s: unknown) => typeof s === "string" && s.length <= 300).slice(0, 10) : undefined;
      const nextSteps = Array.isArray(req.body?.nextSteps) ? req.body.nextSteps.filter((s: unknown) => typeof s === "string" && s.length <= 300).slice(0, 10) : undefined;
      try {
        const result = await generate({
          language,
          idea,
          mode: "refine_step",
          step,
          userFeedback,
          selectedIssues,
          currentOutcome,
          timeframe,
          previousSteps,
          nextSteps,
          ...(planningContext ? { planningContext } : {}),
        });
        if (!isVisionStepRefinementResult(result)) return res.status(502).json({ success: false, code: "INVALID_AI_RESPONSE" });
        return res.status(200).json({ success: true, refinement: result });
      } catch {
        return res.status(503).json({ success: false, code: "AI_UNAVAILABLE" });
      }
    }
    try {
      const result = await generate({ language, idea, mode: "strategy", ...(planningContext ? { planningContext } : {}) });
      if (!isVisionStrategyResult(result)) {
        return res.status(502).json({ success: false, code: "INVALID_AI_RESPONSE" });
      }
      return res.status(200).json({ success: true, strategy: result });
    } catch {
      return res.status(503).json({ success: false, code: "AI_UNAVAILABLE" });
    }
  };
}
