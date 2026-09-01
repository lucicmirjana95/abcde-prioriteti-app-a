import assert from "node:assert/strict";
import { createVisionStrategyRoute, isVisionDecompositionResult, isVisionStrategyResult } from "./route";

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

console.log("Vision strategy route tests passed.");
