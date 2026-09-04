import type { SavedVisionStrategy } from "../vision";

export type TodayCandidateStatus = "pending" | "scheduled" | "completed" | "dismissed";

export interface TodayCandidate {
  id: string;
  source: "vision";
  sourceId: string;
  title: string;
  estimatedMinutes: number;
  status: TodayCandidateStatus;
  sequenceIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export function createTodayCandidateId(sourceId?: string): string {
  if (sourceId) {
    const normalized = sourceId.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^vision_/, "").slice(0, 80);
    if (normalized.length >= 4) return `candidate_${normalized}`;
  }
  return `candidate_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isTodayCandidate(value: unknown): value is TodayCandidate {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && /^candidate_[a-z0-9_]{4,80}$/.test(item.id) &&
    item.source === "vision" && typeof item.sourceId === "string" && item.sourceId.length > 0 && item.sourceId.length <= 128 &&
    typeof item.title === "string" && item.title.trim().length >= 3 && item.title.length <= 240 &&
    typeof item.estimatedMinutes === "number" && Number.isInteger(item.estimatedMinutes) && item.estimatedMinutes >= 5 && item.estimatedMinutes <= 480 &&
    (["pending", "scheduled", "completed", "dismissed"] as unknown[]).includes(item.status) &&
    (item.sequenceIndex === undefined || (typeof item.sequenceIndex === "number" && Number.isInteger(item.sequenceIndex) && item.sequenceIndex >= 0 && item.sequenceIndex <= 25)) &&
    typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt)) &&
    typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt));
}

export function getVisionStepSequence(document: SavedVisionStrategy): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    const text = value.trim();
    const key = text.toLocaleLowerCase();
    if (text.length >= 3 && !seen.has(key)) { seen.add(key); result.push(text); }
  };
  add(document.strategy.nextStep);
  for (const milestone of document.strategy.milestones) for (const step of milestone.steps) add(step);
  return result.slice(0, 26);
}

export function createSequencedVisionCandidate(document: SavedVisionStrategy, sequenceIndex: number, now = new Date().toISOString()): TodayCandidate | null {
  const title = getVisionStepSequence(document)[sequenceIndex];
  if (!title) return null;
  const identity = sequenceIndex === 0 ? document.id : `${document.id}_step_${sequenceIndex}`;
  return { id: createTodayCandidateId(identity), source: "vision", sourceId: document.id, title, estimatedMinutes: 25, status: "pending", sequenceIndex, createdAt: now, updatedAt: now };
}

export function getNextVisionSequenceIndex(candidates: TodayCandidate[], sourceId: string): number | null {
  const related = candidates.filter((candidate) => candidate.sourceId === sourceId);
  if (related.some((candidate) => candidate.status === "pending" || candidate.status === "scheduled")) return null;
  let index = 0;
  while (related.some((candidate) => (candidate.sequenceIndex ?? 0) === index && candidate.status === "completed")) index += 1;
  return related.some((candidate) => (candidate.sequenceIndex ?? 0) === index && candidate.status === "dismissed") ? null : index;
}
