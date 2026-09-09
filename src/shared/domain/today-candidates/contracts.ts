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
  stepKey?: string;
  createdAt: string;
  updatedAt: string;
  /** Read-time UI hint; it is not required in persisted candidate documents. */
  isCurrentFocus?: boolean;
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
    typeof item.title === "string" && item.title.trim().length >= 3 && item.title.length <= 300 &&
    typeof item.estimatedMinutes === "number" && Number.isInteger(item.estimatedMinutes) && item.estimatedMinutes >= 0 && item.estimatedMinutes <= 480 &&
    (["pending", "scheduled", "completed", "dismissed"] as unknown[]).includes(item.status) &&
    (item.sequenceIndex === undefined || (typeof item.sequenceIndex === "number" && Number.isInteger(item.sequenceIndex) && item.sequenceIndex >= 0 && item.sequenceIndex <= 650)) &&
    (item.stepKey === undefined || (typeof item.stepKey === 'string' && /^[a-z0-9_]{1,80}$/.test(item.stepKey))) &&
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
  const visit = (step: string, key: string, depth: number) => {
    const children = document.stepBreakdowns[key];
    if (children?.length && depth < 2) children.forEach((child, index) => visit(child, `${key}-d${index}`, depth + 1));
    else add(step);
  };
  // nextStep must be the first executable leaf, not an additional copy of a milestone.
  const first = document.strategy.milestones[0]?.steps[0];
  if (first?.trim().toLowerCase() !== document.strategy.nextStep.trim().toLowerCase()) add(document.strategy.nextStep);
  document.strategy.milestones.forEach((milestone, m) => milestone.steps.forEach((step, s) => visit(step, `m${m}-s${s}`, 0)));
  return result.slice(0, 650);
}

export function visionStepKey(title: string): string {
  let hash = 2166136261;
  let second = 5381;
  for (const character of title.normalize('NFKC').trim().toLowerCase()) {
    const code = character.codePointAt(0)!;
    hash = Math.imul(hash ^ code, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  return `s_${(hash >>> 0).toString(16)}_${(second >>> 0).toString(16)}`;
}

export interface EstimateVisionStepMinutesInput {
  title?: string;
  existingMinutes?: number | null;
  aiEstimatedMinutes?: number | null;
}

function isValidMinuteEstimate(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 480;
}

export function estimateVisionStepMinutes(
  input?: EstimateVisionStepMinutesInput | string | number | null,
  aiEstimatedMinutes?: number | null,
): number {
  let existing: number | null | undefined;
  let ai: number | null | undefined;

  if (typeof input === "object" && input !== null) {
    existing = input.existingMinutes;
    ai = input.aiEstimatedMinutes;
  } else if (typeof input === "number") {
    existing = input;
    ai = aiEstimatedMinutes;
  } else {
    ai = aiEstimatedMinutes;
  }

  // 1. Koristi postojeći validan estimatedMinutes kada postoji
  if (isValidMinuteEstimate(existing)) {
    return existing;
  }

  // 2. Za novu Vision akciju koristi procenu koju je proizveo AI, ako je dostupna u postojećem toku
  if (isValidMinuteEstimate(ai)) {
    return ai;
  }

  // 3. Ako procena ne postoji, koristi neutralni fallback od 20 minuta
  // 4. Ne uvodi nepouzdane kategorije ili heuristike na osnovu teksta naslova
  return 20;
}

export function createSequencedVisionCandidate(
  document: SavedVisionStrategy,
  sequenceIndex: number,
  now = new Date().toISOString(),
  existingOrAiMinutes?: number | null,
): TodayCandidate | null {
  const title = getVisionStepSequence(document)[sequenceIndex];
  if (!title) return null;
  const stepKey = visionStepKey(title);
  const estimatedMinutes = estimateVisionStepMinutes({
    title,
    existingMinutes: existingOrAiMinutes,
  });
  return { id: createTodayCandidateId(`${document.id}_${stepKey}`), source: "vision", sourceId: document.id, title, estimatedMinutes, status: "pending", sequenceIndex, stepKey, createdAt: now, updatedAt: now };
}

export function getNextVisionSequenceIndex(candidates: TodayCandidate[], sourceId: string): number | null {
  const related = candidates.filter((candidate) => candidate.sourceId === sourceId);
  if (related.some((candidate) => candidate.status === "pending" || candidate.status === "scheduled")) return null;
  let index = 0;
  while (related.some((candidate) => (candidate.sequenceIndex ?? 0) === index && (candidate.status === "completed" || candidate.status === "dismissed"))) index += 1;
  return index;
}

export function nextVisionCandidate(document: SavedVisionStrategy, related: TodayCandidate[]): TodayCandidate | null {
  if (document.status === 'archived' || related.some((item) => item.status === 'scheduled' || item.status === 'pending')) return null;
  const steps = getVisionStepSequence(document);
  const done = new Set(related.filter((item) => item.status === 'completed' || item.status === 'dismissed').map((item) => visionStepKey(item.title)));
  const index = steps.findIndex((title) => !done.has(visionStepKey(title)));
  return index < 0 ? null : createSequencedVisionCandidate(document, index);
}
