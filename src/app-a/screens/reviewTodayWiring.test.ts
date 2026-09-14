import assert from "node:assert/strict";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import type { SharedRoutine, RoutineCompletion } from "../../shared/domain/routines/contracts";
import { calculateDailyLoad } from "../domain/daily-reset/dailyLoad";

function createTestFixture() {
  const draft: DailyPlanDraft = {
    classifiedItems: [],
    firstFocus: [
      {
        id: "task_1",
        sourceItemIds: ["task_1"],
        title: "Code Review",
        block: "first_focus",
        estimatedMinutes: 60,
        capacityType: "flexible",
        requiredEnergy: 3,
        timeSensitivity: "none",
        priority: { explanation: "Important task" },
        needsCheck: false,
      },
    ],
    laterToday: [
      {
        id: "task_2",
        sourceItemIds: ["task_2"],
        title: "All Hands Meeting",
        block: "later_today",
        estimatedMinutes: 60,
        capacityType: "fixed",
        requiredEnergy: 2,
        timeSensitivity: "urgent",
        priority: { explanation: "Company meeting" },
        needsCheck: false,
      },
    ],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Work day",
    availableMinutes: 180,
    plannedRequiredMinutes: 60,
    plannedOptionalMinutes: 60,
    localDate: "2026-09-12",
  };

  const routines: SharedRoutine[] = [
    {
      id: "r_daily_stretch",
      title: "Daily Stretch",
      fullAction: "Stretch 15m",
      minimumAction: "Stretch 5m",
      recurrence: { type: "daily" },
      frequency: { kind: "daily" },
      estimatedMinutes: 15,
      status: "active",
      timeZone: "UTC",
      language: "en",
      source: "user",
      sortOrder: 1,
      goalRelationships: [],
      activeFrom: "2026-09-01",
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
      origin: { kind: "manual" },
      revision: 1,
    },
    {
      id: "r_weekly_gym",
      title: "Gym Workout",
      fullAction: "Gym 45m",
      minimumAction: "Walk 15m",
      recurrence: { type: "daily" },
      frequency: { kind: "times_per_week", count: 3 },
      estimatedMinutes: 45,
      status: "active",
      timeZone: "UTC",
      language: "en",
      source: "user",
      sortOrder: 2,
      goalRelationships: [],
      activeFrom: "2026-09-01",
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
      origin: { kind: "manual" },
      revision: 1,
    },
  ];

  return { draft, routines };
}

function runReviewAndTodayWiringTests() {
  console.log("Starting Review & Today Shared Daily Load Wiring Integration Tests...");

  const { draft, routines } = createTestFixture();
  const localDate = "2026-09-12";
  const timeZone = "UTC";
  const completedItemIds: string[] = [];
  const routineCompletions: RoutineCompletion[] = [];
  const plannedRoutineIds: string[] = [];

  // 1. Both screens pass identical parameters and evaluate identical load
  const reviewParams = {
    draft,
    completedItemIds,
    routines,
    routineCompletions,
    plannedRoutineIds,
    localDate,
    timeZone,
    availableMinutes: draft.availableMinutes,
  };

  const todayParams = {
    draft,
    completedItemIds,
    routines,
    routineCompletions,
    plannedRoutineIds,
    localDate,
    timeZone,
    availableMinutes: draft.availableMinutes,
  };

  const reviewLoad = calculateDailyLoad(reviewParams);
  const todayLoad = calculateDailyLoad(todayParams);

  assert.deepStrictEqual(reviewLoad, todayLoad, "Review and Today must produce identical Daily Load results");
  assert.strictEqual(reviewLoad.taskFlexibleMinutes, 60);
  assert.strictEqual(reviewLoad.taskFixedMinutes, 60);
  assert.strictEqual(reviewLoad.routinePlannedMinutes, 15); // Daily stretch is scheduled
  assert.strictEqual(reviewLoad.totalRemainingMinutes, 135);
  console.log("✅ 1. Review and Today yield identical Daily Load for the exact same input fixture");

  // 2. Refresh after Full Completion of a routine
  const fullCompletions: RoutineCompletion[] = [
    {
      routineId: "r_daily_stretch",
      localDate,
      status: "full",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const loadAfterFull = calculateDailyLoad({ ...todayParams, routineCompletions: fullCompletions });
  assert.strictEqual(loadAfterFull.routineRemainingMinutes, 0);
  assert.strictEqual(loadAfterFull.totalRemainingMinutes, 120); // 135 - 15 = 120
  console.log("✅ 2. Load correctly refreshes after full routine completion");

  // 3. Refresh after Minimum Completion of a routine
  const minCompletions: RoutineCompletion[] = [
    {
      routineId: "r_daily_stretch",
      localDate,
      status: "minimum",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const loadAfterMin = calculateDailyLoad({ ...todayParams, routineCompletions: minCompletions });
  assert.strictEqual(loadAfterMin.routineRemainingMinutes, 0);
  assert.strictEqual(loadAfterMin.totalRemainingMinutes, 120);
  console.log("✅ 3. Load correctly refreshes after minimum routine completion");

  // 4. Refresh after Skipped routine
  const skippedCompletions: RoutineCompletion[] = [
    {
      routineId: "r_daily_stretch",
      localDate,
      status: "skipped",
      sourceApp: "app_a",
      recordedAt: "2026-09-12T09:00:00Z",
    },
  ];
  const loadAfterSkipped = calculateDailyLoad({ ...todayParams, routineCompletions: skippedCompletions });
  assert.strictEqual(loadAfterSkipped.routineRemainingMinutes, 0);
  assert.strictEqual(loadAfterSkipped.totalRemainingMinutes, 120);
  console.log("✅ 4. Load correctly refreshes after skipped routine");

  // 5. Refresh after Explicit Planning of flexible routine
  const loadAfterPlanned = calculateDailyLoad({
    ...todayParams,
    plannedRoutineIds: ["r_weekly_gym"],
  });
  assert.strictEqual(loadAfterPlanned.routinePlannedMinutes, 60); // 15 + 45 = 60
  assert.strictEqual(loadAfterPlanned.routineRemainingMinutes, 60);
  assert.strictEqual(loadAfterPlanned.totalRemainingMinutes, 180); // 120 + 60 = 180
  console.log("✅ 5. Load correctly refreshes after explicit planning of flexible routine");

  // 6. Refresh after Removing flexible routine from day
  const loadAfterUnplanned = calculateDailyLoad({
    ...todayParams,
    plannedRoutineIds: [],
  });
  assert.strictEqual(loadAfterUnplanned.routinePlannedMinutes, 15);
  assert.strictEqual(loadAfterUnplanned.routineRemainingMinutes, 15);
  assert.strictEqual(loadAfterUnplanned.totalRemainingMinutes, 135);
  console.log("✅ 6. Load correctly refreshes after removing flexible routine from day");
}

runReviewAndTodayWiringTests();
console.log("All Review and Today wiring tests passed successfully!");
