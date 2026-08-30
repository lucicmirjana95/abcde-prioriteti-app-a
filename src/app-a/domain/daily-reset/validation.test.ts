import assert from "node:assert";
import {
  normalizeDailyResetInput,
  validateDailyResetInput,
  validateClarificationSubmission,
  validateClarificationResponse,
  validatePlanDraft,
  recalculatePlanTotals,
} from "./validation";
import {
  DailyResetInput,
  DailyPlanDraft,
  DailyResetClarificationSubmission,
  ClarificationNeededResponse,
  ClarificationQuestion,
  ClassifiedBrainDumpItem,
  DailyPlanItem,
} from "./contracts";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    process.exit(1);
  }
}

// 1. valid minimal input
runTest("valid minimal input", () => {
  const input: DailyResetInput = {
    brainDump: "Need to wash the dishes",
    language: "en",
  };
  const result = validateDailyResetInput(input);
  assert.strictEqual(result.valid, true, "Should be valid");
});

// 2. whitespace-only brain dump
runTest("whitespace-only brain dump", () => {
  const input: DailyResetInput = {
    brainDump: "   ",
    language: "en",
  };
  const result = validateDailyResetInput(input);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("3 characters")));
});

// 3. unsupported language
runTest("unsupported language", () => {
  const input: DailyResetInput = {
    brainDump: "test",
    language: "fr" as any,
  };
  const result = validateDailyResetInput(input);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Language must be one of")));
});

// 4. invalid energy
runTest("invalid energy", () => {
  const input: DailyResetInput = {
    brainDump: "test",
    language: "en",
    energy: 6 as any,
  };
  const result = validateDailyResetInput(input);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Energy must be")));
});

// 5. invalid available minutes
runTest("invalid available minutes", () => {
  const input: DailyResetInput = {
    brainDump: "test",
    language: "en",
    availableMinutes: 1500,
  };
  const result = validateDailyResetInput(input);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("cannot exceed 1440")));
});

// 6. more than three clarification questions
runTest("more than three clarification questions", () => {
  const response: ClarificationNeededResponse = {
    success: true,
    phase: "clarification_needed",
    questions: [
      { id: "q1", question: "q1", context: "c", relatedItemIds: [], materialImpact: "other" },
      { id: "q2", question: "q2", context: "c", relatedItemIds: [], materialImpact: "other" },
      { id: "q3", question: "q3", context: "c", relatedItemIds: [], materialImpact: "other" },
      { id: "q4", question: "q4", context: "c", relatedItemIds: [], materialImpact: "other" },
    ],
  };
  const result = validateClarificationResponse(response);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("between 1 and 3")));
});

// 7. duplicate question IDs
runTest("duplicate question IDs", () => {
  const response: ClarificationNeededResponse = {
    success: true,
    phase: "clarification_needed",
    questions: [
      { id: "q1", question: "q1", context: "c", relatedItemIds: [], materialImpact: "other" },
      { id: "q1", question: "q2", context: "c", relatedItemIds: [], materialImpact: "other" },
    ],
  };
  const result = validateClarificationResponse(response);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Duplicate question ID")));
});

// 8. unanswered clarification question
runTest("unanswered clarification question", () => {
  const submission: DailyResetClarificationSubmission = {
    brainDump: "test",
    language: "en",
    clarificationAnswers: [
      { questionId: "q1", answer: "ans" },
    ],
  };
  const knownQuestions: ClarificationQuestion[] = [
    { id: "q1", question: "q1", context: "c", relatedItemIds: [], materialImpact: "other" },
    { id: "q2", question: "q2", context: "c", relatedItemIds: [], materialImpact: "other" },
  ];
  const result = validateClarificationSubmission(submission, knownQuestions);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Missing answer for question ID: q2")));
});

// Setup valid plan data for the next tests
const validClassifiedItem: ClassifiedBrainDumpItem = {
  id: "c1",
  originalText: "test",
  kind: "task",
  timeHorizon: "today",
  timeSensitivity: "none",
  isAmbiguous: false,
  needsCheck: false,
  priority: { explanation: "test" },
};

const validPlanItem: DailyPlanItem = {
  id: "p1",
  sourceItemIds: ["c1"],
  title: "test",
  block: "first_focus",
  estimatedMinutes: 30,
  requiredEnergy: 3,
  timeSensitivity: "none",
  priority: { explanation: "test" },
  needsCheck: false,
};

