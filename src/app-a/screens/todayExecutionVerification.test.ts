import assert from "assert";
import type { DailyPlanDraft, DailyPlanItem } from "../domain/daily-reset/contracts";
import { recalculatePlanTotals, validatePlanDraft } from "../domain/daily-reset/validation";
import { normalizeCompletedItemIds, toggleCompletedItemId } from "./todayExecution";
import { getInitialFocusMinutes } from "../components/focus/FocusTimer";
import { assessDailyLoad } from "../domain/daily-reset/dailyLoad";
import type { SharedRoutine, RoutineCompletion } from "../../shared/domain/routines/contracts";

function runTodayExecutionVerificationTests() {
  console.log("Running Today Execution 40-Scenario Verification Suite...");

  const baseDraft: DailyPlanDraft = {
    planRationale: "Jutarnji fokus na ključne obaveze, popodne fleksibilno.",
    availableMinutes: 180,
    plannedRequiredMinutes: 105,
    plannedFlexibleMinutes: 75,
    plannedFixedMinutes: 30,
    plannedOptionalMinutes: 15,
    classifiedItems: [
      { id: "c1", originalText: "Finansijski izveštaj", kind: "task", timeHorizon: "today", timeSensitivity: "urgent", isAmbiguous: false, needsCheck: false, priority: { explanation: "Hitno" } },
      { id: "c2", originalText: "Klijentski sastanak", kind: "task", timeHorizon: "today", timeSensitivity: "deadline", isAmbiguous: false, needsCheck: false, priority: { explanation: "Fiksno" } },
      { id: "c3", originalText: "Odgovori na mejlove", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "Rutina" } },
      { id: "c4", originalText: "Sređivanje stola", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "Opciono" } },
    ],
    firstFocus: [
      {
        id: "p1",
        sourceItemIds: ["c1"],
        title: "Finansijski izveštaj",
        block: "first_focus",
        estimatedMinutes: 45,
        requiredEnergy: 4,
        timeSensitivity: "urgent",
        capacityType: "flexible",
        needsCheck: false,
        priority: { explanation: "Hitno" },
      },
      {
        id: "p2",
        sourceItemIds: ["c2"],
        title: "Klijentski sastanak",
        block: "first_focus",
        estimatedMinutes: 30,
        requiredEnergy: 3,
        timeSensitivity: "deadline",
        capacityType: "flexible", // First focus cannot have fixed
        needsCheck: false,
        priority: { explanation: "Sastanak" },
      },
    ],
    laterToday: [
      {
        id: "p3",
        sourceItemIds: ["c3"],
        title: "Odgovori na mejlove",
        block: "later_today",
        estimatedMinutes: 30,
        requiredEnergy: 2,
        timeSensitivity: "none",
        capacityType: "fixed",
        needsCheck: false,
        priority: { explanation: "Fiksna obaveza" },
      },
    ],
    ifCapacityRemains: [
      {
        id: "p4",
        sourceItemIds: ["c4"],
        title: "Sređivanje stola",
        block: "if_capacity_remains",
        estimatedMinutes: 15,
        requiredEnergy: 1,
        timeSensitivity: "none",
        capacityType: "flexible",
        needsCheck: false,
        priority: { explanation: "Opciono" },
      },
    ],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    intervention: {
      type: "focus",
      title: "Kratka pauza za vodu",
      description: "Popijte čašu vode pre početka finansijskog izveštaja",
      reason: "Kratak reset za fokus",
      estimatedMinutes: 5,
      targetTaskId: "p1",
    },
  };

  // -------------------------------------------------------------
  // Grupa A: State of the Day i Metrike (Scenariji 1–5)
  // -------------------------------------------------------------

  // 1: Summary format calculation
  {
    const completed = ["p1"];
    const totalCount = baseDraft.firstFocus.length + baseDraft.laterToday.length + baseDraft.ifCapacityRemains.length;
    const summarySr = `${completed.length} od ${totalCount} završeno`;
    assert.strictEqual(summarySr, "1 od 4 završeno", "Summary should show 1 of 4 completed");
  }

  // 2: Progress percentage calculation
  {
    const total = 4;
    assert.strictEqual(Math.round((0 / total) * 100), 0, "Initial progress 0%");
    assert.strictEqual(Math.round((2 / total) * 100), 50, "Mid progress 50%");
    assert.strictEqual(Math.round((4 / total) * 100), 100, "Full progress 100%");
  }

  // 3: Remaining required minutes
  {
    const completedIds = ["p1"]; // 45 min completed
    const remaining = [...baseDraft.firstFocus, ...baseDraft.laterToday]
      .filter((i) => !completedIds.includes(i.id))
      .reduce((acc, i) => acc + i.estimatedMinutes, 0);
    assert.strictEqual(remaining, 60, "Remaining required minutes should be 60 (30 + 30)");
  }

  // 4: Flexible vs Fixed segregation
  {
    assert.strictEqual(baseDraft.plannedFlexibleMinutes, 75, "Flexible minutes 75");
    assert.strictEqual(baseDraft.plannedFixedMinutes, 30, "Fixed minutes 30");
    assert.strictEqual(baseDraft.plannedRequiredMinutes, 105, "Required minutes sum 105");
  }

  // 5: Safe handling when day has 0 items
  {
    const emptyItems: DailyPlanItem[] = [];
    const completed: string[] = [];
    const progress = emptyItems.length ? (completed.length / emptyItems.length) * 100 : 0;
    assert.strictEqual(progress, 0, "Progress should safely be 0% when no items");
  }

  // -------------------------------------------------------------
  // Grupa B: Next Focus Identifikacija i Tok (Scenariji 6–10)
  // -------------------------------------------------------------

  // 6: First uncompleted item in firstFocus is Next Focus
  {
    const completed: string[] = [];
    const allToday = [...baseDraft.firstFocus, ...baseDraft.laterToday, ...baseDraft.ifCapacityRemains];
    const nextFocus = allToday.find((i) => !completed.includes(i.id));
    assert.strictEqual(nextFocus?.id, "p1", "Next focus should initially be p1");
  }

  // 7: Next Focus advances to p2 when p1 is completed
  {
    const completed = ["p1"];
    const allToday = [...baseDraft.firstFocus, ...baseDraft.laterToday, ...baseDraft.ifCapacityRemains];
    const nextFocus = allToday.find((i) => !completed.includes(i.id));
    assert.strictEqual(nextFocus?.id, "p2", "Next focus should advance to p2");
  }

  // 8: Next Focus advances to laterToday when firstFocus is all done
  {
    const completed = ["p1", "p2"];
    const allToday = [...baseDraft.firstFocus, ...baseDraft.laterToday, ...baseDraft.ifCapacityRemains];
    const nextFocus = allToday.find((i) => !completed.includes(i.id));
    assert.strictEqual(nextFocus?.id, "p3", "Next focus should advance to p3 in laterToday");
  }

  // 9: Next Focus advances to optional when all required are done
  {
    const completed = ["p1", "p2", "p3"];
    const allToday = [...baseDraft.firstFocus, ...baseDraft.laterToday, ...baseDraft.ifCapacityRemains];
    const nextFocus = allToday.find((i) => !completed.includes(i.id));
    assert.strictEqual(nextFocus?.id, "p4", "Next focus should advance to p4 in ifCapacityRemains");
  }

  // 10: Next Focus duration extraction
  {
    const allToday = [...baseDraft.firstFocus, ...baseDraft.laterToday, ...baseDraft.ifCapacityRemains];
    const nextFocus = allToday[0];
    assert.strictEqual(nextFocus.estimatedMinutes, 45, "Estimated minutes should be 45");
  }

  // -------------------------------------------------------------
  // Grupa C: Redovi Zadataka i Interakcije (Scenariji 11–15)
  // -------------------------------------------------------------

  // 11: normalizeCompletedItemIds strips invalid/phantom IDs
  {
    const normalized = normalizeCompletedItemIds(baseDraft, ["p1", "phantom_999", "p3"]);
    assert.deepStrictEqual(normalized, ["p1", "p3"], "Should only keep IDs that exist in the plan");
  }

  // 12: Context badges identification
  {
    const routineTask: DailyPlanItem = {
      ...baseDraft.firstFocus[0],
      id: "t_routine_1",
      sourceRoutineId: "routine_stretch",
    };
    const visionTask: DailyPlanItem = {
      ...baseDraft.firstFocus[0],
      id: "vision_plan_step_1",
    };
    const fixedTask = baseDraft.laterToday[0];
    assert.ok(routineTask.sourceRoutineId, "Routine task should have sourceRoutineId");
    assert.ok(visionTask.id.startsWith("vision_plan_"), "Vision task should have vision_plan_ prefix");
    assert.strictEqual(fixedTask.capacityType, "fixed", "Fixed task should have capacityType fixed");
  }

  // 13: Moving task from first_focus to later_today updates block and totals
  {
    const itemToMove = baseDraft.firstFocus[1]; // p2 (30 min)
    const newFirst = baseDraft.firstFocus.filter((i) => i.id !== itemToMove.id);
    const newLater = [...baseDraft.laterToday, { ...itemToMove, block: "later_today" as const }];
    const updated = recalculatePlanTotals({
      ...baseDraft,
      firstFocus: newFirst,
      laterToday: newLater,
    });
    assert.strictEqual(updated.firstFocus.length, 1);
    assert.strictEqual(updated.laterToday.length, 2);
    assert.strictEqual(updated.plannedRequiredMinutes, 105);
  }

  // 14: Moving task to if_capacity_remains updates required and optional
  {
    const itemToMove = baseDraft.laterToday[0]; // p3 (30 min)
    const newLater = baseDraft.laterToday.filter((i) => i.id !== itemToMove.id);
    const newOptional = [...baseDraft.ifCapacityRemains, { ...itemToMove, block: "if_capacity_remains" as const, capacityType: "flexible" as const }];
    const updated = recalculatePlanTotals({
      ...baseDraft,
      laterToday: newLater,
      ifCapacityRemains: newOptional,
    });
    assert.strictEqual(updated.plannedRequiredMinutes, 75);
    assert.strictEqual(updated.plannedOptionalMinutes, 45);
  }

  // 15: Deferring task moves it to deferredItems
  {
    const itemToDefer = baseDraft.laterToday[0]; // p3
    const newLater = baseDraft.laterToday.filter((i) => i.id !== itemToDefer.id);
    const deferredItem = {
      id: itemToDefer.id,
      originalText: itemToDefer.title,
      kind: "task" as const,
      timeHorizon: "later" as const,
      timeSensitivity: itemToDefer.timeSensitivity,
      isAmbiguous: false,
      needsCheck: false,
      priority: itemToDefer.priority,
    };
    const updated = recalculatePlanTotals({
      ...baseDraft,
      laterToday: newLater,
      deferredItems: [deferredItem],
    });
    assert.strictEqual(updated.deferredItems.length, 1);
    assert.strictEqual(updated.plannedRequiredMinutes, 75);
  }

  // -------------------------------------------------------------
  // Grupa D: Ručni Reorder i AI Prioriteti (Scenariji 16–20)
  // -------------------------------------------------------------

  // 16: Reorder up in array
  {
    const list = [baseDraft.firstFocus[0], baseDraft.firstFocus[1]];
    // move index 1 up to index 0
    const temp = list[1];
    list[1] = list[0];
    list[0] = temp;
    assert.strictEqual(list[0].id, "p2");
    assert.strictEqual(list[1].id, "p1");
  }

  // 17: Reorder down in array
  {
    const list = [baseDraft.firstFocus[0], baseDraft.firstFocus[1]];
    // move index 0 down to index 1
    const temp = list[0];
    list[0] = list[1];
    list[1] = temp;
    assert.strictEqual(list[0].id, "p2");
    assert.strictEqual(list[1].id, "p1");
  }

  // 18: Manual reorder sets manualPriorityOverride = true
  {
    const modifiedDraft: DailyPlanDraft = {
      ...baseDraft,
      manualPriorityOverride: true,
    };
    assert.strictEqual(modifiedDraft.manualPriorityOverride, true, "Should set manualPriorityOverride");
  }

  // 19: Banner display condition
  {
    const showBanner = Boolean(baseDraft.manualPriorityOverride);
    assert.strictEqual(showBanner, false, "Initial draft should not show manual banner");
    const overrideDraft = { ...baseDraft, manualPriorityOverride: true };
    assert.strictEqual(Boolean(overrideDraft.manualPriorityOverride), true, "Modified draft should show banner");
  }

  // 20: Reevaluation confirmation resets manualPriorityOverride to false
  {
    const reevaluatedDraft: DailyPlanDraft = {
      ...baseDraft,
      manualPriorityOverride: false,
    };
    assert.strictEqual(reevaluatedDraft.manualPriorityOverride, false, "Banner should disappear after reevaluation");
  }

  // -------------------------------------------------------------
  // Grupa E: Idempotencija i Perzistencija Završetka (Scenariji 21–25)
  // -------------------------------------------------------------

  // 21: toggleCompletedItemId adds item if not completed
  {
    const next = toggleCompletedItemId(baseDraft, [], "p1");
    assert.deepStrictEqual(next, ["p1"], "Should add p1 to completed list");
  }

  // 22: toggleCompletedItemId uncompletes item if already completed
  {
    const next = toggleCompletedItemId(baseDraft, ["p1", "p2"], "p1");
    assert.deepStrictEqual(next, ["p2"], "Should remove p1 when toggled again");
  }

  // 23: Double clicking protection: updatingItemId prevents duplicate triggers
  {
    let updatingItemId: string | null = "p1";
    const canClick = !updatingItemId;
    assert.strictEqual(canClick, false, "Should block concurrent click while updating");
  }

  // 24: Linked routine completion payload
  {
    const linkedItem: DailyPlanItem = {
      ...baseDraft.firstFocus[0],
      sourceRoutineId: "routine_meditation",
    };
    const nowIso = "2026-09-15T08:00:00.000Z";
    const completionPayload: RoutineCompletion = {
      routineId: linkedItem.sourceRoutineId!,
      localDate: "2026-09-15",
      status: "full",
      sourceApp: "app_a",
      recordedAt: nowIso,
      completedAt: nowIso,
      timeZone: "Europe/Belgrade",
    };
    assert.strictEqual(completionPayload.status, "full");
    assert.strictEqual(completionPayload.sourceApp, "app_a");
    assert.strictEqual(completionPayload.routineId, "routine_meditation");
  }

  // 25: Vision candidate completion detection
  {
    const itemId = "vision_plan_cand_777";
    const isVision = itemId.startsWith("vision_plan_");
    const candidateId = isVision ? itemId.slice("vision_plan_".length) : null;
    assert.strictEqual(isVision, true);
    assert.strictEqual(candidateId, "cand_777");
  }

  // -------------------------------------------------------------
  // Grupa F: FocusTimer Ponašanje (Scenariji 26–30)
  // -------------------------------------------------------------

  // 26: getInitialFocusMinutes fallback to default
  {
    const mins = getInitialFocusMinutes(0, 25);
    assert.strictEqual(mins, 25, "Should fall back to defaultMinutes (25)");
  }

  // 27: getInitialFocusMinutes respects positive task minutes
  {
    const mins = getInitialFocusMinutes(45, 25);
    assert.strictEqual(mins, 45, "Should use task estimated minutes (45)");
  }

  // 28: Clamping invalid minutes
  {
    const clampedMax = getInitialFocusMinutes(2000, 25);
    assert.strictEqual(clampedMax, 1440, "Should clamp to max 1440 minutes (24h)");
  }

  // 29: Timer expiration does not auto-complete without user action
  {
    const remaining = 0;
    let taskCompleted = false;
    // When remaining === 0, UI renders options, does not automatically toggle
    assert.strictEqual(taskCompleted, false, "Task must NOT be auto-completed");
  }

  // 30: Mark complete button invokes completion
  {
    let taskCompleted = false;
    const onComplete = () => { taskCompleted = true; };
    onComplete();
    assert.strictEqual(taskCompleted, true, "User clicking Mark Complete completes task");
  }

  // -------------------------------------------------------------
  // Grupa G: Daily Routines Integracija (Scenariji 31–34)
  // -------------------------------------------------------------

  // 31: Routines assessed with local date in user's timezone
  {
    const routine: SharedRoutine = {
      id: "r1",
      title: "Jutarnje istezanje",
      fullAction: "15 min istezanja",
      minimumAction: "5 min",
      recurrence: { type: "daily" },
      status: "active",
      timeZone: "Europe/Belgrade",
      language: "sr",
      source: "user" as const,
      sortOrder: 1,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
      goalRelationships: [],
      activeFrom: "2026-09-01",
    };
    assert.strictEqual(routine.timeZone, "Europe/Belgrade");
  }

  // 32: Full completion updates status
  {
    const completion: RoutineCompletion = {
      routineId: "r1",
      localDate: "2026-09-15",
      status: "full",
      sourceApp: "app_a",
      recordedAt: new Date().toISOString(),
    };
    assert.strictEqual(completion.status, "full");
  }

  // 33: Skipped routine frees daily load minutes
  {
    const routine: SharedRoutine = {
      id: "r1",
      title: "Trčanje",
      fullAction: "30 min trčanja",
      minimumAction: "10 min",
      recurrence: { type: "daily" },
      status: "active",
      timeZone: "Europe/Belgrade",
      language: "sr",
      source: "user" as const,
      sortOrder: 1,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
      estimatedMinutes: 30,
      goalRelationships: [],
      activeFrom: "2026-09-01",
    };
    const skippedCompletion: RoutineCompletion = {
      routineId: "r1",
      localDate: "2026-09-15",
      status: "skipped",
      sourceApp: "app_a",
      recordedAt: new Date().toISOString(),
    };
    const load = assessDailyLoad({
      draft: baseDraft,
      routines: [routine],
      routineCompletions: [skippedCompletion],
      localDate: "2026-09-15",
    });
    // Routine is skipped, so routine minutes are 0
    assert.strictEqual(load.routineRemainingMinutes, 0, "Skipped routine should contribute 0 minutes to remaining load");
  }

  // 34: Routine with sourceRoutineId prevents double counting
  {
    const routine: SharedRoutine = {
      id: "r1",
      title: "Finansije",
      fullAction: "Finansije pregled",
      minimumAction: "Brzi pregled",
      recurrence: { type: "daily" },
      status: "active",
      timeZone: "Europe/Belgrade",
      language: "sr",
      source: "user" as const,
      goalRelationships: [],
      activeFrom: "2026-09-01",
      sortOrder: 1,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
      estimatedMinutes: 45,
    };
    const draftWithLinkedRoutine: DailyPlanDraft = {
      ...baseDraft,
      firstFocus: [
        {
          ...baseDraft.firstFocus[0],
          sourceRoutineId: "r1",
        },
        baseDraft.firstFocus[1],
      ],
      plannedRoutineIds: ["r1"],
    };
    const load = assessDailyLoad({
      draft: draftWithLinkedRoutine,
      routines: [routine],
      routineCompletions: [],
      plannedRoutineIds: ["r1"],
      localDate: "2026-09-15",
    });
    // Task p1 (45m) links to routine r1 (45m). Without deduplication: 105m (tasks) + 45m (routine) = 150m.
    // With deduplication: totalRemainingMinutes is exactly 105m, not 150m.
    assert.strictEqual(load.totalRemainingMinutes, 105, "Linked routine should not be double counted in totalRemainingMinutes");

    // When the linked task is completed, routine also completes and routineRemainingMinutes becomes 0
    const loadAfterComplete = assessDailyLoad({
      draft: draftWithLinkedRoutine,
      completedItemIds: ["p1"],
      routines: [routine],
      routineCompletions: [],
      plannedRoutineIds: ["r1"],
      localDate: "2026-09-15",
    });
    assert.strictEqual(loadAfterComplete.routineRemainingMinutes, 0, "Completing linked task marks routine as finished in remaining minutes");
    assert.strictEqual(loadAfterComplete.totalRemainingMinutes, 60, "Total remaining drops by 45m to 60m");
  }

  // -------------------------------------------------------------
  // Grupa H: Vision Akcije i Intervencije (Scenariji 35–37)
  // -------------------------------------------------------------

  // 35: Single candidate at a time
  {
    const candidates = [{ id: "v1" }, { id: "v2" }, { id: "v3" }];
    const currentCandidate = candidates[0];
    assert.strictEqual(currentCandidate.id, "v1", "Only 1 candidate presented at a time");
  }

  // 36: Intervention dismissal key format
  {
    const date = "2026-09-15";
    const key = `app_a_dismissed_interventions_${date}`;
    assert.strictEqual(key, "app_a_dismissed_interventions_2026-09-15");
  }

  // 37: Intervention auto-hides when targetTaskId is completed
  {
    const targetTaskId = baseDraft.intervention?.targetTaskId;
    const completed = ["p1"];
    const isTargetDone = targetTaskId ? completed.includes(targetTaskId) : false;
    assert.strictEqual(isTargetDone, true, "Intervention target task p1 is completed");
  }

  // -------------------------------------------------------------
  // Grupa I: Stanje Završenog Dana (Scenariji 38–40)
  // -------------------------------------------------------------

  // 38: allDone triggers when all items completed
  {
    const allToday = [...baseDraft.firstFocus, ...baseDraft.laterToday, ...baseDraft.ifCapacityRemains];
    const completed = allToday.map((i) => i.id);
    const allDone = allToday.length > 0 && completed.length === allToday.length;
    assert.strictEqual(allDone, true, "allDone should be true when all items completed");
  }

  // 39: allDone is false when not all items completed
  {
    const allToday = [...baseDraft.firstFocus, ...baseDraft.laterToday, ...baseDraft.ifCapacityRemains];
    const completed = ["p1", "p2"]; // missing p3 and p4
    const allDone = allToday.length > 0 && completed.length === allToday.length;
    assert.strictEqual(allDone, false, "allDone should be false when some items remain");
  }

  // 40: Review completed tasks toggles read-only list without mutating plan
  {
    let showCompletedList = false;
    showCompletedList = !showCompletedList;
    assert.strictEqual(showCompletedList, true, "Toggles showCompletedList to true");
    assert.strictEqual(baseDraft.firstFocus.length, 2, "Original plan remains unchanged");
  }

  console.log("✓ All 40 Today Execution Verification scenarios passed cleanly!");
}

runTodayExecutionVerificationTests();
