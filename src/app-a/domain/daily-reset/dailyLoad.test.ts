import assert from "node:assert/strict";
import type { DailyPlanDraft, DailyPlanItem } from "./contracts";
import type { SharedRoutine } from "../../../shared/domain/routines/contracts";
import { assessDailyLoad, calculateDailyLoad } from "./dailyLoad";

function createItem(
  id: string,
  minutes: number,
  capacityType: "flexible" | "fixed" = "flexible",
  block: "first_focus" | "later_today" | "if_capacity_remains" = "later_today",
  sourceRoutineId?: string,
): DailyPlanItem {
  return {
    id,
    sourceItemIds: [id],
    title: id,
    block,
    estimatedMinutes: minutes,
    capacityType,
    requiredEnergy: 3,
    timeSensitivity: "none",
    priority: { consequence: 1, urgency: 1, explanation: "" },
    needsCheck: false,
    sourceRoutineId,
  };
}

function createDraft(partial: Partial<DailyPlanDraft>): DailyPlanDraft {
  return {
    classifiedItems: [],
    firstFocus: [],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "",
    availableMinutes: 480,
    plannedRequiredMinutes: 0,
    plannedOptionalMinutes: 0,
    ...partial,
  };
}

function createRoutine(partial: Partial<SharedRoutine>): SharedRoutine {
  return {
    id: "r_test",
    title: "Test Routine",
    fullAction: "Action full",
    minimumAction: "Action min",
    recurrence: { type: "daily" },
    frequency: { kind: "daily" },
    status: "active",
    timeZone: "Europe/Belgrade",
    language: "sr",
    source: "user",
    sortOrder: 1,
    goalRelationships: [],
    activeFrom: "2026-01-01",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    estimatedMinutes: 30,
    origin: { kind: "manual" },
    revision: 1,
    ...partial,
  };
}

