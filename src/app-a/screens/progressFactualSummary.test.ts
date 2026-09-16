import assert from "node:assert/strict";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";
import type { RoutineCompletion } from "../../shared/domain/routines/contracts";
import {
  calculateConsistencyStreak,
  computeFactualChangeSummary,
  getProgressSummary,
} from "./planHistory";

console.log("Starting Factual Progress Summary & Zero Gamification Tests...");

// 1. Consistency streak calculation tests
{
  assert.equal(calculateConsistencyStreak([]), 0, "Empty list has 0 streak");
  assert.equal(
    calculateConsistencyStreak([{ localDate: "2026-09-10", completed: 0 }]),
    0,
    "Latest day incomplete results in 0 streak",
  );
  assert.equal(
    calculateConsistencyStreak([{ localDate: "2026-09-10", completed: 2 }]),
    1,
    "Single active day has 1 streak",
  );
  assert.equal(
    calculateConsistencyStreak([
      { localDate: "2026-09-08", completed: 1 },
      { localDate: "2026-09-09", completed: 3 },
      { localDate: "2026-09-10", completed: 2 },
    ]),
    3,
    "Three consecutive active calendar days have streak of 3",
  );
  assert.equal(
    calculateConsistencyStreak([
      { localDate: "2026-09-07", completed: 1 },
      { localDate: "2026-09-08", completed: 0 }, // Gap/inactive
      { localDate: "2026-09-09", completed: 2 },
      { localDate: "2026-09-10", completed: 2 },
    ]),
    2,
    "Inactive intermediate day breaks streak",
  );
  assert.equal(
    calculateConsistencyStreak([
      { localDate: "2026-09-05", completed: 2 }, // Gap of 3 days
      { localDate: "2026-09-09", completed: 2 },
      { localDate: "2026-09-10", completed: 2 },
    ]),
    2,
    "Calendar gap breaks streak",
  );
  console.log("✅ 1. Consistency streak behaves deterministically without gamification");
}

// 2. Focus counts and energy calculations
{
  const makeDoc = (
    date: string,
    completedIds: string[],
    energy?: number,
    pleasantness?: number,
  ): AppADailyPlanDocument =>
    ({
      schemaVersion: 1,
      localDate: date,
      timezone: "Europe/Belgrade",
      language: "sr",
      status: "confirmed",
      checkIn: { energy, pleasantness },
      plan: {
        classifiedItems: [],
        firstFocus: [
          { id: "focus_1", title: "Focus 1" },
          { id: "focus_2", title: "Focus 2" },
        ],
        laterToday: [{ id: "later_1", title: "Later 1" }],
        ifCapacityRemains: [{ id: "opt_1", title: "Optional 1" }],
        deferredItems: [],
        longTermIdeas: [],
        nonActionItems: [],
      },
      execution: { completedItemIds: completedIds },
    } as unknown as AppADailyPlanDocument);

  const docs = [
    makeDoc("2026-09-08", ["focus_1"], 4, 3),
    makeDoc("2026-09-09", ["focus_1", "focus_2", "later_1"], 5, 4),
    makeDoc("2026-09-10", ["opt_1"], 3, 2), // Focus not completed
  ];

  const summary = getProgressSummary(docs);
  assert.equal(summary.plannedDays, 3, "Planned days should be 3");
  assert.equal(summary.activeDays, 3, "Active days should be 3");
  assert.equal(summary.totalFocusCount, 6, "Total focus count across 3 days is 6");
  assert.equal(summary.completedFocusCount, 3, "Completed focus tasks should be 3 (1 on day 1, 2 on day 2, 0 on day 3)");
  assert.equal(summary.completedTasks, 5, "Total completed tasks should be 5");
  assert.equal(summary.averageEnergy, 4.0, "Average energy of (4+5+3)/3 = 4.0");
  assert.equal(summary.averagePleasantness, 3.0, "Average pleasantness of (3+4+2)/3 = 3.0");
  assert.equal(summary.consistencyStreak, 3, "3 consecutive days");
  console.log("✅ 2. Focus counts, completed tasks, and average energy/pleasantness match reality");
}

