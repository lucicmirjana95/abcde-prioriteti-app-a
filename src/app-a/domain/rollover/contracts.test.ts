import assert from "node:assert/strict";
import {
  shiftLocalDate,
  getRolloverLookbackBoundaries,
  isLocalDateInRolloverWindow,
  getRolloverDecisionId,
  isCandidateEligibleWithDecisions,
  type AppARolloverDecision,
} from "./contracts";

console.log("Running Rollover Contracts Tests...");

// 1. Exact 7-calendar-day boundary calculations
const activeDate = "2026-09-02";
const boundaries = getRolloverLookbackBoundaries(activeDate, 7);

assert.equal(boundaries.activeLocalDate, "2026-09-02");
assert.equal(boundaries.earliestAllowedDate, "2026-08-26");

// Today must be excluded from previous-day rollover lookback
assert.equal(isLocalDateInRolloverWindow("2026-09-02", boundaries), false);
// Future date must be excluded
assert.equal(isLocalDateInRolloverWindow("2026-09-03", boundaries), false);

// Dates in the 7-day window must be included
assert.equal(isLocalDateInRolloverWindow("2026-09-01", boundaries), true); // 1 day ago
assert.equal(isLocalDateInRolloverWindow("2026-08-31", boundaries), true); // 2 days ago
assert.equal(isLocalDateInRolloverWindow("2026-08-30", boundaries), true); // 3 days ago
assert.equal(isLocalDateInRolloverWindow("2026-08-29", boundaries), true); // 4 days ago
assert.equal(isLocalDateInRolloverWindow("2026-08-28", boundaries), true); // 5 days ago
assert.equal(isLocalDateInRolloverWindow("2026-08-27", boundaries), true); // 6 days ago
assert.equal(isLocalDateInRolloverWindow("2026-08-26", boundaries), true); // 7 days ago (inclusive lower bound)

// Plans older than 7 days must be strictly excluded
assert.equal(isLocalDateInRolloverWindow("2026-08-25", boundaries), false); // 8 days ago
assert.equal(isLocalDateInRolloverWindow("2026-08-01", boundaries), false);
assert.equal(isLocalDateInRolloverWindow("2025-12-31", boundaries), false);

// 2. Deterministic shiftLocalDate behavior across month & year boundaries
assert.equal(shiftLocalDate("2026-01-01", -1), "2025-12-31");
assert.equal(shiftLocalDate("2026-03-01", -1), "2026-02-28"); // non-leap year
assert.equal(shiftLocalDate("2024-03-01", -1), "2024-02-29"); // leap year
assert.equal(shiftLocalDate("2026-09-02", 1), "2026-09-03");

// 3. Deterministic decision ID format, path safety, and boundary checks
const id1 = getRolloverDecisionId("2026-09-01", "task-xyz");
const id1Repeat = getRolloverDecisionId("2026-09-01", "task-xyz");
assert.equal(id1, id1Repeat); // Determinism

// Length check (isValidId: length > 0 and length <= 128)
assert.ok(id1.length > 0 && id1.length <= 128, `Length ${id1.length} must be between 1 and 128`);

// Firestore path safety (no slashes, no spaces, no path navigation characters)
assert.ok(!id1.includes("/"), "Decision ID must not contain raw slashes");
assert.ok(!id1.includes(" "), "Decision ID must not contain spaces");
assert.ok(!id1.includes(".."), "Decision ID must not contain dot paths");

// Slashes in item ID are safely digested without leaking slashes
const slashItemId = "projects/my-project/tasks/123/subtask/456";
const slashDecisionId = getRolloverDecisionId("2026-09-01", slashItemId);
assert.ok(!slashDecisionId.includes("/"), "Decision ID with slash item ID must not contain slashes");
assert.ok(slashDecisionId.length <= 128);

