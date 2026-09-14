import type {
  DailyPlanDraft,
  DailyPlanItem,
  GoalRelationship,
  PlanBlock,
  PriorityFactors,
  RequiredEnergy,
  TimeSensitivity,
} from "../daily-reset/contracts";

export type CanonicalRolloverDecisionStatus =
  | "carried"
  | "snoozed"
  | "dismissed"
  | "scheduled"
  | "inbox"
  | "this_week"
  | "completed";

export type RolloverDecisionStatus = CanonicalRolloverDecisionStatus;

export type NormalizedRolloverDecisionStatus =
  | { kind: "valid"; status: RolloverDecisionStatus }
  | { kind: "unsupported"; rawStatus: string };

/**
 * Centralized, pure normalization function for RolloverDecisionStatus.
 * Returns a discriminated result:
 * - { kind: "valid", status: RolloverDecisionStatus } for the 7 canonical statuses or known legacy aliases
 * - { kind: "unsupported", rawStatus: string } for unknown/invalid values
 * Unsupported status is NOT part of the canonical RolloverDecisionStatus union.
 */
export function normalizeRolloverDecisionStatus(
  status: unknown,
): NormalizedRolloverDecisionStatus {
  if (typeof status !== "string") {
    return { kind: "unsupported", rawStatus: String(status) };
  }
  const trimmed = status.trim();
  switch (trimmed) {
    case "carried":
    case "snoozed":
    case "dismissed":
    case "scheduled":
    case "inbox":
    case "this_week":
    case "completed":
      return { kind: "valid", status: trimmed };
    case "added_to_today":
      return { kind: "valid", status: "carried" };
    case "moved_to_inbox":
      return { kind: "valid", status: "inbox" };
    default:
      return { kind: "unsupported", rawStatus: trimmed };
  }
}

export type CanonicalRootIdentity =
  | {
      resolved: true;
      rootLocalDate: string;
      rootPlanItemId: string;
      error?: undefined;
    }
  | {
      resolved: false;
      error: string;
      rootLocalDate?: undefined;
      rootPlanItemId?: undefined;
    };

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LEGACY_UNWRAP_DEPTH = 7;

/**
 * Resolves the true canonical root identity of an item or candidate with strict priority:
 * 1. Valid originalPlanDate and originalPlanItemId (explicit provenance takes absolute priority)
 * 2. Valid sourceLocalDate and sourcePlanItemId (when not a rollover_plan_ ID)
 * 3. Strictly bounded iterative unwrap of legacy rollover_plan_ ID as last fallback (max 7 iterations)
 *
 * If root cannot be reliably determined, returns an explicit unresolved/error result.
 * Title is NEVER used as primary or root identity.
 */
