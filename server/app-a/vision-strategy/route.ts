import type { Request, Response } from "express";
import { isVisionDecompositionResult, isVisionFeasibilityResult, isVisionStrategyResult } from "../../../src/shared/domain/vision";
export { isVisionDecompositionResult, isVisionFeasibilityResult, isVisionStrategyResult } from "../../../src/shared/domain/vision";

export interface VisionStrategyRequest {
  language: "en" | "sr" | "tr";
  idea: string;
  mode?: "strategy";
}

export interface VisionDecompositionRequest {
  language: "en" | "sr" | "tr";
  idea: string;
  mode: "decompose";
  step: string;
  depth: number;
}
export interface VisionFeasibilityRequest {
  language: "en" | "sr" | "tr";
  idea: string;
  mode: "feasibility";
  timeframe?: string;
}

export type VisionStrategyGenerator = (input: VisionStrategyRequest | VisionDecompositionRequest | VisionFeasibilityRequest) => Promise<unknown>;

export function createVisionStrategyRoute(generate: VisionStrategyGenerator) {
  return async (req: Request, res: Response) => {
    const language = req.body?.language;
    const idea = typeof req.body?.idea === "string" ? req.body.idea.trim() : "";
    const mode = req.body?.mode === "decompose" ? "decompose" : req.body?.mode === "feasibility" ? "feasibility" : "strategy";
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
        const result = await generate({ language, idea, mode, step, depth });
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
    try {
      const result = await generate({ language, idea, mode: "strategy" });
      if (!isVisionStrategyResult(result)) {
        return res.status(502).json({ success: false, code: "INVALID_AI_RESPONSE" });
      }
      return res.status(200).json({ success: true, strategy: result });
    } catch {
      return res.status(503).json({ success: false, code: "AI_UNAVAILABLE" });
    }
  };
}