function runDailyLoadCanonicalSemanticsTests() {
  console.log("Running Daily Load Canonical Semantics Tests...");

  // 1. 480 total available, 120 fixed, 240 flexible
  {
    const draft = createDraft({
      firstFocus: [createItem("task-flex-1", 120, "flexible", "first_focus")],
      laterToday: [
        createItem("task-fixed-1", 120, "fixed", "later_today"),
        createItem("task-flex-2", 120, "flexible", "later_today"),
      ],
      availableMinutes: 480,
    });

    const res = calculateDailyLoad({ draft });
    assert.strictEqual(res.availableMinutes, 480);
    assert.strictEqual(res.taskFixedMinutes, 120);
    assert.strictEqual(res.taskFlexibleMinutes, 240);
    assert.strictEqual(res.totalPlannedMinutes, 360);
    assert.strictEqual(res.totalRemainingMinutes, 360);
    assert.strictEqual(res.remainingCapacityMinutes, 120);
    assert.strictEqual(res.isOverCapacity, false);
    assert.strictEqual(res.overCapacityMinutes, 0);
    console.log("✅ 1. 480 total, 120 fixed, 240 flexible -> 360 remaining, 120 capacity left");
  }

  // 2. 360 available capacity after 120 fixed, 240 flexible
  {
    const draft = createDraft({
      laterToday: [
        createItem("meeting-fixed", 120, "fixed", "later_today"),
        createItem("coding-flex", 240, "flexible", "later_today"),
      ],
      availableMinutes: 360,
    });

    const res = calculateDailyLoad({ draft });
    assert.strictEqual(res.availableMinutes, 360);
    assert.strictEqual(res.taskFixedMinutes, 120);
    assert.strictEqual(res.taskFlexibleMinutes, 240);
    assert.strictEqual(res.totalPlannedMinutes, 360);
    assert.strictEqual(res.totalRemainingMinutes, 360);
    assert.strictEqual(res.remainingCapacityMinutes, 0);
    assert.strictEqual(res.isOverCapacity, false);
    assert.strictEqual(res.overCapacityMinutes, 0);
    console.log("✅ 2. 360 available with 120 fixed + 240 flexible -> exact capacity (0 left, 0 over)");
  }

  // 3. Completed fixed commitment frees fixed remaining load without double deducting
  {
    const draft = createDraft({
      laterToday: [
        createItem("meeting-fixed", 120, "fixed", "later_today"),
        createItem("coding-flex", 240, "flexible", "later_today"),
      ],
      availableMinutes: 360,
    });

    const res = calculateDailyLoad({ draft, completedItemIds: ["meeting-fixed"] });
    assert.strictEqual(res.taskFixedMinutes, 0); // incomplete fixed is 0
    assert.strictEqual(res.taskFlexibleMinutes, 240);
    assert.strictEqual(res.totalPlannedMinutes, 360);
    assert.strictEqual(res.totalRemainingMinutes, 240);
    assert.strictEqual(res.remainingCapacityMinutes, 120);
    assert.strictEqual(res.isOverCapacity, false);
    console.log("✅ 3. Completed fixed commitment frees fixed load");
  }

  // 4. Completed flexible commitment frees flexible load
  {
    const draft = createDraft({
      firstFocus: [createItem("task-flex-1", 120, "flexible", "first_focus")],
      laterToday: [createItem("task-flex-2", 120, "flexible", "later_today")],
      availableMinutes: 200,
    });

    const res = calculateDailyLoad({ draft, completedItemIds: ["task-flex-1"] });
    assert.strictEqual(res.taskFlexibleMinutes, 120);
    assert.strictEqual(res.totalRemainingMinutes, 120);
    assert.strictEqual(res.remainingCapacityMinutes, 80);
    assert.strictEqual(res.isOverCapacity, false);
    console.log("✅ 4. Completed flexible commitment frees flexible load");
  }

  // 5. Combination of tasks and routines
  {
    const draft = createDraft({
      firstFocus: [createItem("task-1", 60, "flexible", "first_focus")],
      laterToday: [createItem("task-2", 60, "flexible", "later_today")],
      availableMinutes: 180,
    });

    const routines: SharedRoutine[] = [
      createRoutine({
        id: "r-meditation",
        title: "Meditation",
        estimatedMinutes: 30,
      }),
    ];

    const res = calculateDailyLoad({ draft, routines, localDate: "2026-08-31" });
    assert.strictEqual(res.taskFlexibleMinutes, 120);
    assert.strictEqual(res.routinePlannedMinutes, 30);
    assert.strictEqual(res.routineRemainingMinutes, 30);
    assert.strictEqual(res.totalPlannedMinutes, 150);
    assert.strictEqual(res.totalRemainingMinutes, 150);
    assert.strictEqual(res.remainingCapacityMinutes, 30);
    assert.strictEqual(res.isOverCapacity, false);
    console.log("✅ 5. Combination of tasks and routines accurately aggregated");
  }

  // 6. Exact capacity boundary
  {
    const draft = createDraft({
      firstFocus: [createItem("task-1", 90, "flexible", "first_focus")],
      availableMinutes: 90,
    });

    const res = calculateDailyLoad({ draft });
    assert.strictEqual(res.totalRemainingMinutes, 90);
    assert.strictEqual(res.availableMinutes, 90);
    assert.strictEqual(res.isOverCapacity, false);
    assert.strictEqual(res.overCapacityMinutes, 0);
    assert.strictEqual(res.remainingCapacityMinutes, 0);
    console.log("✅ 6. Exact capacity boundary verified");
  }

  // 7. Over capacity
  {
    const draft = createDraft({
      firstFocus: [createItem("task-1", 90, "flexible", "first_focus")],
      laterToday: [createItem("task-2", 60, "flexible", "later_today")],
      availableMinutes: 100,
    });

    const res = calculateDailyLoad({ draft });
    assert.strictEqual(res.totalRemainingMinutes, 150);
    assert.strictEqual(res.availableMinutes, 100);
    assert.strictEqual(res.isOverCapacity, true);
    assert.strictEqual(res.overCapacityMinutes, 50);
    assert.strictEqual(res.remainingCapacityMinutes, 0);
    assert.strictEqual(res.suggestedMoves.length, 1);
    console.log("✅ 7. Over capacity excess minutes reported accurately");
  }
}

runDailyLoadCanonicalSemanticsTests();
console.log("All Daily Load tests passed successfully!");