export function getCanonicalRootIdentity(item: {
  id?: string;
  sourceLocalDate?: string;
  sourcePlanItemId?: string;
  localDate?: string;
  originalPlanDate?: string;
  originalPlanItemId?: string;
}): CanonicalRootIdentity {
  const isValidDate = (d?: string): boolean =>
    typeof d === "string" && ISO_DATE_REGEX.test(d.trim());
  const isValidItemId = (id?: string): boolean =>
    typeof id === "string" && id.trim().length > 0;

  // Priority 1: Explicit original provenance fields have highest priority over any ID
  if (isValidDate(item.originalPlanDate) && isValidItemId(item.originalPlanItemId)) {
    return {
      resolved: true,
      rootLocalDate: item.originalPlanDate!.trim(),
      rootPlanItemId: item.originalPlanItemId!.trim(),
    };
  }

  // Priority 2: Valid sourceLocalDate and sourcePlanItemId (or non-rollover id)
  const sourceDate = isValidDate(item.sourceLocalDate)
    ? item.sourceLocalDate!.trim()
    : isValidDate(item.localDate)
      ? item.localDate!.trim()
      : undefined;

  const sourceItemId = isValidItemId(item.sourcePlanItemId)
    ? item.sourcePlanItemId!.trim()
    : isValidItemId(item.id) && !item.id!.trim().startsWith("rollover_plan_")
      ? item.id!.trim()
      : undefined;

  if (sourceDate && sourceItemId && !sourceItemId.startsWith("rollover_plan_")) {
    return {
      resolved: true,
      rootLocalDate: sourceDate,
      rootPlanItemId: sourceItemId,
    };
  }

  // Priority 3: Strictly bounded iterative parsing of legacy rollover ID as last fallback
  const candidateId = (item.id || item.sourcePlanItemId || "").trim();
  if (candidateId.startsWith("rollover_plan_")) {
    const rolloverRegex = /^rollover_plan_(\d{4}-\d{2}-\d{2})_(.+)$/;
    let currentId = candidateId;
    let foundDate: string | null = null;
    let foundItemId: string | null = null;
    let depth = 0;

    while (depth < MAX_LEGACY_UNWRAP_DEPTH) {
      depth++;
      const match = rolloverRegex.exec(currentId);
      if (!match || !match[1] || !match[2]) {
        return {
          resolved: false,
          error: `malformed_legacy_id: ${candidateId}`,
        };
      }
      foundDate = match[1];
      const nextSegment = match[2].trim();
      if (!nextSegment) {
        return {
          resolved: false,
          error: `malformed_legacy_id: empty item segment in ${candidateId}`,
        };
      }
      foundItemId = nextSegment;
      if (nextSegment.startsWith("rollover_plan_")) {
        currentId = nextSegment;
      } else {
        break;
      }
    }

    if (foundItemId && foundItemId.startsWith("rollover_plan_")) {
      return {
        resolved: false,
        error: `excessive_legacy_depth: ${candidateId}`,
      };
    }

    if (foundDate && foundItemId) {
      return {
        resolved: true,
        rootLocalDate: foundDate,
        rootPlanItemId: foundItemId,
      };
    }

    return {
      resolved: false,
      error: `malformed_legacy_id: ${candidateId}`,
    };
  }

  return {
    resolved: false,
    error: `missing_identity: unable to resolve root identity`,
  };
}

/**
 * Computes the single canonical rollover decision ID for any candidate or decision.
 * Single and bulk operations both use this exact same root helper.
 */
export function getCanonicalDecisionId(item: {
  sourceLocalDate: string;
  sourcePlanItemId: string;
  originalPlanDate?: string;
  originalPlanItemId?: string;
  id?: string;
}): string {
  const root = getCanonicalRootIdentity({
    id: item.id || item.sourcePlanItemId,
    sourceLocalDate: item.sourceLocalDate,
    sourcePlanItemId: item.sourcePlanItemId,
    originalPlanDate: item.originalPlanDate,
    originalPlanItemId: item.originalPlanItemId,
  });
  if (root.resolved) {
    return getRolloverDecisionId(root.rootLocalDate, root.rootPlanItemId);
  }
  // Controlled legacy fallback
  return getRolloverDecisionId(item.sourceLocalDate, item.sourcePlanItemId);
}

export interface AppARolloverDecision {
  sourceLocalDate: string;
  sourcePlanItemId: string;
  originalPlanDate?: string;
  originalPlanItemId?: string;
  status?: RolloverDecisionStatus;
  snoozedUntilLocalDate?: string;
  scheduledLocalDate?: string;
  completedOnLocalDate?: string;
  updatedAt?: unknown;
  isUnsupported?: boolean;
  unsupportedRawStatus?: string;
}