// Unicode, emojis, spaces, and punctuation
const unicodeItemId = "🔥 Urgent Task: Proveriti stanje na računu & exportovati CSV (100% obavezno!) 🚀";
const unicodeDecisionId = getRolloverDecisionId("2026-09-01", unicodeItemId);
assert.ok(!unicodeDecisionId.includes("/"));
assert.ok(unicodeDecisionId.length <= 128);
assert.equal(unicodeDecisionId, getRolloverDecisionId("2026-09-01", unicodeItemId));

// Very long item ID (e.g. 5,000 chars) remains strictly bounded <= 128
const longItemId = "a".repeat(5000);
const longDecisionId = getRolloverDecisionId("2026-09-01", longItemId);
assert.ok(longDecisionId.length <= 128);
assert.equal(longDecisionId, getRolloverDecisionId("2026-09-01", longItemId));

// Distinct inputs produce distinct IDs (no false collisions or accidental normalization)
assert.notEqual(
  getRolloverDecisionId("2026-09-01", "task-a"),
  getRolloverDecisionId("2026-09-01", "task-b"),
);
assert.notEqual(
  getRolloverDecisionId("2026-09-01", "task-1"),
  getRolloverDecisionId("2026-09-02", "task-1"),
);
assert.notEqual(
  getRolloverDecisionId("2026-09-01", "task-1"),
  getRolloverDecisionId("2026-09-01", "TASK-1"),
);
assert.notEqual(
  getRolloverDecisionId("2026-09-01", "task 1"),
  getRolloverDecisionId("2026-09-01", "task1"),
);

// 4. Decision eligibility: carried and dismissed items are excluded
const carriedKey = getRolloverDecisionId("2026-09-01", "carried-1");
const dismissedKey = getRolloverDecisionId("2026-09-01", "dismissed-1");
const snoozedFutureKey = getRolloverDecisionId("2026-09-01", "snoozed-future");
const snoozedDueKey = getRolloverDecisionId("2026-09-01", "snoozed-due-today");
const snoozedPastKey = getRolloverDecisionId("2026-09-01", "snoozed-past");

const decisions: Record<string, AppARolloverDecision> = {
  [carriedKey]: {
    sourceLocalDate: "2026-09-01",
    sourcePlanItemId: "carried-1",
    status: "carried",
  },
  [dismissedKey]: {
    sourceLocalDate: "2026-09-01",
    sourcePlanItemId: "dismissed-1",
    status: "dismissed",
  },
  [snoozedFutureKey]: {
    sourceLocalDate: "2026-09-01",
    sourcePlanItemId: "snoozed-future",
    status: "snoozed",
    snoozedUntilLocalDate: "2026-09-03", // snoozed until tomorrow relative to 2026-09-02
  },
  [snoozedDueKey]: {
    sourceLocalDate: "2026-09-01",
    sourcePlanItemId: "snoozed-due-today",
    status: "snoozed",
    snoozedUntilLocalDate: "2026-09-02", // snooze expires today -> should be eligible!
  },
  [snoozedPastKey]: {
    sourceLocalDate: "2026-09-01",
    sourcePlanItemId: "snoozed-past",
    status: "snoozed",
    snoozedUntilLocalDate: "2026-09-01", // snooze expired yesterday -> should be eligible!
  },
};

assert.equal(isCandidateEligibleWithDecisions("2026-09-01", "carried-1", activeDate, decisions), false);
assert.equal(isCandidateEligibleWithDecisions("2026-09-01", "dismissed-1", activeDate, decisions), false);
assert.equal(isCandidateEligibleWithDecisions("2026-09-01", "snoozed-future", activeDate, decisions), false);
assert.equal(isCandidateEligibleWithDecisions("2026-09-01", "snoozed-due-today", activeDate, decisions), true);
assert.equal(isCandidateEligibleWithDecisions("2026-09-01", "snoozed-past", activeDate, decisions), true);
assert.equal(isCandidateEligibleWithDecisions("2026-09-01", "undecided-item", activeDate, decisions), true);

console.log("Rollover Contracts Tests passed successfully.");
