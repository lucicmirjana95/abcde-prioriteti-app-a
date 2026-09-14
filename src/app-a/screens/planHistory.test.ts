import assert from "node:assert/strict";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";
import type { RoutineCompletion } from "../../shared/domain/routines/contracts";
import { formatHistoryDate, getInboxItems, getProgressSummary, getVisionItems } from "./planHistory";

const item = (id: string, kind: "task" | "idea" | "waiting_for", timeHorizon: "this_week" | "later" | "long_term_idea") => ({
  id,
  originalText: id,
  kind,
  timeHorizon,
  timeSensitivity: "none" as const,
  isAmbiguous: false,
  needsCheck: false,
  priority: { explanation: "test" },
});

const document = {
  schemaVersion: 1,
  localDate: "2026-08-30",
  timezone: "Europe/Belgrade",
  language: "sr",
  status: "confirmed",
  checkIn: {},
  plan: {
    classifiedItems: [item("wait", "waiting_for", "later"), item("idea", "idea", "long_term_idea")],
    firstFocus: [{ id: "p1", title: "Task 1" }],
    laterToday: [{ id: "p2", title: "Task 2" }],
    ifCapacityRemains: [{ id: "p3", title: "Task 3" }],
    deferredItems: [item("later", "task", "this_week"), item("wait", "waiting_for", "later")],
    longTermIdeas: [item("idea", "idea", "long_term_idea")],
    nonActionItems: [],
  },
  execution: { completedItemIds: ["p1", "p1", "stale"] },
} as unknown as AppADailyPlanDocument;

assert.deepEqual(getInboxItems([document]).map((entry) => entry.item.id), ["later", "wait"]);
assert.deepEqual(getVisionItems([document]).map((entry) => entry.item.id), ["idea"]);
assert.deepEqual(getProgressSummary([document]), {
  completedTasks: 1,
  activeDays: 1,
  plannedDays: 1,
  days: [{ localDate: "2026-08-30", completed: 1, total: 3, completedItems: [{ id: "p1", title: "Task 1", sourceRoutineId: undefined }] }],
});
assert.deepEqual(getProgressSummary([]), { completedTasks: 0, activeDays: 0, plannedDays: 0, days: [] });
assert.match(formatHistoryDate("2026-08-30", "sr"), /30/);
assert.equal(formatHistoryDate("not-a-date", "en"), "not-a-date");

console.log("Starting Progress Deduplication & Routine Integration Tests...");

// 1. Linked task with sourceRoutineId is deduplicated on the same date
{
  const planDoc = {
    schemaVersion: 1,
    localDate: "2026-09-01",
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: {},
    plan: {
      classifiedItems: [],
      firstFocus: [
        { id: "task_stretch", title: "Morning Stretch", estimatedMinutes: 20, sourceRoutineId: "r_stretch" },
        { id: "task_stretch_2", title: "Evening Stretch", estimatedMinutes: 10, sourceRoutineId: "r_stretch" },
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
    },
    execution: { completedItemIds: ["task_stretch", "task_stretch_2"] },
  } as unknown as AppADailyPlanDocument;

  const routineCompletions: RoutineCompletion[] = [
    {
      routineId: "r_stretch",
      localDate: "2026-09-01",
      status: "full",
      sourceApp: "app_a",
      recordedAt: "2026-09-01T08:00:00Z",
    },
  ];

  const summary = getProgressSummary([planDoc], routineCompletions);
  // 2 completed tasks for same sourceRoutineId "r_stretch" deduplicate to 1 completed event
  assert.strictEqual(summary.completedTasks, 1);
  assert.strictEqual(summary.days[0].completed, 1);
  console.log("✅ 1. Multiple linked tasks with same sourceRoutineId deduplicate to 1 event on date");
}

// 2. Deduplication is based on routineId/sourceRoutineId, NOT on title
{
  const planDoc = {
    schemaVersion: 1,
    localDate: "2026-09-02",
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: {},
    plan: {
      classifiedItems: [],
      firstFocus: [
        { id: "task_1", title: "Stretch", estimatedMinutes: 15, sourceRoutineId: "r_morning_stretch" },
        { id: "task_2", title: "Stretch", estimatedMinutes: 15, sourceRoutineId: "r_evening_stretch" },
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
    },
    execution: { completedItemIds: ["task_1", "task_2"] },
  } as unknown as AppADailyPlanDocument;

  const summary = getProgressSummary([planDoc]);
  // 2 different routine IDs ("r_morning_stretch" and "r_evening_stretch") with same title "Stretch" remain 2 events
  assert.strictEqual(summary.completedTasks, 2);
  assert.strictEqual(summary.days[0].completed, 2);
  console.log("✅ 2. 2 different routine IDs with same title remain 2 distinct events");
}

// 3. Legacy task without sourceRoutineId is not linked by title guessing
{
  const planDoc = {
    schemaVersion: 1,
    localDate: "2026-09-03",
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: {},
    plan: {
      classifiedItems: [],
      firstFocus: [
        { id: "task_legacy", title: "Meditation", estimatedMinutes: 20 }, // no sourceRoutineId
        { id: "task_routine", title: "Meditation", estimatedMinutes: 20, sourceRoutineId: "r_meditation" },
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
    },
    execution: { completedItemIds: ["task_legacy", "task_routine"] },
  } as unknown as AppADailyPlanDocument;

  const summary = getProgressSummary([planDoc]);
  // Legacy task is not guessed/merged with routine -> 2 distinct events
  assert.strictEqual(summary.completedTasks, 2);
  console.log("✅ 3. Legacy task without sourceRoutineId is never guessed by title");
}

// 4. Skipped routine completion does not count as completion
{
  const skippedCompletion: RoutineCompletion = {
    routineId: "r_reading",
    localDate: "2026-09-04",
    status: "skipped",
    sourceApp: "app_a",
    recordedAt: "2026-09-04T08:00:00Z",
  };

  const planDoc = {
    schemaVersion: 1,
    localDate: "2026-09-04",
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: {},
    plan: {
      classifiedItems: [],
      firstFocus: [{ id: "t_read", title: "Read", estimatedMinutes: 30, sourceRoutineId: "r_reading" }],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
    },
    execution: { completedItemIds: [] },
  } as unknown as AppADailyPlanDocument;

  const summary = getProgressSummary([planDoc], [skippedCompletion]);
  assert.strictEqual(summary.completedTasks, 0);
  console.log("✅ 4. Skipped routine completion does not increment progress");
}

// 5. Minimum and full both count as 1 completion event without duplicating
{
  const fullCompletion: RoutineCompletion = {
    routineId: "r_code",
    localDate: "2026-09-05",
    status: "full",
    sourceApp: "app_a",
    recordedAt: "2026-09-05T08:00:00Z",
  };

  const planDoc = {
    schemaVersion: 1,
    localDate: "2026-09-05",
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: {},
    plan: {
      classifiedItems: [],
      firstFocus: [{ id: "t_code", title: "Coding", estimatedMinutes: 60, sourceRoutineId: "r_code" }],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
    },
    execution: { completedItemIds: ["t_code"] },
  } as unknown as AppADailyPlanDocument;

  const summary = getProgressSummary([planDoc], [fullCompletion]);
  assert.strictEqual(summary.completedTasks, 1);
  console.log("✅ 5. Full completion with linked task counts as exactly 1 event");
}

console.log("All plan history tests passed successfully!");