export interface UnfinishedRolloverCandidate {
  id: string; // source plan item ID
  sourceLocalDate: string; // e.g. "2026-09-01"
  originalPlanDate?: string; // root creation plan date
  originalPlanItemId?: string; // root item ID
  title: string;
  description?: string;
  estimatedMinutes: number;
  capacityType?: "flexible" | "fixed";
  originalBlock: PlanBlock;
  requiredEnergy: RequiredEnergy;
  timeSensitivity: TimeSensitivity;
  scheduledTime?: string;
  deadlineText?: string;
  deadlineIso?: string;
  isPastDeadline?: boolean;
  isPastFixedObligation?: boolean;
  kind?: "task" | "fixed_obligation" | "waiting_for" | "idea" | "worry";
  priority: PriorityFactors;
  goalRelationship?: GoalRelationship;
  sourceItemId?: string;
  sourceItemIds?: string[];
  visionId?: string;
  visionStepId?: string;
  inboxItemId?: string;
  reasoning?: string;
}

export interface RolloverLookbackBoundaries {
  earliestAllowedDate: string; // inclusive lower bound: e.g. 7 days prior
  activeLocalDate: string; // exclusive upper bound: today
}

/**
 * Deterministically shifts a local ISO date string (YYYY-MM-DD) by a given number of days.
 */
export function shiftLocalDate(baseLocalDate: string, deltaDays: number): string {
  const parts = baseLocalDate.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) {
    throw new Error(`Invalid local date format: ${baseLocalDate}`);
  }
  const date = new Date(Date.UTC(year, month - 1, day + deltaDays));
  const resYear = date.getUTCFullYear();
  const resMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const resDay = String(date.getUTCDate()).padStart(2, "0");
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Calculates the exact 7-calendar-day lookback boundaries:
 * earliestAllowedDate <= localDate < activeLocalDate
 */
export function getRolloverLookbackBoundaries(
  activeLocalDate: string,
  lookbackDays = 7,
): RolloverLookbackBoundaries {
  return {
    earliestAllowedDate: shiftLocalDate(activeLocalDate, -lookbackDays),
    activeLocalDate,
  };
}

/**
 * Determines whether a historical plan date is within the exact lookback window.
 */
export function isLocalDateInRolloverWindow(
  candidateDate: string,
  boundaries: RolloverLookbackBoundaries,
): boolean {
  return (
    candidateDate >= boundaries.earliestAllowedDate &&
    candidateDate < boundaries.activeLocalDate
  );
}

/**
 * Computes a deterministic 128-bit hex digest from a UTF-8 string.
 * High-entropy, collision-resistant, pure TypeScript, synchronous, environment-independent.
 */
export function computeDeterministicDigest128(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x6c62272e;
  let h4 = 0x517cc1b7;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    const b1 = code & 0xff;
    const b2 = (code >> 8) & 0xff;

    h1 = Math.imul(h1 ^ b1, 0x01000193);
    h2 = Math.imul(h2 ^ b2, 0x5bd1e995);
    h3 = Math.imul(h3 ^ (b1 + b2), 0x27d4eb2f);
    h4 = Math.imul(h4 ^ (b1 ^ b2), 0x165667b1);

    h1 = (h1 << 13) | (h1 >>> 19);
    h2 = (h2 << 15) | (h2 >>> 17);
    h3 = (h3 << 17) | (h3 >>> 15);
    h4 = (h4 << 19) | (h4 >>> 13);
  }

  // Avalanche step
  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b);
  h1 = Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35);
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;

  h2 = Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;

  h3 = Math.imul(h3 ^ (h3 >>> 16), 0x85ebca6b);
  h3 = Math.imul(h3 ^ (h3 >>> 13), 0xc2b2ae35);
  h3 = (h3 ^ (h3 >>> 16)) >>> 0;

  h4 = Math.imul(h4 ^ (h4 >>> 16), 0x85ebca6b);
  h4 = Math.imul(h4 ^ (h4 >>> 13), 0xc2b2ae35);
  h4 = (h4 ^ (h4 >>> 16)) >>> 0;

  return (
    h1.toString(16).padStart(8, "0") +
    h2.toString(16).padStart(8, "0") +
    h3.toString(16).padStart(8, "0") +
    h4.toString(16).padStart(8, "0")
  );
}

