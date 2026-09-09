import assert from "node:assert/strict";
import { createVisionStrategyRoute, isVisionDecompositionResult, isVisionFeasibilityResult, isVisionStrategyResult } from "./route";

const valid = {
  outcome: "A clear outcome",
  importance: "It supports a stated goal",
  milestones: [{ title: "Validate", result: "The core assumption is checked", steps: ["Speak to one relevant person"] }],
  risks: ["The assumption may be wrong"],
  assumptions: ["A relevant person is available"],
  nextStep: "Write the first question",
};

assert.equal(isVisionStrategyResult(valid), true);
assert.equal(isVisionStrategyResult({ ...valid, milestones: [] }), false);
assert.equal(isVisionStrategyResult({ ...valid, milestones: Array.from({ length: 6 }, () => valid.milestones[0]) }), false);
assert.equal(isVisionStrategyResult({ ...valid, milestones: [{ ...valid.milestones[0], steps: [] }] }), false);
assert.equal(isVisionDecompositionResult({ shouldDecompose: false, reason: "already_actionable", substeps: [] }), true);
assert.equal(isVisionDecompositionResult({ shouldDecompose: true, reason: "too_broad", substeps: ["Define the outcome", "Validate it"] }), true);
assert.equal(isVisionDecompositionResult({ shouldDecompose: true, reason: "too_broad", substeps: ["Only one"] }), false);
assert.equal(isVisionDecompositionResult({ shouldDecompose: false, reason: "too_broad", substeps: [] }), false);
const feasible = { status: "feasible", normalizedGoal: "Write a book", reason: "No conflicting timeframe was supplied.", assumptions: [], questions: [] };
assert.equal(isVisionFeasibilityResult(feasible), true);
assert.equal(isVisionFeasibilityResult({ ...feasible, status: "unrealistic_for_timeframe" }), false);
assert.equal(isVisionFeasibilityResult({ ...feasible, status: "insufficient_information", questions: [] }), false);
assert.equal(isVisionFeasibilityResult({ ...feasible, status: "unrealistic_for_timeframe", adjustedGoal: "Write a draft", questions: ["How much is written?"] }), false);
assert.equal(isVisionFeasibilityResult({ ...feasible, status: "insufficient_information", adjustedGoal: "Write a draft", questions: ["How much is written?"] }), false);

function responseHarness() {
  const result: { status?: number; body?: unknown } = {};
  const response = {
    status(code: number) { result.status = code; return response; },
    json(body: unknown) { result.body = body; return response; },
  };
  return { result, response };
}

{
  const { result, response } = responseHarness();
  await createVisionStrategyRoute(async () => feasible)(
    { body: { language: "en", idea: "Write a useful book", mode: "feasibility", timeframe: "12 months" } } as never,
    response as never,
  );
  assert.equal(result.status, 200);
}

{
  const { result, response } = responseHarness();
  await createVisionStrategyRoute(async () => ({ shouldDecompose: false, reason: "already_actionable", substeps: [] }))(
    { body: { language: "en", idea: "Build a useful product", mode: "decompose", step: "Send the proposal to Ana", depth: 0 } } as never,
    response as never,
  );
  assert.equal(result.status, 200);
}

{
  const { result, response } = responseHarness();
  await createVisionStrategyRoute(async () => ({ shouldDecompose: true, reason: "too_broad", substeps: ["One", "Two"] }))(
    { body: { language: "en", idea: "Build a useful product", mode: "decompose", step: "Build product", depth: 2 } } as never,
    response as never,
  );
  assert.equal(result.status, 400);
}

{
  const { result, response } = responseHarness();
  await createVisionStrategyRoute(async () => valid)(
    { body: { language: "en", idea: "Build a useful product" } } as never,
    response as never,
  );
  assert.equal(result.status, 200);
}

{
  const { result, response } = responseHarness();
  await createVisionStrategyRoute(async () => valid)(
    { body: { language: "en", idea: "x" } } as never,
    response as never,
  );
  assert.equal(result.status, 400);
}

// Tests for classifyServerAiError
import { classifyServerAiError } from "./route";
import { normalizeVisionFeasibilityResult } from "../../../src/shared/domain/vision/strategy";

