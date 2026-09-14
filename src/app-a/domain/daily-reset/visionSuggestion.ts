import type { DailyResetVisionSuggestion } from "./contracts";
import type { SavedVisionStrategy } from "../../../shared/domain/vision";

const DISMISSED_STORAGE_PREFIX = "app_a_dismissed_vision_suggestions_";

export function computeVisionSuggestionFingerprint(sourceItemIds: string[], suggestedTitle: string): string {
  const sortedIds = [...sourceItemIds].sort().join(",");
  const cleanTitle = (suggestedTitle || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${sortedIds}::${cleanTitle}`;
}

export function isVisionSuggestionDismissed(userId: string, fingerprint: string): boolean {
  if (!fingerprint) return false;
  try {
    if (typeof localStorage === "undefined") return false;
    const raw = localStorage.getItem(`${DISMISSED_STORAGE_PREFIX}${userId || "guest"}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.includes(fingerprint);
  } catch {
    return false;
  }
}

export function dismissVisionSuggestion(userId: string, fingerprint: string): void {
  if (!fingerprint) return;
  try {
    if (typeof localStorage === "undefined") return;
    const key = `${DISMISSED_STORAGE_PREFIX}${userId || "guest"}`;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(fingerprint)) {
      list.push(fingerprint);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {
    // Storage unavailable
  }
}

export function clearDismissedVisionSuggestions(userId?: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (userId) {
      localStorage.removeItem(`${DISMISSED_STORAGE_PREFIX}${userId}`);
    }
    if (typeof localStorage.length === "number") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key ? localStorage.key(i) : null;
        if (k && k.startsWith(DISMISSED_STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(DISMISSED_STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage unavailable
  }
}

export const resetDismissedVisionSuggestions = clearDismissedVisionSuggestions;

function normalizeTextForComparison(text: string): string {
  return (text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "to", "for", "of", "in", "on", "at", "by", "with",
    "da", "i", "ili", "za", "od", "u", "na", "sa", "kako", "se", "je", "su", "ga",
    "ve", "ile", "için", "bir", "bu", "şu", "veya", "de", "da"
  ]);
  const words = normalizeTextForComparison(text).split(" ");
  return new Set(words.filter((w) => w.length > 2 && !stopWords.has(w)));
}

function wordsMatch(w1: string, w2: string): boolean {
  if (w1 === w2) return true;
  if (w1.length >= 4 && w2.length >= 4) {
    if (w1.startsWith(w2) || w2.startsWith(w1)) return true;
    const prefixLen = Math.min(w1.length, w2.length, 5);
    if (w1.slice(0, prefixLen) === w2.slice(0, prefixLen)) return true;
  }
  return false;
}

function computeKeywordOverlap(textA: string, textB: string): number {
  const setA = extractKeywords(textA);
  const setB = extractKeywords(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let matches = 0;
  for (const wordA of setA) {
    let matched = false;
    for (const wordB of setB) {
      if (wordsMatch(wordA, wordB)) {
        matched = true;
        break;
      }
    }
    if (matched) matches++;
  }
  return matches / Math.min(setA.size, setB.size);
}

export interface RelatedVisionMatch {
  vision: SavedVisionStrategy;
  matchType: "exact_id" | "high_similarity" | "outcome_similarity";
  isArchived: boolean;
}

export function findRelatedVision(
  suggestion: DailyResetVisionSuggestion,
  library: SavedVisionStrategy[] | { strategies?: SavedVisionStrategy[] }
): RelatedVisionMatch | null {
  const list: SavedVisionStrategy[] = Array.isArray(library)
    ? library
    : (library && Array.isArray((library as any).strategies) ? (library as any).strategies : []);
  if (!suggestion || list.length === 0) {
    return null;
  }

  // 1. Check direct ID match if provided by AI
  if (suggestion.possibleExistingVisionId) {
    const directMatch = list.find(
      (v) => v.id === suggestion.possibleExistingVisionId
    );
    if (directMatch) {
      return {
        vision: directMatch,
        matchType: "exact_id",
        isArchived: directMatch.status === "archived",
      };
    }
  }

  const suggestionTitleNorm = normalizeTextForComparison(suggestion.suggestedTitle);
  const suggestionOutcomeNorm = normalizeTextForComparison(suggestion.desiredOutcome);

  // 2. Check semantic & keyword overlap across library visions
  for (const vision of list) {
    const visionIdeaNorm = normalizeTextForComparison(vision.idea);
    const visionOutcomeNorm = normalizeTextForComparison(vision.strategy?.outcome || "");

    // Exact or substring match in idea / title
    if (
      (suggestionTitleNorm.length >= 5 && visionIdeaNorm.includes(suggestionTitleNorm)) ||
      (visionIdeaNorm.length >= 5 && suggestionTitleNorm.includes(visionIdeaNorm))
    ) {
      return {
        vision,
        matchType: "high_similarity",
        isArchived: vision.status === "archived",
      };
    }

    // High keyword overlap in title/idea
    const titleIdeaOverlap = computeKeywordOverlap(suggestion.suggestedTitle, vision.idea);
    if (titleIdeaOverlap >= 0.7) {
      return {
        vision,
        matchType: "high_similarity",
        isArchived: vision.status === "archived",
      };
    }

    // Outcome overlap
    if (visionOutcomeNorm) {
      const outcomeOverlap = computeKeywordOverlap(
        suggestion.desiredOutcome || suggestion.suggestedTitle,
        vision.strategy?.outcome || ""
      );
      if (outcomeOverlap >= 0.65) {
        return {
          vision,
          matchType: "outcome_similarity",
          isArchived: vision.status === "archived",
        };
      }
    }
  }

  return null;
}

export function validateVisionSuggestion(
  raw: any,
  validSourceIds: string[] | Set<string>,
  accessibleVisionIds?: string[] | Set<string>
): DailyResetVisionSuggestion | null {
  if (!raw || typeof raw !== "object") return null;

  // Confidence must be medium or high (never low)
  if (raw.confidence !== "medium" && raw.confidence !== "high") {
    return null;
  }

  // Titles and outcome must be non-empty, trimmed strings within bounds
  const suggestedTitle = typeof raw.suggestedTitle === "string" ? raw.suggestedTitle.trim() : "";
  if (suggestedTitle.length < 3 || suggestedTitle.length > 200) {
    return null;
  }

  const desiredOutcome = typeof raw.desiredOutcome === "string" ? raw.desiredOutcome.trim() : "";
  if (desiredOutcome.length < 3 || desiredOutcome.length > 500) {
    return null;
  }

  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500) {
    return null;
  }

  // Source IDs must exist and belong to valid brain dump items
  const sourceItemIds: string[] = Array.isArray(raw.sourceItemIds)
    ? raw.sourceItemIds.map(String)
    : [];
  if (sourceItemIds.length === 0) {
    return null;
  }

  const sourceSet = validSourceIds instanceof Set ? validSourceIds : new Set(validSourceIds);
  for (const sid of sourceItemIds) {
    if (!sourceSet.has(sid)) {
      return null;
    }
  }

  const needsClarification = Boolean(raw.needsClarification);
  let clarificationQuestion: string | undefined = undefined;
  if (raw.clarificationQuestion !== undefined && raw.clarificationQuestion !== null) {
    const cq = String(raw.clarificationQuestion).trim();
    if (cq.length > 0 && cq.length <= 300) {
      clarificationQuestion = cq;
    }
  }

  let possibleExistingVisionId: string | undefined = undefined;
  if (
    raw.possibleExistingVisionId !== undefined &&
    raw.possibleExistingVisionId !== null &&
    String(raw.possibleExistingVisionId).trim() !== ""
  ) {
    const visionId = String(raw.possibleExistingVisionId).trim();
    if (accessibleVisionIds) {
      const visionSet =
        accessibleVisionIds instanceof Set
          ? accessibleVisionIds
          : new Set(accessibleVisionIds);
      if (visionSet.has(visionId)) {
        possibleExistingVisionId = visionId;
      }
    } else if (visionId.length <= 100) {
      possibleExistingVisionId = visionId;
    }
  }

  return {
    sourceItemIds,
    suggestedTitle,
    desiredOutcome,
    reason,
    confidence: raw.confidence,
    needsClarification,
    clarificationQuestion,
    possibleExistingVisionId,
  };
}

export function validateVisionSuggestionPayload(
  raw: any,
  validSourceIds?: string[] | Set<string>,
  accessibleVisionIds?: string[] | Set<string>
): { valid: boolean; suggestion?: DailyResetVisionSuggestion; error?: string } {
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "Invalid payload object" };
  }
  if (raw.confidence !== "medium" && raw.confidence !== "high") {
    return { valid: false, error: "Confidence must be medium or high" };
  }
  const sourceIds = Array.isArray(raw.sourceItemIds) ? raw.sourceItemIds.map(String) : [];
  if (sourceIds.length === 0) {
    return { valid: false, error: "Missing sourceItemIds" };
  }

  const effectiveValidSourceIds = validSourceIds || new Set(sourceIds);
  const validated = validateVisionSuggestion(raw, effectiveValidSourceIds, accessibleVisionIds);
  if (!validated) {
    return { valid: false, error: "Failed vision suggestion validation constraints" };
  }
  return { valid: true, suggestion: validated };
}