const baseDraft: DailyPlanDraft = {
  classifiedItems: [validClassifiedItem],
  firstFocus: [validPlanItem],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "Rationale",
  plannedRequiredMinutes: 30,
  plannedOptionalMinutes: 0,
};

// 9. valid plan with three First-focus items
runTest("valid plan with three First-focus items", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    firstFocus: [
      { ...validPlanItem, id: "p1" },
      { ...validPlanItem, id: "p2" },
      { ...validPlanItem, id: "p3" },
    ],
    plannedRequiredMinutes: 90,
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, true, "Should be valid with exactly 3 first focus items");
});

// 10. invalid plan with four First-focus items
runTest("invalid plan with four First-focus items", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    firstFocus: [
      { ...validPlanItem, id: "p1" },
      { ...validPlanItem, id: "p2" },
      { ...validPlanItem, id: "p3" },
      { ...validPlanItem, id: "p4" },
    ],
    plannedRequiredMinutes: 120,
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Maximum three First-focus")));
});

// 11. mismatched block and array
runTest("mismatched block and array", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    laterToday: [
      { ...validPlanItem, id: "p2", block: "first_focus" },
    ],
    plannedRequiredMinutes: 60,
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("wrong array. Expected later_today, got first_focus")));
});

// 12. duplicate plan IDs
runTest("duplicate plan IDs", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    laterToday: [
      { ...validPlanItem, id: "p1", block: "later_today" },
    ],
    plannedRequiredMinutes: 60,
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Duplicate plan item ID")));
});

// 13. missing sourceItemId
runTest("missing sourceItemId", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    firstFocus: [
      { ...validPlanItem, sourceItemIds: ["unknown"] },
    ],
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("references unknown classified item ID unknown")));
});

// 14. invalid energy requirement
runTest("invalid energy requirement", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    firstFocus: [
      { ...validPlanItem, requiredEnergy: 6 as any },
    ],
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("valid required energy (1-5)")));
});

// 15. incorrect plan totals
runTest("incorrect plan totals", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    plannedRequiredMinutes: 999, // incorrect
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Incorrect plannedRequiredMinutes")));
});

// 16. required minutes exceeding capacity
runTest("required minutes exceeding capacity", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    availableMinutes: 20,
    plannedRequiredMinutes: 30,
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("exceeds available capacity")));
});

// 17. optional minutes exceeding remaining capacity without invalidating required capacity
runTest("optional minutes exceeding remaining capacity", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    availableMinutes: 30, // exactly enough for required (30m)
    ifCapacityRemains: [
      { ...validPlanItem, id: "p2", block: "if_capacity_remains", estimatedMinutes: 60 },
    ],
    plannedRequiredMinutes: 30,
    plannedOptionalMinutes: 60,
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, true, "Optional minutes exceeding capacity is allowed");
});

// 18. multiple or structurally invalid interventions
runTest("invalid interventions", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    intervention: {
      type: "focus",
      title: "test",
      description: "test",
      estimatedMinutes: -10, // Invalid
      reason: "test"
    }
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Intervention estimated minutes must be a positive integer.")));
});

// 19. long-term idea with wrong time horizon
runTest("long-term idea with wrong time horizon", () => {
  const draft: DailyPlanDraft = {
    ...baseDraft,
    longTermIdeas: [
      validClassifiedItem // has timeHorizon: "today", should be "long_term_idea"
    ]
  };
  const result = validatePlanDraft(draft);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Long-term idea item c1 has incorrect time horizon")));
});

// 20. proof that validation and total recalculation do not mutate their inputs
runTest("no mutation on recalculatePlanTotals", () => {
  const originalDraft: DailyPlanDraft = {
    ...baseDraft,
    plannedRequiredMinutes: 0,
    plannedOptionalMinutes: 0
  };
  
  const originalJson = JSON.stringify(originalDraft);
  
  const recalculated = recalculatePlanTotals(originalDraft);
  
  assert.strictEqual(JSON.stringify(originalDraft), originalJson, "Original object was mutated!");
  assert.strictEqual(recalculated.plannedRequiredMinutes, 30);
  assert.notStrictEqual(originalDraft, recalculated, "Should return a new object");
});

console.log("\nAll tests passed successfully! 🎉");