{
  const diagTimeout = classifyServerAiError(new DOMException("Aborted", "AbortError"), "feasibility");
  assert.equal(diagTimeout.category, "timeout");
  assert.equal(diagTimeout.stage, "timeout");

  const diag429 = classifyServerAiError(new Error("Resource has been exhausted (e.g. check quota). [429]"), "strategy");
  assert.equal(diag429.category, "quota");
  assert.equal(diag429.stage, "quota_or_model_unavailable");
  assert.equal(diag429.httpStatus, 429);

  const diagJson = classifyServerAiError(new SyntaxError("Unexpected token in JSON"), "feasibility");
  assert.equal(diagJson.category, "invalid_model_response");
  assert.equal(diagJson.stage, "feasibility_response_parse");
}

// Reproduction Scenario: "I want to finish writing my book, publish it, and then start my second book." / "1 month"
// Case 1: Model returns unrealistic_for_timeframe with adjustedGoal and questions
{
  const reproductionRaw = {
    status: "unrealistic_for_timeframe",
    normalizedGoal: "Finish writing, publishing, and beginning a second book in 1 month",
    reason: "Writing, publishing, and starting a second book within one month is not realistically achievable.",
    assumptions: ["Publishing pipeline is ready"],
    adjustedGoal: "Complete the final draft of the first book",
    adjustedTimeframe: "6-12 months",
    questions: ["How many chapters have you written?", "Is the first book already drafted?"],
  };

  const normalized = normalizeVisionFeasibilityResult(
    reproductionRaw,
    "I want to finish writing my book, publish it, and then start my second book.",
    "1 month"
  );
  assert.equal(isVisionFeasibilityResult(normalized), true);
  // Conflicting questions + adjustedGoal normalizes to insufficient_information
  assert.equal(normalized.status, "insufficient_information");
  assert.equal(normalized.questions.length, 2);
  assert.equal(normalized.adjustedGoal, undefined);
  assert.equal(normalized.adjustedTimeframe, undefined);
}

// Case 2: Model returns unrealistic_for_timeframe with adjusted suggestions and no questions
{
  const unrealisticRaw = {
    status: "unrealistic_for_timeframe",
    normalizedGoal: "Finish writing, publishing, and beginning a second book in 1 month",
    reason: "Writing, publishing, and starting a second book within one month is not realistically achievable.",
    assumptions: ["Publishing pipeline is ready"],
    adjustedGoal: "Complete the final draft of the first book",
    adjustedTimeframe: "6-12 months",
    questions: [],
  };

  const normalized = normalizeVisionFeasibilityResult(
    unrealisticRaw,
    "I want to finish writing my book, publish it, and then start my second book.",
    "1 month"
  );
  assert.equal(isVisionFeasibilityResult(normalized), true);
  assert.equal(normalized.status, "unrealistic_for_timeframe");
  assert.deepEqual(normalized.questions, []);
  assert.equal(normalized.adjustedGoal, "Complete the final draft of the first book");
  assert.equal(normalized.adjustedTimeframe, "6-12 months");
}

// Conflicting insufficient_information scenario
{
  const conflictRaw = {
    status: "insufficient_information",
    normalizedGoal: "Build an app",
    reason: "Need clarity on target audience",
    assumptions: [],
    adjustedGoal: "Build a prototype",
    adjustedTimeframe: "3 months",
    questions: ["Who is your target user?"],
  };

  const normalized = normalizeVisionFeasibilityResult(conflictRaw, "Build an app", "1 month");
  assert.equal(isVisionFeasibilityResult(normalized), true);
  assert.equal(normalized.status, "insufficient_information");
  assert.equal(normalized.adjustedGoal, undefined);
  assert.equal(normalized.adjustedTimeframe, undefined);
  assert.equal(normalized.questions.length, 1);
}

// Error diagnostic propagation via route
{
  const { result, response } = responseHarness();
  const failingGenerator = async () => {
    const err = new Error("Gemini quota exhausted");
    (err as unknown as { status: number }).status = 429;
    throw err;
  };
  await createVisionStrategyRoute(failingGenerator)(
    { body: { language: "en", idea: "I want to finish writing my book", mode: "feasibility", timeframe: "1 month" } } as never,
    response as never,
  );
  assert.equal(result.status, 429);
  const body = result.body as { success: boolean; code: string; stage: string; category: string };
  assert.equal(body.success, false);
  assert.equal(body.category, "quota");
  assert.equal(body.stage, "quota_or_model_unavailable");
  assert.equal(body.code, "QUOTA_EXHAUSTED");
}

console.log("Vision strategy route tests passed.");
