const fs = require('fs');
let code = fs.readFileSync('src/app-a/screens/planReview.test.ts', 'utf-8');

const tests = `
test("Parcijalni izbor override konflikta - invalid", () => {
  const currentDraft: DailyPlanDraft = {
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

  const proposal: StructuredReevaluationProposal = {
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
});
`;

code = code + '\n' + tests;
fs.writeFileSync('src/app-a/screens/planReview.test.ts', code);
