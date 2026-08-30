import assert from "node:assert";
import { buildDailyResetPrompt } from "./prompt";
import { parseModelResponse } from "./parseModelResponse";
import {
  fixValidClarificationResponse,
  fixValidPlanResponse,
  fixMalformedNonObject,
  fixUnknownPhase,
  fixTooManyQuestions,
  fixClarificationWithDraft,
  fixClarificationWithEmptyDraft,
  fixClarificationWithRelatedIds,
  fixPlanWithQuestions,
  fixPlanWithEmptyQuestions,
  fixDuplicateTempIds,
  fixUnresolvedSourceRef,
  fixUnresolvedQuestionRef,
  fixFourFirstFocus,
  fixCapacityOverflow,
  fixInvalidEnum,
  fixInvalidIntervention
} from "./fixtures";

let idCounter = 0;
const idFactory = () => `server_id_${++idCounter}`;

function runTest(name: string, fn: () => void) {
  try {
    idCounter = 0;
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    process.exit(1);
  }
}

const basicInput = {
  brainDump: "test",
  language: "en" as any
};

runTest("prompt generation for Serbian", () => {
  const prompt = buildDailyResetPrompt({ ...basicInput, language: "sr" });
  assert.ok(prompt.includes("Serbian"));
});

runTest("prompt generation for English", () => {
  const prompt = buildDailyResetPrompt({ ...basicInput, language: "en" });
  assert.ok(prompt.includes("English"));
});

runTest("prompt generation for Turkish", () => {
  const prompt = buildDailyResetPrompt({ ...basicInput, language: "tr" });
  assert.ok(prompt.includes("Turkish"));
});

runTest("user brain-dump content is clearly delimited", () => {
  const prompt = buildDailyResetPrompt({ ...basicInput, brainDump: "MY_UNIQUE_BRAIN_DUMP" });
  assert.ok(prompt.includes("[BRAIN DUMP START]\nMY_UNIQUE_BRAIN_DUMP\n[BRAIN DUMP END]"));
});

runTest("initial phase allows clarification or plan", () => {
  const prompt = buildDailyResetPrompt(basicInput);
  assert.ok(prompt.includes("INITIAL PHASE"));
  assert.ok(prompt.includes("phase: \"clarification_needed\""));
  assert.ok(prompt.includes("phase: \"plan_ready\""));
});

runTest("resolve phase forbids additional questions", () => {
  const prompt = buildDailyResetPrompt({ ...basicInput, clarificationAnswers: [] });
  assert.ok(prompt.includes("CLARIFICATION PHASE"));
  assert.ok(prompt.includes("NEVER ask another clarification question"));
});

runTest("valid clarification response parses successfully", () => {
  const res = parseModelResponse(fixValidClarificationResponse, idFactory, false);
  assert.strictEqual(res.phase, "clarification_needed");
});

runTest("clarification questions receive server-controlled IDs", () => {
  const res = parseModelResponse(fixValidClarificationResponse, idFactory, false);
  assert.strictEqual(res.phase, "clarification_needed");
  if (res.phase === "clarification_needed") {
    assert.ok(res.questions[0].id.startsWith("server_id_"));
  }
});

runTest("valid plan parses successfully", () => {
  const res = parseModelResponse(fixValidPlanResponse, idFactory, false);
  assert.strictEqual(res.phase, "plan_ready");
});

runTest("classified items and plan items receive server-controlled IDs", () => {
  const res = parseModelResponse(fixValidPlanResponse, idFactory, false);
  if (res.phase === "plan_ready") {
    assert.ok(res.draft.classifiedItems[0].id.startsWith("server_id_"));
    assert.ok(res.draft.firstFocus[0].id.startsWith("server_id_"));
  } else {
    assert.fail("Wrong phase");
  }
});

