import type { AppALanguage } from "../../../app-a/types";
import { isVisionStrategyResult, type VisionStrategyResult } from "./strategy";

export interface SavedVisionStrategy {
  id: string;
  idea: string;
  language: AppALanguage;
  strategy: VisionStrategyResult;
  stepBreakdowns: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  status?: "active" | "archived";
  archivedAt?: string;
  planningContext?: {
    timeframe?: string;
    clarificationDetails?: string;
  };
}

export function createVisionStrategyId(): string {
  return `vision_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isSavedVisionStrategy(value: unknown): value is SavedVisionStrategy {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && /^vision_[a-z0-9_]{4,80}$/.test(item.id) &&
    typeof item.idea === "string" && item.idea.trim().length >= 3 && item.idea.length <= 4000 &&
    (["en", "sr", "tr"] as unknown[]).includes(item.language) &&
    isVisionStrategyResult(item.strategy) && isValidBreakdowns(item.stepBreakdowns) &&
    typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt)) &&
    typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt)) &&
    (item.status === undefined || item.status === "active" || item.status === "archived") &&
    (item.archivedAt === undefined || (typeof item.archivedAt === "string" && !Number.isNaN(Date.parse(item.archivedAt)))) &&
    (item.planningContext === undefined || isPlanningContext(item.planningContext)) &&
    (item.status !== "archived" || typeof item.archivedAt === "string");
}

function isPlanningContext(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (item.timeframe === undefined || (typeof item.timeframe === "string" && item.timeframe.length <= 200)) &&
    (item.clarificationDetails === undefined || (typeof item.clarificationDetails === "string" && item.clarificationDetails.length <= 4000));
}

function isValidBreakdowns(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, steps]) => /^m\d+-s\d+(?:-d\d+)?$/.test(key) && Array.isArray(steps) && steps.length >= 2 && steps.length <= 5 && steps.every((step) => typeof step === "string" && step.trim().length > 0 && step.length <= 240));
}
