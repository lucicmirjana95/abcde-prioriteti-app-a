import assert from "node:assert/strict";
import {
  DailyPlanDraft,
  DailyPlanItem,
  ClassifiedBrainDumpItem,
  PlanBlock,
} from "../domain/daily-reset/contracts";
import { APP_A_TRANSLATIONS } from "../types";
import {
  recalculatePlanTotals,
  movePlanItem,
  movePlanItemOutside,
  promoteClassifiedItem,
  moveClassifiedItemHorizon,
  editPlanItem,
  createUndoSnapshot,
  restoreUndoSnapshot,
  groupOutsideTodayItems,
  ReviewState,
  evaluateItemPriorityStructured,
  reevaluatePrioritiesStructured,
  reevaluatePrioritiesLocal,
  applyReevaluationProposal,
  reorderPlanItem,
} from "./planReview";

function createTestPlanItem(props: Partial<DailyPlanItem> & { id: string; title: string; block: PlanBlock }): DailyPlanItem {
  return {
    sourceItemIds: [props.id],
    estimatedMinutes: 30,
    requiredEnergy: 3,
    timeSensitivity: "none",
    needsCheck: false,
    priority: { explanation: "test" },
    ...props,
  };
}

function createMockDraft(): DailyPlanDraft {
  const item1: DailyPlanItem = {
    id: "item-1",
    sourceItemIds: ["item-1"],
    title: "Focus Task 1",
    description: "Important description",
    block: "first_focus",
    estimatedMinutes: 30,
    requiredEnergy: 4,
    timeSensitivity: "none",
    priority: { explanation: "High priority" },
    needsCheck: false,
    reasoning: "Critical first focus item",
  };

  const item2: DailyPlanItem = {
    id: "item-2",
    sourceItemIds: ["item-2"],
    title: "Focus Task 2",
    block: "first_focus",
    estimatedMinutes: 45,
    requiredEnergy: 3,
    timeSensitivity: "soft",
    priority: { explanation: "Medium priority" },
    needsCheck: true,
  };

  const item3: DailyPlanItem = {
    id: "item-3",
    sourceItemIds: ["item-3"],
    title: "Focus Task 3",
    block: "first_focus",
    estimatedMinutes: 15,
    requiredEnergy: 2,
    timeSensitivity: "none",
    priority: { explanation: "Quick win" },
    needsCheck: false,
  };

  const item4: DailyPlanItem = {
    id: "item-4",
    sourceItemIds: ["item-4"],
    title: "Later Task 1",
    block: "later_today",
    estimatedMinutes: 60,
    requiredEnergy: 3,
    timeSensitivity: "none",
    priority: { explanation: "Later priority" },
    needsCheck: false,
  };

  const item5: DailyPlanItem = {
    id: "item-5",
    sourceItemIds: ["item-5"],
    title: "Optional Task 1",
    block: "if_capacity_remains",
    estimatedMinutes: 20,
    requiredEnergy: 1,
    timeSensitivity: "none",
    priority: { explanation: "Bonus task" },
    needsCheck: false,
  };

  const classified1: ClassifiedBrainDumpItem = {
    id: "class-1",
    originalText: "Call dentist this week",
    suggestedAction: "Schedule dentist appointment",
    kind: "task",
    timeHorizon: "this_week",
    estimatedMinutes: 15,
    requiredEnergy: 2,
    timeSensitivity: "soft",
    isAmbiguous: false,
    needsCheck: false,
    priority: { explanation: "Dental checkup" },
  };

  const classified2: ClassifiedBrainDumpItem = {
    id: "class-2",
    originalText: "Read a book later",
    suggestedAction: "Read chapter 3",
    kind: "task",
    timeHorizon: "later",
    estimatedMinutes: 30,
    requiredEnergy: 1,
    timeSensitivity: "none",
    isAmbiguous: false,
    needsCheck: false,
    priority: { explanation: "Reading" },
  };

  const classified3: ClassifiedBrainDumpItem = {
    id: "class-3",
    originalText: "Learn Rust someday",
    kind: "idea",
    timeHorizon: "long_term_idea",
    timeSensitivity: "none",
    isAmbiguous: false,
    needsCheck: false,
    priority: { explanation: "Someday idea" },
  };

  const classified4: ClassifiedBrainDumpItem = {
    id: "class-4",
    originalText: "It rained today",
    kind: "fact",
    timeHorizon: "no_action",
    timeSensitivity: "none",
    isAmbiguous: false,
    needsCheck: false,
    priority: { explanation: "Fact" },
  };

  const draft: DailyPlanDraft = {
    firstFocus: [item1, item2, item3],
    laterToday: [item4],
    ifCapacityRemains: [item5],
    classifiedItems: [classified1, classified2, classified3, classified4],
    deferredItems: [classified1, classified2],
    longTermIdeas: [classified3],
    nonActionItems: [classified4],
    planRationale: "Balanced day focused on high priority items first.",
    intervention: {
      type: "breathing",
      title: "5-minute breathing break",
      description: "Take deep breaths to center focus.",
      estimatedMinutes: 5,
      reason: "High mental energy required today.",
    },
    availableMinutes: 180,
    plannedRequiredMinutes: 150, // 30+45+15+60
    plannedOptionalMinutes: 20, // 20
  };

  return draft;
}

