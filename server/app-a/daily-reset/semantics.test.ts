import { parseReevaluateModelResponse } from "./parseReevaluateResponse";
import assert from "assert";

const baseContext: any = {
  unfinishedFlexibleItems: [
    { id: "task1", block: "later_today", title: "T1", capacityType: "flexible" },
    { id: "task2", block: "later_today", title: "T2", capacityType: "flexible" },
    { id: "task3", block: "first_focus", title: "T3", capacityType: "flexible" },
    { id: "task4", block: "later_today", title: "T4", capacityType: "flexible", manualPriorityOverride: true },
    { id: "wait1", block: "later_today", title: "W1", capacityType: "flexible", itemStatusState: "waiting_for" },
    { id: "dep1", block: "later_today", title: "D1", capacityType: "flexible", dependsOnItemIds: ["task1"] },
  ],
  completedItems: [
    { id: "comp1", block: "later_today", title: "C1", capacityType: "flexible" }
  ],
  fixedItems: [
    { id: "fixed1", block: "later_today", title: "F1", capacityType: "fixed" }
  ],
  draft: {
    firstFocus: [{ id: "task3" }],
    laterToday: [{ id: "task1" }, { id: "task2" }, { id: "task4" }, { id: "wait1" }, { id: "dep1" }],
    ifCapacityRemains: [],
    deferredItems: []
  },
  availableMinutes: 60
};

function check(raw: any, expectedCode: string, expectedReason: string) {
  const result = parseReevaluateModelResponse(raw, baseContext);
  assert.equal(result.success, false, "Expected failure for " + expectedReason + ", but succeeded");
  if (!result.success) {
    if (result.rejectionReason !== expectedReason) {
       throw new Error("Expected rejectionReason '" + expectedReason + "', got '" + result.rejectionReason + "'");
    }
  }
}

// 1. Unknown ID
check({
  evaluations: [{ confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "unknown1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" }],
  plan: { firstFocusItemIds: ["unknown1"], laterTodayItemIds: [], ifCapacityRemainsItemIds: [], deferredItemIds: [], summaryOfChanges: "x" }
}, "semantic_violation", "unknown_id");

// 2. Duplicate ID
check({
  evaluations: [{ confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" }],
  plan: { firstFocusItemIds: ["task1", "task1"], laterTodayItemIds: [], ifCapacityRemainsItemIds: [], deferredItemIds: [], summaryOfChanges: "x" }
}, "semantic_violation", "duplicate_id");

// 3. Missing Item
check({
  evaluations: [{ confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" }],
  plan: { firstFocusItemIds: ["task1"], laterTodayItemIds: [], ifCapacityRemainsItemIds: [], deferredItemIds: [], summaryOfChanges: "x" }
}, "missing_item_evaluation", "missing_item_evaluation"); 

// 4. >3 First Focus
check({
  evaluations: [
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task2", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task3", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task4", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus", conflictsWithManualOverride: true },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "wait1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "dep1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
  ],
  plan: { 
    firstFocusItemIds: ["task1", "task2", "task3", "task4"], 
    laterTodayItemIds: ["wait1", "dep1"], 
    ifCapacityRemainsItemIds: [], 
    deferredItemIds: [], 
    summaryOfChanges: "x" 
  }
}, "first_focus_cap_exceeded", "first_focus_cap_exceeded");

// 5. Fixed mutation
check({
  evaluations: [
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "fixed1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task2", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task3", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task4", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus", conflictsWithManualOverride: true },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "wait1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "dep1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
  ],
  plan: { 
    firstFocusItemIds: ["task1"], 
    laterTodayItemIds: ["task2", "task3", "task4", "wait1", "dep1", "fixed1"], 
    ifCapacityRemainsItemIds: [], 
    deferredItemIds: [], 
    summaryOfChanges: "x" 
  }
}, "semantic_violation", "fixed_mutation");

// 6. Completed mutation
check({
  evaluations: [
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "comp1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task2", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task3", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task4", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus", conflictsWithManualOverride: true },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "wait1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "dep1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
  ],
  plan: { 
    firstFocusItemIds: ["task1"], 
    laterTodayItemIds: ["task2", "task3", "task4", "wait1", "dep1", "comp1"], 
    ifCapacityRemainsItemIds: [], 
    deferredItemIds: [], 
    summaryOfChanges: "x" 
  }
}, "semantic_violation", "completed_mutation");

// 7. waiting_for in first focus
check({
  evaluations: [
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "wait1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task2", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task3", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task4", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today", conflictsWithManualOverride: true },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "dep1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
  ],
  plan: { 
    firstFocusItemIds: ["wait1"], 
    laterTodayItemIds: ["task1", "task2", "task3", "task4", "dep1"], 
    ifCapacityRemainsItemIds: [], 
    deferredItemIds: [], 
    summaryOfChanges: "x" 
  }
}, "waiting_for_in_first_focus", "waiting_for_in_first_focus");

// 8. dependency violation
check({
  evaluations: [
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "dep1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task2", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task3", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task4", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today", conflictsWithManualOverride: true },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "wait1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
  ],
  plan: { 
    firstFocusItemIds: ["dep1"], 
    laterTodayItemIds: ["task1", "task2", "task3", "task4", "wait1"], 
    ifCapacityRemainsItemIds: [], 
    deferredItemIds: [], 
    summaryOfChanges: "x" 
  }
}, "dependency_violation", "dependency_violation");

// 9. capacity violation (simulated via invented estimatedMinutes since it rejects that first now)
check({
  evaluations: [
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus", estimatedMinutes: 100 },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task2", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task3", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task4", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today", conflictsWithManualOverride: true },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "wait1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "dep1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
  ],
  plan: { 
    firstFocusItemIds: ["task1"], 
    laterTodayItemIds: ["task2", "task3", "task4", "wait1", "dep1"], 
    ifCapacityRemainsItemIds: [], 
    deferredItemIds: [], 
    summaryOfChanges: "x" 
  }
}, "semantic_violation", "invented_field");

// 10. unconfirmed delegate/eliminate
check({
  evaluations: [
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "eliminate" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task2", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task3", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task4", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today", conflictsWithManualOverride: true },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "wait1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "dep1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
  ],
  plan: { 
    firstFocusItemIds: [], 
    laterTodayItemIds: ["task2", "task3", "task4", "wait1", "dep1"], 
    ifCapacityRemainsItemIds: [], 
    deferredItemIds: [], 
    summaryOfChanges: "x" 
  }
}, "semantic_violation", "unconfirmed_delegate_eliminate");

// 11. unmarked manual conflict
check({
  evaluations: [
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task4", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "first_focus" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task2", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "task3", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "wait1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
    { confidence: "high", consequence: 1, urgency: 1, goalContribution: 1, leverage: 1, mentalLoad: 1, dependencyPressure: 1, sourceItemId: "dep1", conciseExplanation: "X", recommendedDisposition: "do", proposedBlock: "later_today" },
  ],
  plan: { 
    firstFocusItemIds: ["task4"], 
    laterTodayItemIds: ["task1", "task2", "task3", "wait1", "dep1"], 
    ifCapacityRemainsItemIds: [], 
    deferredItemIds: [], 
    summaryOfChanges: "x" 
  }
}, "semantic_violation", "unmarked_manual_conflict");

console.log("✅ All server semantic tests passed successfully!");