runTest("index 0 resolves to the first classified item", () => {
  const res = parseModelResponse(fixValidPlanResponse, idFactory, false);
  if (res.phase === "plan_ready") {
    const firstClassifiedId = res.draft.classifiedItems[0].id;
    const sourceId = res.draft.firstFocus[0].sourceItemIds[0];
    assert.strictEqual(sourceId, firstClassifiedId, "Index 0 must resolve to first classified item");
  } else {
    assert.fail("Expected plan_ready");
  }
});

runTest("the last valid index resolves correctly", () => {
  const multiPlan = {
    phase: "plan_ready",
    draft: {
      classifiedItems: [
        { originalText: "first", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "1" } },
        { originalText: "second", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "2" } },
        { originalText: "third", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "3" } },
      ],
      firstFocus: [
        { sourceItemIndex: 2, title: "Third task", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 2, timeSensitivity: "none", priority: { explanation: "3" }, needsCheck: false }
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: "Test plan"
    }
  };
  const res = parseModelResponse(multiPlan, idFactory, false);
  if (res.phase === "plan_ready") {
    const lastClassifiedId = res.draft.classifiedItems[2].id;
    const sourceId = res.draft.firstFocus[0].sourceItemIds[0];
    assert.strictEqual(sourceId, lastClassifiedId, "Last valid index (2) must resolve to classifiedItems[2]");
  } else {
    assert.fail("Expected plan_ready");
  }
});

runTest("repeated use of one index produces the exact same canonical sourceItemId", () => {
  const multiPlan = {
    phase: "plan_ready",
    draft: {
      classifiedItems: [
        { originalText: "first", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "1" } }
      ],
      firstFocus: [
        { sourceItemIndex: 0, title: "Task part A", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false },
        { sourceItemIndex: 0, title: "Task part B", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false }
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: "Test plan"
    }
  };
  const res = parseModelResponse(multiPlan, idFactory, false);
  if (res.phase === "plan_ready") {
    const classifiedId = res.draft.classifiedItems[0].id;
    const idA = res.draft.firstFocus[0].sourceItemIds[0];
    const idB = res.draft.firstFocus[1].sourceItemIds[0];
    assert.strictEqual(idA, classifiedId);
    assert.strictEqual(idB, classifiedId);
    assert.strictEqual(idA, idB);
  } else {
    assert.fail("Expected plan_ready");
  }
});

runTest("different indexes produce different canonical sourceItemIds", () => {
  const multiPlan = {
    phase: "plan_ready",
    draft: {
      classifiedItems: [
        { originalText: "first", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "1" } },
        { originalText: "second", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "2" } }
      ],
      firstFocus: [
        { sourceItemIndex: 0, title: "Task 1", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false },
        { sourceItemIndex: 1, title: "Task 2", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", priority: { explanation: "2" }, needsCheck: false }
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: "Test plan"
    }
  };
  const res = parseModelResponse(multiPlan, idFactory, false);
  if (res.phase === "plan_ready") {
    const id1 = res.draft.firstFocus[0].sourceItemIds[0];
    const id2 = res.draft.firstFocus[1].sourceItemIds[0];
    assert.notStrictEqual(id1, id2);
    assert.strictEqual(id1, res.draft.classifiedItems[0].id);
    assert.strictEqual(id2, res.draft.classifiedItems[1].id);
  } else {
    assert.fail("Expected plan_ready");
  }
});

runTest("missing index is rejected", () => {
  let rejectionReason = "";
  const badPlan = {
    phase: "plan_ready",
    draft: {
      ...fixValidPlanResponse.draft,
      firstFocus: [
        { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: undefined }
      ]
    }
  };
  const res = parseModelResponse(badPlan, idFactory, false, undefined, (reason) => { rejectionReason = reason; });
  assert.strictEqual(res.phase, "error");
  assert.strictEqual(rejectionReason, "missing_source_index");
});

runTest("string index is rejected (no guessing / no string coercion)", () => {
  let rejectionReason = "";
  const badPlan = {
    phase: "plan_ready",
    draft: {
      ...fixValidPlanResponse.draft,
      firstFocus: [
        { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: "0" as any }
      ]
    }
  };
  const res = parseModelResponse(badPlan, idFactory, false, undefined, (reason) => { rejectionReason = reason; });
  assert.strictEqual(res.phase, "error");
  assert.strictEqual(rejectionReason, "invalid_source_index");
});