// 3. Factual Change Summary (Šta se promenilo)
{
  const emptySummary = computeFactualChangeSummary([], 0, 0);
  assert.match(emptySummary.en, /No completed focuses/);
  assert.match(emptySummary.sr, /Još nema zabeleženih/);
  assert.match(emptySummary.tr, /Henüz tamamlanmış/);

  // Single period summary
  const singlePeriodSummary = computeFactualChangeSummary(
    [
      {
        localDate: "2026-09-10",
        completed: 2,
        total: 3,
        completedItems: [],
        completedFocusCount: 1,
        totalFocusCount: 1,
      },
    ],
    1,
    1,
  );
  assert.match(singlePeriodSummary.en, /You completed 1 primary focus tasks across 1 active days/);
  assert.match(singlePeriodSummary.sr, /Završili ste 1 primarnih fokus zadataka/);

  // Comparative momentum summary (recent vs prior period)
  const multiDayList = [
    // Prior period (days 1-2)
    { localDate: "2026-09-01", completed: 1, total: 2, completedItems: [], completedFocusCount: 0, totalFocusCount: 1 },
    { localDate: "2026-09-02", completed: 1, total: 2, completedItems: [], completedFocusCount: 1, totalFocusCount: 1 },
    // Recent period (days 3-9: 7 days)
    { localDate: "2026-09-03", completed: 1, total: 2, completedItems: [], completedFocusCount: 1, totalFocusCount: 1 },
    { localDate: "2026-09-04", completed: 1, total: 2, completedItems: [], completedFocusCount: 1, totalFocusCount: 1 },
    { localDate: "2026-09-05", completed: 1, total: 2, completedItems: [], completedFocusCount: 1, totalFocusCount: 1 },
    { localDate: "2026-09-06", completed: 1, total: 2, completedItems: [], completedFocusCount: 1, totalFocusCount: 1 },
    { localDate: "2026-09-07", completed: 1, total: 2, completedItems: [], completedFocusCount: 1, totalFocusCount: 1 },
    { localDate: "2026-09-08", completed: 1, total: 2, completedItems: [], completedFocusCount: 1, totalFocusCount: 1 },
    { localDate: "2026-09-09", completed: 1, total: 2, completedItems: [], completedFocusCount: 1, totalFocusCount: 1 },
  ];

  const comparative = computeFactualChangeSummary(multiDayList, 8, 9);
  // Recent 7 days had 7 focuses, prior 2 days had 1 focus. Diff = +6
  assert.match(comparative.en, /\+6 compared to the previous period/);
  assert.match(comparative.sr, /\+6 u odnosu na prethodni period/);
  console.log("✅ 3. Factual change summary provides real comparative insight");
}

// 4. Zero Gamification Verification
{
  const testDoc: AppADailyPlanDocument = {
    schemaVersion: 1,
    localDate: "2026-09-10",
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: { energy: 4 },
    plan: {
      classifiedItems: [],
      firstFocus: [{ id: "f1", title: "Write report" }],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
    },
    execution: { completedItemIds: ["f1"] },
  } as unknown as AppADailyPlanDocument;

  const summary = getProgressSummary([testDoc]);
  const serialized = JSON.stringify(summary).toLowerCase();

  // Strict check: No XP, points, levels, badges, pet, zen garden
  assert.equal(serialized.includes("xp"), false, "Must not contain XP");
  assert.equal(serialized.includes("level"), false, "Must not contain levels");
  assert.equal(serialized.includes("badge"), false, "Must not contain badges");
  assert.equal(serialized.includes("pet"), false, "Must not contain pet");
  assert.equal(serialized.includes("zengarden"), false, "Must not contain zen garden");
  assert.equal(serialized.includes("score"), false, "Must not contain score");

  console.log("✅ 4. Zero gamification strictly verified across progress payload");
}

console.log("All Factual Progress Summary tests passed successfully!");