/**
 * Builds a deterministic, bounded, Firestore-path-safe decision document ID.
 * Output format: `rd_${sanitizedLocalDate}_${digest32Hex}`
 * - Path-safe: contains only [a-z0-9_-], no slashes or path separators
 * - Bounded: exactly 46 characters (<= 128 characters, satisfies isValidId)
 * - Deterministic: same date + item ID always produces exact same decision ID
 * - Collision-resistant: different date or item ID produces distinct decision ID
 */
export function getRolloverDecisionId(
  sourceLocalDate: string,
  sourcePlanItemId: string,
): string {
  const sanitizedDate = sourceLocalDate.replace(/[^0-9-]/g, "") || "nodate";
  const digest = computeDeterministicDigest128(`${sourceLocalDate}\0${sourcePlanItemId}`);
  return `rd_${sanitizedDate}_${digest}`;
}

/**
 * Determines whether an unfinished candidate is active and visible given decision records and today's date.
 */
export function isCandidateEligibleWithDecisions(
  sourceLocalDate: string,
  itemId: string,
  activeLocalDate: string,
  decisions: Record<string, AppARolloverDecision>,
): boolean {
  const decisionId = getRolloverDecisionId(sourceLocalDate, itemId);
  const decision = decisions[decisionId];
  if (!decision) return true;

  if (decision.isUnsupported) {
    // Unsupported decision conservatively blocks automatic resurfacing
    return false;
  }

  const norm = normalizeRolloverDecisionStatus(decision.status);
  if (norm.kind === "unsupported") {
    // Unknown or unsupported status conservatively blocks automatic resurfacing
    return false;
  }

  const status = norm.status;

  if (
    status === "carried" ||
    status === "dismissed" ||
    status === "inbox" ||
    status === "this_week" ||
    status === "completed"
  ) {
    return false;
  }

  if (status === "snoozed") {
    // If snoozed until a future date, hide it.
    if (decision.snoozedUntilLocalDate && decision.snoozedUntilLocalDate > activeLocalDate) {
      return false;
    }
    // If snoozed until today or earlier, snooze has expired -> show it!
    return true;
  }

  if (status === "scheduled") {
    // If scheduled for a future date, hide it.
    if (decision.scheduledLocalDate && decision.scheduledLocalDate > activeLocalDate) {
      return false;
    }
    // If scheduled for today or earlier, show it!
    return true;
  }

  return false;
}

export interface ReliableTimestampInfo {
  reliable: boolean;
  epochMs: number;
}

/**
 * Validates and extracts a reliable epoch timestamp in milliseconds.
 * Returns { reliable: true, epochMs } only if the value is a valid ISO date string
 * or Firestore Timestamp object with finite positive epoch milliseconds.
 * Rejects FieldValue sentinels (e.g. serverTimestamp), null, undefined, and non-dates.
 */
export function parseReliableTimestamp(val: unknown): ReliableTimestampInfo {
  if (!val) return { reliable: false, epochMs: 0 };
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.length === 0) return { reliable: false, epochMs: 0 };
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return { reliable: true, epochMs: parsed };
    }
    return { reliable: false, epochMs: 0 };
  }
  if (typeof val === "object") {
    const record = val as Record<string, unknown>;
    // Reject FieldValue sentinels (e.g. serverTimestamp())
    if (
      typeof record._methodName === "string" ||
      record.constructor?.name === "FieldValue"
    ) {
      return { reliable: false, epochMs: 0 };
    }
    if (
      typeof record.seconds === "number" &&
      Number.isFinite(record.seconds) &&
      record.seconds > 0
    ) {
      const nanos =
        typeof record.nanoseconds === "number" && Number.isFinite(record.nanoseconds)
          ? record.nanoseconds
          : 0;
      const epochMs = record.seconds * 1000 + Math.floor(nanos / 1e6);
      return { reliable: true, epochMs };
    }
  }
  return { reliable: false, epochMs: 0 };
}

/**
 * Determines whether a decision document is directly associated with the canonical root.
 */