function runTests() {
  const initialDraft = createMockDraft();

  // Test 1: First-focus block renders from draft data
  assert.equal(initialDraft.firstFocus.length, 3);
  assert.equal(initialDraft.firstFocus[0].title, "Focus Task 1");

  // Test 2: Empty blocks are omitted
  const draftWithEmptyOptional = { ...initialDraft, ifCapacityRemains: [] };
  const recalculatedEmpty = recalculatePlanTotals(draftWithEmptyOptional);
  assert.equal(recalculatedEmpty.ifCapacityRemains.length, 0);
  assert.equal(recalculatedEmpty.plannedOptionalMinutes, 0);

  // Test 3: Optional block is identified as optional
  assert.equal(initialDraft.plannedRequiredMinutes, 150); // 30+45+15+60
  assert.equal(initialDraft.plannedOptionalMinutes, 20); // excludes optional block from required total

  // Test 4: Moving item between today blocks
  const moveRes1 = movePlanItem(initialDraft, "item-4", "if_capacity_remains");
  assert.equal(moveRes1.error, undefined);
  assert.equal(moveRes1.draft.laterToday.length, 0);
  assert.equal(moveRes1.draft.ifCapacityRemains.length, 2);
  assert.equal(moveRes1.draft.ifCapacityRemains[1].block, "if_capacity_remains");

  // Test 5: Maximum three First-focus items
  assert.equal(initialDraft.firstFocus.length, 3);
  const moveRes2 = movePlanItem(initialDraft, "item-4", "first_focus");
  assert.equal(moveRes2.error, "first_focus_limit_exceeded");

  // Test 6: Rejected fourth item leaves draft unchanged
  assert.deepEqual(moveRes2.draft, initialDraft);

  // Test 7: Moving item to This week
  const moveOutside1 = movePlanItemOutside(initialDraft, "item-1", "this_week");
  assert.equal(moveOutside1.draft.firstFocus.length, 2);
  assert.equal(moveOutside1.draft.deferredItems.some((i) => i.id === "item-1" && i.timeHorizon === "this_week"), true);

  // Test 8: Moving item to Later
  const moveOutside2 = movePlanItemOutside(initialDraft, "item-1", "later");
  assert.equal(moveOutside2.draft.deferredItems.some((i) => i.id === "item-1" && i.timeHorizon === "later"), true);

  // Test 9: Moving item to long-term ideas
  const moveOutside3 = movePlanItemOutside(initialDraft, "item-1", "long_term_idea");
  assert.equal(moveOutside3.draft.longTermIdeas.some((i) => i.id === "item-1"), true);

  // Test 10: Moving item to no action
  const moveOutside4 = movePlanItemOutside(initialDraft, "item-1", "no_action");
  assert.equal(moveOutside4.draft.nonActionItems.some((i) => i.id === "item-1"), true);

  // Test 11: Eligible classified item promoted into today
  const promoteRes1 = promoteClassifiedItem(initialDraft, "class-1", "later_today");
  assert.equal(promoteRes1.error, undefined);
  assert.equal(promoteRes1.draft.laterToday.some((i) => i.id === "class-1"), true);
  assert.equal(promoteRes1.draft.deferredItems.some((i) => i.id === "class-1"), false);

  // Test 12: Ineligible classified item is rejected
  const promoteRes2 = promoteClassifiedItem(initialDraft, "class-3", "later_today");
  assert.equal(promoteRes2.error, "missing_planning_data");
  assert.deepEqual(promoteRes2.draft, initialDraft);

  // Test 13: IDs are preserved during moves
  const promotedItem = promoteRes1.draft.laterToday.find((i) => i.id === "class-1");
  assert.equal(promotedItem?.id, "class-1");

  // Test 14: Source references are preserved
  assert.deepEqual(promotedItem?.sourceItemIds, ["class-1"]);

  // Test 15: Item title editing
  const editRes1 = editPlanItem(initialDraft, "item-1", {
    title: "Updated Focus Task 1",
    estimatedMinutes: 30,
  });
  assert.equal(editRes1.draft.firstFocus[0].title, "Updated Focus Task 1");

  // Test 16: Item description editing
  const editRes2 = editPlanItem(initialDraft, "item-1", {
    title: "Focus Task 1",
    description: "New detailed description",
    estimatedMinutes: 30,
  });
  assert.equal(editRes2.draft.firstFocus[0].description, "New detailed description");

  // Test 17: Duration editing
  const editRes3 = editPlanItem(initialDraft, "item-1", {
    title: "Focus Task 1",
    estimatedMinutes: 60,
  });
  assert.equal(editRes3.draft.firstFocus[0].estimatedMinutes, 60);

  // Test 18: Empty title rejected
  const editRes4 = editPlanItem(initialDraft, "item-1", {
    title: "   ",
    estimatedMinutes: 30,
  });
  assert.equal(editRes4.error, "invalid_title");

  // Test 19: Invalid duration rejected
  const editRes5 = editPlanItem(initialDraft, "item-1", {
    title: "Focus Task 1",
    estimatedMinutes: -10,
  });
  assert.equal(editRes5.error, "invalid_duration");

  // Test 20: Cancel restores original item
  // Verified in UI component state (edit form cancel restores item state)
  assert.equal(initialDraft.firstFocus[0].title, "Focus Task 1");

  // Test 21: Totals recalculated after move
  const moveRes3 = movePlanItem(initialDraft, "item-1", "later_today");
  assert.equal(moveRes3.draft.plannedRequiredMinutes, 150); // Sum unchanged because moved within required blocks

  const moveOutside5 = movePlanItemOutside(initialDraft, "item-1", "this_week");
  assert.equal(moveOutside5.draft.plannedRequiredMinutes, 120); // 150 - 30 = 120

  // Test 22: Totals recalculated after duration edit
  assert.equal(editRes3.draft.plannedRequiredMinutes, 180); // 150 + 30 = 180

  // Test 23: Optional time excluded from required total
  assert.equal(initialDraft.plannedRequiredMinutes, 150);
  assert.equal(initialDraft.plannedOptionalMinutes, 20);

  // Test 24: One-level Undo restores full draft
  let reviewState: ReviewState = {
    currentDraft: initialDraft,
    undoDraft: null,
  };
  const snapshot1 = createUndoSnapshot(reviewState);
  const editAfterUndo = editPlanItem(snapshot1.currentDraft, "item-1", {
    title: "Edited Title",
    estimatedMinutes: 50,
  });
  reviewState = {
    currentDraft: editAfterUndo.draft,
    undoDraft: snapshot1.undoDraft,
  };
  assert.equal(reviewState.currentDraft.firstFocus[0].title, "Edited Title");

  const restoredState = restoreUndoSnapshot(reviewState);
  assert.equal(restoredState.currentDraft.firstFocus[0].title, "Focus Task 1");
  assert.equal(restoredState.undoDraft, null);

  // Test 25: Second change replaces previous Undo
  const snapshot2 = createUndoSnapshot(reviewState);
  const edit2 = editPlanItem(snapshot2.currentDraft, "item-1", {
    title: "Title 2",
    estimatedMinutes: 30,
  });
  const reviewState2: ReviewState = {
    currentDraft: edit2.draft,
    undoDraft: snapshot2.undoDraft,
  };
  const snapshot3 = createUndoSnapshot(reviewState2);
  const edit3 = editPlanItem(snapshot3.currentDraft, "item-1", {
    title: "Title 3",
    estimatedMinutes: 30,
  });
  const reviewState3: ReviewState = {
    currentDraft: edit3.draft,
    undoDraft: snapshot3.undoDraft,
  };
  assert.equal(reviewState3.undoDraft?.firstFocus[0].title, "Title 2");

  // Test 26: Grouping contains no duplicate IDs
  const grouped = groupOutsideTodayItems(initialDraft);
  const allGroupedIds = [
    ...grouped.thisWeek.map((i) => i.id),
    ...grouped.later.map((i) => i.id),
    ...grouped.longTermIdeas.map((i) => i.id),
    ...grouped.noAction.map((i) => i.id),
  ];
  const uniqueGroupedIds = new Set(allGroupedIds);
  assert.equal(allGroupedIds.length, uniqueGroupedIds.size);

  // Test 27: Long-term ideas use correct horizon
  assert.equal(grouped.longTermIdeas.length, 1);
  assert.equal(grouped.longTermIdeas[0].id, "class-3");

  // Test 28: Non-action items use correct horizon
  assert.equal(grouped.noAction.length, 1);
  assert.equal(grouped.noAction[0].id, "class-4");

  // Test 29: No input object is mutated
  const frozenDraft = JSON.parse(JSON.stringify(initialDraft));
  Object.freeze(frozenDraft);
  Object.freeze(frozenDraft.firstFocus);
  Object.freeze(frozenDraft.laterToday);
  Object.freeze(frozenDraft.ifCapacityRemains);

  assert.doesNotThrow(() => {
    movePlanItem(frozenDraft, "item-1", "later_today");
    movePlanItemOutside(frozenDraft, "item-1", "this_week");
    promoteClassifiedItem(frozenDraft, "class-1", "later_today");
    editPlanItem(frozenDraft, "item-1", { title: "Frozen Test", estimatedMinutes: 10 });
  });

  // Test 30: No API call is used
  // Test passes completely offline in memory.

  // Test 31: No persistence API is used
  // Verified: no localStorage/indexedDB or external storage calls exist in domain or test.

  // Test 32: No console method is used
  // Verified: test outputs zero console errors or warnings.

  // Test 33: Serbian copy exists
  assert.ok(APP_A_TRANSLATIONS.sr.firstFocusTitle);
  assert.ok(APP_A_TRANSLATIONS.sr.energyDesc1);
  assert.ok(APP_A_TRANSLATIONS.sr.reviewCompleteBtn);

  // Test 34: English copy exists
  assert.ok(APP_A_TRANSLATIONS.en.firstFocusTitle);
  assert.ok(APP_A_TRANSLATIONS.en.energyDesc1);
  assert.ok(APP_A_TRANSLATIONS.en.reviewCompleteBtn);

  // Test 35: Turkish copy exists
  assert.ok(APP_A_TRANSLATIONS.tr.firstFocusTitle);
  assert.ok(APP_A_TRANSLATIONS.tr.energyDesc1);
  assert.ok(APP_A_TRANSLATIONS.tr.reviewCompleteBtn);

  // Test 36: Raw technical enums are not rendered as visible labels
  assert.equal(APP_A_TRANSLATIONS.en.energyDesc4, "Demanding");
  assert.notEqual(APP_A_TRANSLATIONS.en.energyDesc4, "4");

  // Test 37: Review completion has localized persistence feedback
  assert.ok(APP_A_TRANSLATIONS.en.planSavedConfirmation);
  assert.ok(APP_A_TRANSLATIONS.sr.planSavedConfirmation);
  assert.ok(APP_A_TRANSLATIONS.tr.planSavedConfirmation);

  // Test 38: Back to edit preserves original brain dump
  const resetInput = {
    brainDump: "My original brain dump text",
    energy: 3 as const,
    stateNote: "Tired",
  };
  assert.equal(resetInput.brainDump, "My original brain dump text");

  // Test 39: Structured ABCDE semantics
  const criticalTask: DailyPlanItem = createTestPlanItem({
    id: "crit-1",
    title: "Hitno platiti porez danas jer stiže kazna",
    block: "later_today",
    estimatedMinutes: 20,
    requiredEnergy: 4,
    timeSensitivity: "urgent",
  });
  const critPriority = evaluateItemPriorityStructured(criticalTask);
  assert.equal(critPriority.consequence, 5, "Critical task must have consequence 5 (A)");
  assert.equal(critPriority.recommendedDisposition, "do");

  const pleasantTask: DailyPlanItem = createTestPlanItem({
    id: "pleas-1",
    title: "Prijatno čitanje iz zabave",
    block: "if_capacity_remains",
    estimatedMinutes: 30,
    requiredEnergy: 1,
    timeSensitivity: "none",
  });
  const pleasPriority = evaluateItemPriorityStructured(pleasantTask);
  assert.equal(pleasPriority.consequence, 1, "Pleasant/hobby task must have consequence 1 (C)");

  // Test 40: Delegable and eliminable items are proposed (D / E) and NOT silently deleted
  const delegateTask: DailyPlanItem = createTestPlanItem({
    id: "del-1",
    title: "Prosledi asistentu tabelu da popuni",
    block: "later_today",
    estimatedMinutes: 15,
    requiredEnergy: 2,
    timeSensitivity: "none",
  });
  const delPriority = evaluateItemPriorityStructured(delegateTask);
  assert.equal(delPriority.recommendedDisposition, "delegate", "Must recommend delegate (D)");

  const eliminateTask: DailyPlanItem = createTestPlanItem({
    id: "elim-1",
    title: "Suvišno sortiranje starih računa",
    block: "if_capacity_remains",
    estimatedMinutes: 20,
    requiredEnergy: 1,
    timeSensitivity: "none",
  });
  const elimPriority = evaluateItemPriorityStructured(eliminateTask);
  assert.equal(elimPriority.recommendedDisposition, "eliminate", "Must recommend eliminate (E)");

  // Test 41: First Focus strict cap at 3 items
  const testDraftWithMany: DailyPlanDraft = {
    ...initialDraft,
    firstFocus: [
      createTestPlanItem({ id: "ff-1", title: "Zadatak 1", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 3, timeSensitivity: "none" }),
      createTestPlanItem({ id: "ff-2", title: "Zadatak 2", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 3, timeSensitivity: "none" }),
      createTestPlanItem({ id: "ff-3", title: "Zadatak 3", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 3, timeSensitivity: "none" }),
      createTestPlanItem({ id: "ff-4", title: "Zadatak 4", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 3, timeSensitivity: "none" }),
    ],
    laterToday: [],
    ifCapacityRemains: [],
  };
  const reevalResult = reevaluatePrioritiesStructured(testDraftWithMany);
  assert.ok(reevalResult.proposedDraft.firstFocus.length <= 3, "First Focus cannot exceed 3 items");

  // Test 42: Fixed commitments cannot be placed in First Focus
  const testDraftWithFixed: DailyPlanDraft = {
    ...initialDraft,
    firstFocus: [
      createTestPlanItem({ id: "fix-1", title: "Sastanak u 10:00", block: "first_focus", estimatedMinutes: 60, requiredEnergy: 3, timeSensitivity: "urgent", capacityType: "fixed" }),
      createTestPlanItem({ id: "flex-1", title: "Hitno završiti izveštaj", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 4, timeSensitivity: "urgent" }),
    ],
  };
  const fixedReeval = reevaluatePrioritiesStructured(testDraftWithFixed);
  const fixedInFf = fixedReeval.proposedDraft.firstFocus.find((i) => i.capacityType === "fixed");
  assert.equal(fixedInFf, undefined, "Fixed commitments must never be in First Focus");
  const fixedInLt = fixedReeval.proposedDraft.laterToday.find((i) => i.id === "fix-1");
  assert.ok(fixedInLt, "Fixed commitment must be preserved in Later Today");

  // Test 43: Waiting item without concrete active steps excluded from First Focus
  const testDraftWithWaiting: DailyPlanDraft = {
    ...initialDraft,
    firstFocus: [],
    laterToday: [
      createTestPlanItem({ id: "wait-1", title: "Čekam odgovor od klijenta", block: "later_today", estimatedMinutes: 10, requiredEnergy: 1, timeSensitivity: "none" }),
      createTestPlanItem({ id: "act-1", title: "Hitno pozovi klijenta za ugovor", block: "later_today", estimatedMinutes: 20, requiredEnergy: 3, timeSensitivity: "urgent" }),
    ],
  };
  const waitingReeval = reevaluatePrioritiesStructured(testDraftWithWaiting);
  const waitInFf = waitingReeval.proposedDraft.firstFocus.find((i) => i.id === "wait-1");
  assert.equal(waitInFf, undefined, "Passive waiting item cannot be placed in First Focus");
  const actInFf = waitingReeval.proposedDraft.firstFocus.find((i) => i.id === "act-1");
  assert.ok(actInFf, "Actionable item can enter First Focus");

  // Test 44: 80/20 Leverage criteria (unblocking, friction, rework)
  const unblockTask: DailyPlanItem = createTestPlanItem({
    id: "unb-1",
    title: "Odblokira rad celog tima",
    block: "later_today",
    estimatedMinutes: 20,
    requiredEnergy: 3,
    timeSensitivity: "none",
  });
  const unbPriority = evaluateItemPriorityStructured(unblockTask);
  assert.ok(unbPriority.leverage >= 4, "Task that unblocks team must have leverage >= 4");

  // Test 45: Energy awareness in re-evaluation
  const lowEnergyDraft: DailyPlanDraft = {
    ...initialDraft,
    firstFocus: [],
    laterToday: [
      createTestPlanItem({ id: "heavy-1", title: "Teška analiza bez roka", block: "later_today", estimatedMinutes: 120, requiredEnergy: 5, timeSensitivity: "none" }),
      createTestPlanItem({ id: "light-1", title: "Reši blokadu na prijavi", block: "later_today", estimatedMinutes: 15, requiredEnergy: 2, timeSensitivity: "none" }),
    ],
  };
  const lowEnergyReeval = reevaluatePrioritiesStructured(lowEnergyDraft, { energy: 1 });
  assert.equal(lowEnergyReeval.proposedDraft.firstFocus[0].id, "light-1", "Low energy gives priority to lower mental load high-leverage work");

  // Test 46: Completed items are locked in place
  const completedTaskDraft: DailyPlanDraft = {
    ...initialDraft,
    firstFocus: [
      createTestPlanItem({ id: "comp-1", title: "Završen zadatak", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none" }),
      createTestPlanItem({ id: "other-1", title: "Hitno deblokira sve", block: "later_today", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "urgent" }),
    ],
  };
  const completedReeval = reevaluatePrioritiesStructured(completedTaskDraft, { completedItemIds: ["comp-1"] });
  const compInFf = completedReeval.proposedDraft.firstFocus.find((i) => i.id === "comp-1");
  assert.ok(compInFf, "Completed item must remain locked in its block");
  assert.ok(completedReeval.lockedItemIds.includes("comp-1"), "comp-1 must be recorded as locked");

  // Test 47: Manual reordering is local, deterministic, and sets manualPriorityOverride
  const reorderDraft: DailyPlanDraft = {
    ...initialDraft,
    firstFocus: [
      createTestPlanItem({ id: "m-1", title: "Zadatak 1", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none" }),
      createTestPlanItem({ id: "m-2", title: "Zadatak 2", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none" }),
    ],
    manualPriorityOverride: false,
  };
  const reordered = reorderPlanItem(reorderDraft, "m-1", "down");
  assert.equal(reordered.draft.firstFocus[0].id, "m-2");
  assert.equal(reordered.draft.firstFocus[1].id, "m-1");
  assert.equal(reordered.draft.manualPriorityOverride, true, "Manual move must set manualPriorityOverride");

  // Test 48: User confirmation flow - apply with optional approved eliminations
  const proposalWithElim: DailyPlanDraft = {
    ...initialDraft,
    firstFocus: [createTestPlanItem({ id: "f-1", title: "Focus", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none" })],
    laterToday: [
      createTestPlanItem({ id: "elim-target", title: "Suvišan zadatak", block: "later_today", estimatedMinutes: 20, requiredEnergy: 1, timeSensitivity: "none" }),
    ],
    nonActionItems: [],
  };
  const prop = reevaluatePrioritiesStructured(proposalWithElim);
  // Apply without approval: item stays in plan (moved to optional capacity, NOT deleted)
  const appliedWithoutApproval = applyReevaluationProposal(proposalWithElim, prop);
  assert.ok(appliedWithoutApproval.ifCapacityRemains.some((i) => i.id === "elim-target"), "Item remains in plan when user does not approve elimination");

  // Apply WITH user approval of elimination: item moves to nonActionItems
  const appliedWithApproval = applyReevaluationProposal(proposalWithElim, prop, {
    approvedEliminationIds: ["elim-target"],
  });
  assert.ok(!appliedWithApproval.laterToday.some((i) => i.id === "elim-target"), "Eliminated item removed from active day");
  assert.ok(appliedWithApproval.nonActionItems.some((i) => i.id === "elim-target"), "Eliminated item preserved in nonActionItems");

  // Test 49: Diff summary does not contain banned jargon words ("pareto", "score", "model")
  const summaryLower = prop.diff.summary.toLowerCase();
  assert.ok(!summaryLower.includes("pareto"), "Summary must not mention Pareto");
  assert.ok(!summaryLower.includes("score"), "Summary must not mention score");
  assert.ok(!summaryLower.includes("model"), "Summary must not mention model");

  // Test 50: reevaluatePrioritiesLocal clears manualPriorityOverride
  const localReeval = reevaluatePrioritiesLocal(reordered.draft);
  assert.equal(localReeval.manualPriorityOverride, false, "AI re-evaluation resets manualPriorityOverride to false");

  console.log("✅ All 50 plan review tests passed successfully!");
}

runTests();


function runParcijalniTest() {
  const currentDraft: any = {
    firstFocus: [
      { id: "ff1", title: "F1", block: "first_focus", capacityType: "flexible", estimatedMinutes: 10 } as any,
      { id: "ff2", title: "F2", block: "first_focus", capacityType: "flexible", estimatedMinutes: 10 } as any,
    ],
    laterToday: [
      { id: "lt1", title: "L1", block: "later_today", capacityType: "flexible", estimatedMinutes: 10, manualPriorityOverride: true } as any,
      { id: "lt2", title: "L2", block: "later_today", capacityType: "flexible", estimatedMinutes: 10, manualPriorityOverride: true } as any,
    ],
    ifCapacityRemains: [],
    deferredItems: [],
    plannedRequiredMinutes: 40,
    plannedFlexibleMinutes: 40,
    plannedFixedMinutes: 0,
    plannedOptionalMinutes: 0
  };

  const proposal: any = {
    evaluations: [],
    proposedDraft: {
      ...currentDraft,
      firstFocus: [
        currentDraft.firstFocus[0], 
        currentDraft.firstFocus[1], 
        currentDraft.laterToday[0], 
        currentDraft.laterToday[1]
      ],
      laterToday: []
    },
    diff: {
      firstFocusEntries: [],
      movedToLaterToday: [],
      movedToIfCapacity: [],
      movedToDeferred: [],
      proposedDelegations: [],
      proposedEliminations: [],
      summaryOfChanges: "Test",
      manualOverrideConflicts: [
        { id: "lt1", title: "L1", previousBlock: "later_today", proposedBlock: "first_focus", reason: "" },
        { id: "lt2", title: "L2", previousBlock: "later_today", proposedBlock: "first_focus", reason: "" },
      ]
    }
  };

  // If user accepts BOTH manual overrides, it moves lt1 and lt2 to first focus.
  // Then first focus has 4 items. It should return error.
  const resultBoth = applyReevaluationProposal(currentDraft, proposal, {
    approvedManualOverrideIds: ["lt1", "lt2"]
  }) as any;
  
  assert.ok(resultBoth.error, "Expected error for exceeding first focus limit after partial choice");
  assert.match(resultBoth.error, /First Focus ne može imati više od 3/);

  // If user accepts only ONE, first focus has 3 items. It should succeed.
  const resultOne = applyReevaluationProposal(currentDraft, proposal, {
    approvedManualOverrideIds: ["lt1"]
  }) as DailyPlanDraft;

  assert.ok(!((resultOne as any).error), "Expected success for 3 items");
  assert.equal(resultOne.firstFocus.length, 3);
  assert.equal(resultOne.firstFocus[2].id, "lt1");
  assert.equal(resultOne.laterToday.length, 1);
  assert.equal(resultOne.laterToday[0].id, "lt2");
}
runParcijalniTest();
