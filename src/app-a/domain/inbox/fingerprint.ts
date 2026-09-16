import type { AppAInboxItem } from "./contracts";

/**
 * Deterministic canonical JSON serialization.
 * Recursively sorts object keys and normalizes values so identical
 * semantic payloads produce identical canonical representations.
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

/**
 * Extracts pure semantic fields from an Inbox item.
 * Strictly excludes transient, volatile timestamps (createdAt, updatedAt) and IDs.
 */
export function getInboxItemSemanticPayload(item: Partial<AppAInboxItem>): Record<string, unknown> {
  return {
    capacityType: item.capacityType,
    details: item.details ? item.details.trim() : undefined,
    estimatedMinutes: item.estimatedMinutes,
    horizon: item.horizon,
    kind: item.kind,
    language: item.language,
    scheduledLocalDate: item.scheduledLocalDate,
    source: item.source,
    sourceItemId: item.sourceItemId,
    sourceLocalDate: item.sourceLocalDate,
    status: item.status,
    title: (item.title || "").trim(),
    waitingOn: item.waitingOn ? item.waitingOn.trim() : undefined,
  };
}

/**
 * Computes a deterministic 64-bit hex hash string for the semantic payload.
 * Compatible across Node and browser runtimes.
 */
export function computeInboxItemSemanticFingerprint(item: Partial<AppAInboxItem>): string {
  const semantic = getInboxItemSemanticPayload(item);
  const canonicalString = canonicalJsonStringify(semantic);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < canonicalString.length; i++) {
    const ch = canonicalString.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `fp_${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}