export function isCanonicalRootRecord(doc: AppARolloverDecision): boolean {
  if (doc.originalPlanDate && doc.originalPlanItemId) {
    return (
      doc.sourceLocalDate === doc.originalPlanDate &&
      doc.sourcePlanItemId === doc.originalPlanItemId
    );
  }
  const root = getCanonicalRootIdentity({
    id: doc.sourcePlanItemId,
    sourceLocalDate: doc.sourceLocalDate,
    sourcePlanItemId: doc.sourcePlanItemId,
  });
  if (root.resolved) {
    return (
      doc.sourceLocalDate === root.rootLocalDate &&
      doc.sourcePlanItemId === root.rootPlanItemId
    );
  }
  return false;
}

/**
 * Returns a stable unique tie-break key for a decision document based on its source identity.
 */
export function getDecisionDocumentStableKey(doc: AppARolloverDecision): string {
  return `${doc.sourceLocalDate}::${doc.sourcePlanItemId}`;
}

/**
 * Resolves the single effective RolloverDecision from two records (legacy or canonical)
 * for the same canonical root identity.
 *
 * Guaranteed to be commutative:
 * resolveEffectiveRolloverDecision(a, b) === resolveEffectiveRolloverDecision(b, a)
 *
 * Rules:
 * 1. Terminal statuses are 'completed' and 'dismissed'.
 * 2. Terminal status ALWAYS beats non-terminal status, regardless of timestamps or load order.
 * 3. If both are terminal with the same status:
 *    - Reliably newer timestamp wins.
 *    - If timestamps are equal or unreliable/missing: deterministic tie-break (root doc > legacy doc > stable key).
 * 4. If terminal statuses differ ('completed' vs 'dismissed'):
 *    - If both have reliable and different timestamps, the explicitly newer terminal status wins.
 *    - If timestamps are equal or unreliable/missing, stable priority 'completed' > 'dismissed' wins (completion represents explicit execution).
 * 5. If both are non-terminal:
 *    - Reliably newer timestamp wins.
 *    - If timestamps are equal or missing/unreliable, canonical root doc wins over legacy doc.
 *    - If both are same doc type, stable tie-break by document stable key.
 * 6. Unsupported/corrupted status:
 *    - Not converted semantically to 'dismissed'.
 *    - Preserves discriminated unsupported/invalid evidence (isUnsupported: true, unsupportedRawStatus).
 *    - If merged with terminal status, the terminal valid decision is effective while preserving unsupported diagnostics.
 *    - If merged with non-terminal status, candidate remains conservatively blocked.
 */