runTest("prefix string index is rejected (no prefix guessing)", () => {
  let rejectionReason = "";
  const badPlan = {
    phase: "plan_ready",
    draft: {
      ...fixValidPlanResponse.draft,
      firstFocus: [
        { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: "temp_c1" as any }
      ]
    }
  };
  const res = parseModelResponse(badPlan, idFactory, false, undefined, (reason) => { rejectionReason = reason; });
  assert.strictEqual(res.phase, "error");
  assert.strictEqual(rejectionReason, "invalid_source_index");
});

runTest("fractional index is rejected", () => {
  let rejectionReason = "";
  const badPlan = {
    phase: "plan_ready",
    draft: {
      ...fixValidPlanResponse.draft,
      firstFocus: [
        { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: 0.5 }
      ]
    }
  };
  const res = parseModelResponse(badPlan, idFactory, false, undefined, (reason) => { rejectionReason = reason; });
  assert.strictEqual(res.phase, "error");
  assert.strictEqual(rejectionReason, "invalid_source_index");
});

runTest("negative index is rejected", () => {
  let rejectionReason = "";
  const badPlan = {
    phase: "plan_ready",
    draft: {
      ...fixValidPlanResponse.draft,
      firstFocus: [
        { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: -1 }
      ]
    }
  };
  const res = parseModelResponse(badPlan, idFactory, false, undefined, (reason) => { rejectionReason = reason; });
  assert.strictEqual(res.phase, "error");
  assert.strictEqual(rejectionReason, "source_index_out_of_range");
});

runTest("out-of-range index (index == length) is rejected", () => {
  let rejectionReason = "";
  const badPlan = {
    phase: "plan_ready",
    draft: {
      ...fixValidPlanResponse.draft,
      firstFocus: [
        { ...fixValidPlanResponse.draft.firstFocus[0], sourceItemIndex: 1 } // classifiedItems has length 1 (valid index is only 0)
      ]
    }
  };
  const res = parseModelResponse(badPlan, idFactory, false, undefined, (reason) => { rejectionReason = reason; });
  assert.strictEqual(res.phase, "error");
  assert.strictEqual(rejectionReason, "source_index_out_of_range");
});

runTest("subset items (deferredItems) convert index and match horizon", () => {
  const planWithDeferred = {
    phase: "plan_ready",
    draft: {
      classifiedItems: [
        { originalText: "today task", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "1" } },
        { originalText: "later task", kind: "task", timeHorizon: "this_week", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "2" } }
      ],
      firstFocus: [
        { sourceItemIndex: 0, title: "Today task", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false }
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [
        { sourceItemIndex: 1 }
      ],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: "Test plan"
    }
  };
  const res = parseModelResponse(planWithDeferred, idFactory, false);
  if (res.phase === "plan_ready") {
    assert.strictEqual(res.draft.deferredItems.length, 1);
    assert.strictEqual(res.draft.deferredItems[0].id, res.draft.classifiedItems[1].id);
    assert.strictEqual(res.draft.deferredItems[0].originalText, "later task");
  } else {
    assert.fail("Expected plan_ready");
  }
});

runTest("subset item with invalid index is rejected (never silently dropped)", () => {
  let rejectionReason = "";
  const badDeferred = {
    phase: "plan_ready",
    draft: {
      classifiedItems: [
        { originalText: "today task", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "1" } }
      ],
      firstFocus: [
        { sourceItemIndex: 0, title: "Today task", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false }
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [
        { sourceItemIndex: 99 }
      ],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: "Test plan"
    }
  };
  const res = parseModelResponse(badDeferred, idFactory, false, undefined, (reason) => { rejectionReason = reason; });
  assert.strictEqual(res.phase, "error");
  assert.strictEqual(rejectionReason, "source_index_out_of_range");
});

