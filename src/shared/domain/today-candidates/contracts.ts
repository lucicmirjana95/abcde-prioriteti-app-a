export type TodayCandidateStatus = "pending" | "dismissed";

export interface TodayCandidate {
  id: string;
  source: "vision";
  sourceId: string;
  title: string;
  estimatedMinutes: number;
  status: TodayCandidateStatus;
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
    (item.status === "pending" || item.status === "dismissed") &&
    typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt)) &&
    typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt));
}
