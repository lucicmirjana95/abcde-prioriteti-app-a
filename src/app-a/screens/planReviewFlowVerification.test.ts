import assert from "assert";
import { DailyPlanDraft, DailyPlanItem } from "../domain/daily-reset/contracts";
import { validatePlanDraft, recalculatePlanTotals } from "../domain/daily-reset/validation";

function testPlanReviewFlow() {
  console.log("Running Plan Review Flow Verification Tests...");

  const baseDraft: DailyPlanDraft = {
    planRationale: "Jutarnji fokus na ključne obaveze, popodne fleksibilno.",
    availableMinutes: 180,
    plannedRequiredMinutes: 105,
    plannedFlexibleMinutes: 105,
    plannedFixedMinutes: 0,
    plannedOptionalMinutes: 15,
    classifiedItems: [
      { id: "c1", originalText: "Finansijski izveštaj", kind: "task", timeHorizon: "today", timeSensitivity: "urgent", isAmbiguous: false, needsCheck: false, priority: { explanation: "Hitno" } },
      { id: "c2", originalText: "Kupovina namirnica", kind: "task", timeHorizon: "today", timeSensitivity: "soft", isAmbiguous: false, needsCheck: false, priority: { explanation: "Porodica" } },
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
        needsCheck: false,
        priority: { explanation: "Hitno" },
      },
      {
        id: "p2",
        sourceItemIds: ["c2"],
        title: "Kupovina namirnica",
        block: "first_focus",
        estimatedMinutes: 30,
        requiredEnergy: 2,
        timeSensitivity: "soft",
        needsCheck: false,
        priority: { explanation: "Porodica" },
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
        needsCheck: false,
        priority: { explanation: "Rutina" },
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
        needsCheck: false,
        priority: { explanation: "Opciono" },
      },
    ],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
  };

  // Test 1: Valid draft passes validation
  {
    const res = validatePlanDraft(baseDraft);
    assert.strictEqual(res.valid, true, `Expected baseDraft to be valid, got: ${res.errors.join(", ")}`);
  }

  // Test 2: Maximum 3 First Focus items rule
  {
    const invalidDraft: DailyPlanDraft = {
      ...baseDraft,
      firstFocus: [
        ...baseDraft.firstFocus,
        { id: "p5", title: "Task 3", block: "first_focus", estimatedMinutes: 10, requiredEnergy: 2, timeSensitivity: "none", needsCheck: false, sourceItemIds: ["c1"], priority: { explanation: "Test" } },
        { id: "p6", title: "Task 4", block: "first_focus", estimatedMinutes: 10, requiredEnergy: 2, timeSensitivity: "none", needsCheck: false, sourceItemIds: ["c2"], priority: { explanation: "Test" } },
      ],
    };
    const res = validatePlanDraft(invalidDraft);
    assert.strictEqual(res.valid, false, "Should reject firstFocus with more than 3 items");
    assert.ok(res.errors.some((e) => e.includes("3")), "Should have error message about max 3 items");
  }

  // Test 3: Moving item from Later Today to First Focus (recalculatePlanTotals & validate)
  {
    const itemToMove = baseDraft.laterToday[0];
    const updatedLater = baseDraft.laterToday.filter((i) => i.id !== itemToMove.id);
    const updatedFirst: DailyPlanItem[] = [
      ...baseDraft.firstFocus,
      { ...itemToMove, block: "first_focus" as const },
    ];
    const modifiedDraft: DailyPlanDraft = {
      ...baseDraft,
      firstFocus: updatedFirst,
      laterToday: updatedLater,
    };
    const recalculated = recalculatePlanTotals(modifiedDraft);
    assert.strictEqual(recalculated.firstFocus.length, 3, "First focus should now have 3 items");
    assert.strictEqual(recalculated.laterToday.length, 0, "Later today should now have 0 items");
    assert.strictEqual(recalculated.plannedRequiredMinutes, 105, "Required minutes should stay 105");
    const val = validatePlanDraft(recalculated);
    assert.strictEqual(val.valid, true, `Expected recalculated moved draft to be valid, got: ${val.errors.join(", ")}`);
  }

  // Test 4: Moving item to Optional (If Capacity Remains) updates totals properly
  {
    const itemToDemote = baseDraft.laterToday[0];
    const updatedLater = baseDraft.laterToday.filter((i) => i.id !== itemToDemote.id);
    const updatedOptional: DailyPlanItem[] = [
      ...baseDraft.ifCapacityRemains,
      { ...itemToDemote, block: "if_capacity_remains" as const },
    ];
    const modifiedDraft: DailyPlanDraft = {
      ...baseDraft,
      laterToday: updatedLater,
      ifCapacityRemains: updatedOptional,
    };
    const recalculated = recalculatePlanTotals(modifiedDraft);
    assert.strictEqual(recalculated.plannedRequiredMinutes, 75, "Required minutes should decrease to 75");
    assert.strictEqual(recalculated.plannedOptionalMinutes, 45, "Optional minutes should increase to 45 (15+30)");
    const val = validatePlanDraft(recalculated);
    assert.strictEqual(val.valid, true, "Should validate successfully after recalculating totals");
  }

  // Test 5: Reordering items within firstFocus preserves validity
  {
    const reorderedFirst = [baseDraft.firstFocus[1], baseDraft.firstFocus[0]];
    const reorderedDraft: DailyPlanDraft = {
      ...baseDraft,
      firstFocus: reorderedFirst,
    };
    const val = validatePlanDraft(reorderedDraft);
    assert.strictEqual(val.valid, true, "Reordered items should remain valid");
    assert.strictEqual(reorderedDraft.firstFocus[0].id, "p2");
    assert.strictEqual(reorderedDraft.firstFocus[1].id, "p1");
  }

  // Test 6: Mismatched block attribute inside block array is rejected
  {
    const corruptedDraft: DailyPlanDraft = {
      ...baseDraft,
      firstFocus: [
        { ...baseDraft.firstFocus[0], block: "later_today" as any },
        baseDraft.firstFocus[1],
      ],
    };
    const val = validatePlanDraft(corruptedDraft);
    assert.strictEqual(val.valid, false, "Should reject item whose block does not match its array");
  }

  // Test 7: Exceeding availableMinutes triggers capacity error
  {
    const overloadedDraft: DailyPlanDraft = {
      ...baseDraft,
      availableMinutes: 60, // planned flexible is 105m > 60m
    };
    const val = validatePlanDraft(overloadedDraft);
    assert.strictEqual(val.valid, false, "Should reject plan exceeding available capacity");
    assert.ok(val.errors.some((e) => e.includes("capacity") || e.includes("exceeds")), "Should flag capacity error");
  }

  console.log("✓ All Plan Review Flow Verification Tests passed successfully.");
}

testPlanReviewFlow();