runTest("subset item with mismatched horizon is rejected", () => {
  let rejectionReason = "";
  const mismatched = {
    phase: "plan_ready",
    draft: {
      classifiedItems: [
        { originalText: "today task", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "1" } }
      ],
      firstFocus: [
        { sourceItemIndex: 0, title: "Today task", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 2, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false }
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [
        { sourceItemIndex: 0 } // index 0 has timeHorizon "today", but deferredItems expects "this_week" or "later"
      ],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: "Test plan"
    }
  };
  const res = parseModelResponse(mismatched, idFactory, false, undefined, (reason) => { rejectionReason = reason; });
  assert.strictEqual(res.phase, "error");
  assert.strictEqual(rejectionReason, "invalid_subset_horizon");
});

runTest("malformed response returns normalized error", () => {
  const res = parseModelResponse(fixMalformedNonObject, idFactory, false);
  assert.strictEqual(res.phase, "error");
  assert.strictEqual((res as any).code, "invalid_ai_response");
});

runTest("unknown phase returns normalized error", () => {
  const res = parseModelResponse(fixUnknownPhase, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("more than three questions is rejected", () => {
  const res = parseModelResponse(fixTooManyQuestions, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("clarification plus draft is rejected", () => {
  const res = parseModelResponse(fixClarificationWithDraft, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("plan plus questions is rejected", () => {
  const res = parseModelResponse(fixPlanWithQuestions, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("plan plus empty questions array succeeds", () => {
  const res = parseModelResponse(fixPlanWithEmptyQuestions, idFactory, false);
  assert.strictEqual(res.phase, "plan_ready");
});

runTest("clarification plus empty draft succeeds", () => {
  const res = parseModelResponse(fixClarificationWithEmptyDraft, idFactory, false);
  assert.strictEqual(res.phase, "clarification_needed");
});

runTest("clarification with relatedItemIds defensively normalizes to empty array", () => {
  const res = parseModelResponse(fixClarificationWithRelatedIds, idFactory, false);
  assert.strictEqual(res.phase, "clarification_needed");
  if (res.phase === "clarification_needed") {
    assert.deepStrictEqual(res.questions[0].relatedItemIds, []);
  }
});

runTest("duplicate temporary IDs in questions are rejected", () => {
  const res = parseModelResponse(fixDuplicateTempIds, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("unresolved question reference is rejected", () => {
  const res = parseModelResponse(fixUnresolvedQuestionRef, idFactory, false, ["valid_question_id"]);
  assert.strictEqual(res.phase, "error");
});

runTest("unresolved source item reference is rejected", () => {
  const res = parseModelResponse(fixUnresolvedSourceRef, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("four First-focus items are rejected", () => {
  const res = parseModelResponse(fixFourFirstFocus, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("required capacity overflow is rejected", () => {
  const res = parseModelResponse(fixCapacityOverflow, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("invalid enum is rejected", () => {
  const res = parseModelResponse(fixInvalidEnum, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("invalid intervention is rejected", () => {
  const res = parseModelResponse(fixInvalidIntervention, idFactory, false);
  assert.strictEqual(res.phase, "error");
});

runTest("clarification during resolve phase is rejected", () => {
  const res = parseModelResponse(fixValidClarificationResponse, idFactory, true);
  assert.strictEqual(res.phase, "error");
});

runTest("raw fixtures remain unchanged after parsing", () => {
  const raw = JSON.stringify(fixValidPlanResponse);
  parseModelResponse(fixValidPlanResponse, idFactory, false);
  assert.strictEqual(JSON.stringify(fixValidPlanResponse), raw);
});

runTest("no returned error exposes the raw fixture or brain-dump content", () => {
  const res = parseModelResponse(fixUnresolvedSourceRef, idFactory, false);
  if (res.phase === "error") {
    assert.ok(!res.error.includes("do laundry")); // raw text
  }
});

console.log("\nAll parse tests passed successfully! 🎉");
