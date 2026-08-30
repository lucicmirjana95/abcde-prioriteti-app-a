import assert from "node:assert/strict";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import {
  createDailyPlanDocument,
  dailyResetDataFromDocument,
  getLocalDateKey,
  isAppADailyPlanDocument,
} from "./dailyPlanDocument";

const plan: DailyPlanDraft = {
  classifiedItems: [
    {
      id: "classified-1",
      originalText: "Send the proposal",
      kind: "task",
      timeHorizon: "today",
      timeSensitivity: "deadline",
      isAmbiguous: false,
      needsCheck: false,
      priority: { explanation: "Due today" },
    },
  ],
  firstFocus: [
    {
      id: "plan-1",
      sourceItemIds: ["classified-1"],
      title: "Send the proposal",
      description: undefined,
      block: "first_focus",
      estimatedMinutes: 45,
      requiredEnergy: 3,
      timeSensitivity: "deadline",
      priority: { explanation: "Due today" },
      needsCheck: false,
    },
  ],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "Start with the deadline.",
  availableMinutes: 90,
  plannedRequiredMinutes: 45,
  plannedOptionalMinutes: 0,
};

const input = {
  energy: 2 as const,
  pleasantness: 3 as const,
  availableTime: { type: "custom" as const, customHours: 1, customMinutes: 30 },
  stateNote: "  A little tired  ",
  brainDump: "PRIVATE RAW BRAIN DUMP",
};

const document = createDailyPlanDocument(
  input,
  plan,
  "en",
  "2026-08-29",
  "Europe/Belgrade",
);

assert.equal(document.localDate, "2026-08-29");
assert.equal(document.timezone, "Europe/Belgrade");
assert.equal(document.checkIn.availableMinutes, 90);
assert.equal(document.checkIn.stateNote, "A little tired");
assert.equal(document.plan.firstFocus[0].title, "Send the proposal");
assert.deepEqual(document.execution?.completedItemIds, []);
assert.equal("description" in document.plan.firstFocus[0], false);
assert.equal(JSON.stringify(document).includes("PRIVATE RAW BRAIN DUMP"), false);
assert.equal("brainDump" in document, false);
assert.equal("clarificationAnswers" in document, false);
assert.equal("questions" in document, false);
assert.equal(isAppADailyPlanDocument(document), true);
const { execution: _execution, ...legacyDocument } = document;
assert.equal(isAppADailyPlanDocument(legacyDocument), true);
assert.equal(
  isAppADailyPlanDocument({
    ...document,
    execution: { completedItemIds: ["plan-1", 3] },
  }),
  false,
);
const restoredInput = dailyResetDataFromDocument(document);
assert.equal(restoredInput.energy, 2);
assert.equal(restoredInput.availableTime?.customHours, 1);
assert.equal(restoredInput.availableTime?.customMinutes, 30);
assert.equal(restoredInput.brainDump, "");
assert.equal(isAppADailyPlanDocument({ ...document, schemaVersion: 2 }), false);
assert.equal(
  isAppADailyPlanDocument({
    ...document,
    plan: { ...document.plan, plannedRequiredMinutes: 999 },
  }),
  false,
);

const localDate = getLocalDateKey(new Date(2026, 7, 9, 23, 30));
assert.equal(localDate, "2026-08-09");

console.log("All App A daily plan document tests passed.");
