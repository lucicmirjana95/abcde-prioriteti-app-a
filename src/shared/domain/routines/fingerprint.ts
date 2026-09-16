import type { SharedRoutine } from "./contracts";

/**
 * Deterministic canonical JSON serialization.
 * Recursively sorts object keys and normalizes values to ensure identical
 * semantic payloads produce identical byte representations.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJsonStringify).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return (
    "{" +
    sortedKeys
      .map((k) => JSON.stringify(k) + ":" + canonicalJsonStringify(obj[k]))
      .join(",") +
    "}"
  );
}

export function getRoutineSemanticCanonicalString(routine: SharedRoutine): string {
  const semantic = {
    title: (routine.title || "").trim(),
    fullAction: (routine.fullAction || routine.title || "").trim(),
    minimumAction: (routine.minimumAction || routine.title || "").trim(),
    status: routine.status,
    timeZone: routine.timeZone,
    origin: routine.origin,
    estimatedMinutes: routine.estimatedMinutes,
    recurrence: routine.recurrence,
    language: routine.language,
    source: routine.source,
    frequency: routine.frequency,
    why: routine.why?.trim(),
    preferredTime: routine.preferredTime,
    sortOrder: routine.sortOrder,
    goalRelationships: routine.goalRelationships || [],
  };

  return canonicalJsonStringify(semantic);
}

/**
 * Computes a deterministic SHA-256 fingerprint of the semantic create payload.
 * Excludes transient and revision fields (such as createdAt, updatedAt, revision)
 * to ensure that identical routine intents match across retries.
 */
export async function computeRoutineSemanticFingerprint(routine: SharedRoutine): Promise<string> {
  const canonicalString = getRoutineSemanticCanonicalString(routine);
  const bytes = new TextEncoder().encode(canonicalString);

  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Node fallback if crypto.subtle is unavailable
  const crypto = await import("node:crypto");
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
