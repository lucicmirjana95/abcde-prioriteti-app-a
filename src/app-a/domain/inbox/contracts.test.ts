import assert from "node:assert/strict";
import { createImportedInboxItemId, isAppAInboxItem, normalizeInboxTitle } from "./contracts";

const createdAt = "2026-09-02T12:00:00.000Z";
const validItem = {
  id: "in_manual_test",
  title: "Call the dentist",
  kind: "task" as const,
  horizon: "this_week" as const,
  status: "inbox" as const,
  source: "manual" as const,
  language: "en" as const,
  createdAt,
  updatedAt: createdAt,
};

const first = createImportedInboxItemId("2026-09-01", "item / with spaces 🐕");
const repeated = createImportedInboxItemId("2026-09-01", "item / with spaces 🐕");
const other = createImportedInboxItemId("2026-09-01", "different");
assert.equal(first, repeated);
assert.notEqual(first, other);
assert.match(first, /^in_[a-f0-9]{32}$/);
assert.equal(isAppAInboxItem(validItem), true);
assert.equal(isAppAInboxItem({ ...validItem, estimatedMinutes: 0 }), false);
assert.equal(isAppAInboxItem({ ...validItem, scheduledLocalDate: "tomorrow" }), false);
assert.equal(normalizeInboxTitle("  Call   THE dentist "), "call the dentist");

console.log("Inbox contract tests passed.");