export function resolveEffectiveRolloverDecision(
  a: AppARolloverDecision,
  b: AppARolloverDecision,
): AppARolloverDecision {
  if (a === b) return a;

  const rootLocalDate =
    a.originalPlanDate || b.originalPlanDate || a.sourceLocalDate;
  const rootPlanItemId =
    a.originalPlanItemId || b.originalPlanItemId || a.sourcePlanItemId;

  const hasUnsupported = Boolean(a.isUnsupported || b.isUnsupported);
  const rawStatusA = a.unsupportedRawStatus;
  const rawStatusB = b.unsupportedRawStatus;
  const unsupportedRawStatus =
    rawStatusA && rawStatusB
      ? rawStatusA.localeCompare(rawStatusB) <= 0
        ? rawStatusA
        : rawStatusB
      : rawStatusA || rawStatusB;

  const normA = a.status
    ? normalizeRolloverDecisionStatus(a.status)
    : { kind: "unsupported" as const, rawStatus: a.unsupportedRawStatus || "unknown" };
  const normB = b.status
    ? normalizeRolloverDecisionStatus(b.status)
    : { kind: "unsupported" as const, rawStatus: b.unsupportedRawStatus || "unknown" };

  const isAUnsupported = Boolean(a.isUnsupported || normA.kind === "unsupported");
  const isBUnsupported = Boolean(b.isUnsupported || normB.kind === "unsupported");

  const statusA: RolloverDecisionStatus | undefined =
    normA.kind === "valid" ? normA.status : undefined;
  const statusB: RolloverDecisionStatus | undefined =
    normB.kind === "valid" ? normB.status : undefined;

  const isATerminal = !isAUnsupported && (statusA === "completed" || statusA === "dismissed");
  const isBTerminal = !isBUnsupported && (statusB === "completed" || statusB === "dismissed");

  const timeA = parseReliableTimestamp(a.updatedAt);
  const timeB = parseReliableTimestamp(b.updatedAt);

  const tieBreak = (
    docA: AppARolloverDecision,
    docB: AppARolloverDecision,
  ): AppARolloverDecision => {
    const aIsRoot = isCanonicalRootRecord(docA);
    const bIsRoot = isCanonicalRootRecord(docB);
    if (aIsRoot !== bIsRoot) {
      return aIsRoot ? docA : docB;
    }
    const keyA = getDecisionDocumentStableKey(docA);
    const keyB = getDecisionDocumentStableKey(docB);
    return keyA.localeCompare(keyB) >= 0 ? docA : docB;
  };

  let winner: AppARolloverDecision;

  // Rule 2: Terminal beats non-terminal (including unsupported non-terminal)
  if (isATerminal !== isBTerminal) {
    winner = isATerminal ? a : b;
  } else if (isATerminal && isBTerminal && statusA && statusB) {
    // Both are terminal
    if (statusA === statusB) {
      // Rule 3: Same terminal status
      if (timeA.reliable && timeB.reliable && timeA.epochMs !== timeB.epochMs) {
        winner = timeA.epochMs > timeB.epochMs ? a : b;
      } else if (timeA.reliable !== timeB.reliable) {
        winner = timeA.reliable ? a : b;
      } else {
        winner = tieBreak(a, b);
      }
    } else {
      // Rule 4: Different terminal statuses ('completed' vs 'dismissed')
      if (timeA.reliable && timeB.reliable && timeA.epochMs !== timeB.epochMs) {
        winner = timeA.epochMs > timeB.epochMs ? a : b;
      } else {
        // Tie or unreliable timestamp: completed > dismissed
        winner = statusA === "completed" ? a : b;
      }
    }
  } else if (isAUnsupported !== isBUnsupported) {
    // One is unsupported, the other is valid non-terminal
    // Test 13: candidate must remain conservatively blocked
    winner = !isAUnsupported ? a : b;
  } else {
    // Rule 5: Both are valid non-terminal (or both are unsupported)
    if (timeA.reliable && timeB.reliable && timeA.epochMs !== timeB.epochMs) {
      winner = timeA.epochMs > timeB.epochMs ? a : b;
    } else {
      winner = tieBreak(a, b);
    }
  }

  // Construct unified effective decision preserving canonical root & unsupported diagnostics
  return {
    ...winner,
    originalPlanDate: rootLocalDate,
    originalPlanItemId: rootPlanItemId,
    ...(winner.status === "completed"
      ? { completedOnLocalDate: winner.completedOnLocalDate || (a.status === "completed" ? a.completedOnLocalDate : b.completedOnLocalDate) }
      : {}),
    ...(hasUnsupported
      ? {
          isUnsupported: true,
          ...(unsupportedRawStatus ? { unsupportedRawStatus } : {}),
        }
      : {}),
  };
}

/**
 * Resolves an array of decision records for a canonical root into a single effective decision.
 * Deterministic and permutation-invariant.
 */
export function resolveEffectiveRolloverDecisions(
  decisions: AppARolloverDecision[],
): AppARolloverDecision | null {
  if (!decisions || decisions.length === 0) return null;
  let effective = decisions[0]!;
  for (let i = 1; i < decisions.length; i++) {
    effective = resolveEffectiveRolloverDecision(effective, decisions[i]!);
  }
  return effective;
}

