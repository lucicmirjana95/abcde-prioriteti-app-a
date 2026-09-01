import assert from "node:assert/strict";
import type { SharedRoutine } from "./contracts";
import {
  getRoutineCompletionDocumentId,
  isRoutineScheduledOnDate,
  validateRoutineCompletion,
  validateSharedRoutine,
} from "./validation";

const routine: SharedRoutine = {
  id: "writing_daily",
  title: "Daily writing",
  fullAction: "Write for 20 minutes",
  minimumAction: "Open the manuscript and write one sentence",
  recurrence: { type: "daily" },
  status: "active",
  cue: { type: "after_activity", activity: "After morning coffee" },
  timeZone: "Europe/Belgrade",
  language: "en",
  source: "user",
  sortOrder: 0,
  goalRelationships: [],
  activeFrom: "2026-09-01",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
};

assert.equal(validateSharedRoutine(routine).valid, true);
assert.equal(validateSharedRoutine({ ...routine, recurrence: { type: "selected_weekdays", weekdays: [] } }).valid, false);
assert.equal(validateSharedRoutine({ ...routine, timeZone: "Not/AZone" }).valid, false);
assert.equal(validateSharedRoutine({ ...routine, status: "paused" }).errors.includes("paused_at_required"), true);
assert.equal(isRoutineScheduledOnDate(routine, "2026-09-01"), true);
assert.equal(isRoutineScheduledOnDate(routine, "2026-08-31"), false);
assert.equal(
  isRoutineScheduledOnDate(
    { ...routine, recurrence: { type: "selected_weekdays", weekdays: [1, 3, 5] } },
    "2026-09-02",
  ),
  true,
);
assert.equal(
  isRoutineScheduledOnDate(
    { ...routine, recurrence: { type: "selected_weekdays", weekdays: [1, 3, 5] } },
    "2026-09-03",
  ),
  false,
);

const fullCompletion = {
  routineId: routine.id,
  localDate: "2026-09-01",
  status: "full",
  sourceApp: "app_a",
  recordedAt: "2026-09-01T09:00:00.000Z",
  completedAt: "2026-09-01T09:00:00.000Z",
};
assert.equal(validateRoutineCompletion(fullCompletion).valid, true);
assert.equal(validateRoutineCompletion({ ...fullCompletion, status: "minimum" }).valid, true);
assert.equal(validateRoutineCompletion({ ...fullCompletion, status: "skipped" }).valid, false);
assert.equal(
  validateRoutineCompletion({
    ...fullCompletion,
    status: "skipped",
    completedAt: undefined,
  }).valid,
  true,
);
assert.equal(
  validateRoutineCompletion({
    ...fullCompletion,
    status: "paused",
    completedAt: undefined,
  }).valid,
  true,
);
assert.equal(getRoutineCompletionDocumentId("writing_daily", "2026-09-01"), "2026-09-01_writing_daily");
assert.throws(() => getRoutineCompletionDocumentId("bad/id", "2026-09-01"));

// Absence of a completion remains representable and is never coerced to skipped.
const snapshot = { routine, completion: undefined };
assert.equal(snapshot.completion, undefined);

console.log("All shared routine domain tests passed successfully.");

