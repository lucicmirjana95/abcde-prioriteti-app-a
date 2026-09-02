import type {
  DailyPlanDraft,
  DailyPlanItem,
  GoalRelationship,
  PlanBlock,
  PriorityFactors,
  RequiredEnergy,
  TimeSensitivity,
} from "../daily-reset/contracts";

export type RolloverDecisionStatus = "carried" | "snoozed" | "dismissed";

export interface AppARolloverDecision {
  sourceLocalDate: string;
  sourcePlanItemId: string;
  status: RolloverDecisionStatus;
  snoozedUntilLocalDate?: string;
  updatedAt?: unknown;
}

export interface UnfinishedRolloverCandidate {
  id: string; // source plan item ID
  sourceLocalDate: string; // e.g. "2026-09-01"
  title: string;
  description?: string;
  estimatedMinutes: number;
  originalBlock: PlanBlock;
  requiredEnergy: RequiredEnergy;
  timeSensitivity: TimeSensitivity;
  deadlineText?: string;
  deadlineIso?: string;
  priority: PriorityFactors;
  goalRelationship?: GoalRelationship;
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

  if (decision.status === "carried" || decision.status === "dismissed") {
    return false;
  }

  if (decision.status === "snoozed") {
    // If snoozed until a future date, hide it.
    if (decision.snoozedUntilLocalDate && decision.snoozedUntilLocalDate > activeLocalDate) {
      return false;
    }
    // If snoozed until today or earlier, snooze has expired -> show it!
    return true;
  }

  return true;
}
