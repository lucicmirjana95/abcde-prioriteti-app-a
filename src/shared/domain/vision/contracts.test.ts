import assert from "node:assert/strict";
import { isSavedVisionStrategy } from "./contracts";

const saved = {
  id: "vision_example_1",
  idea: "Build a useful product",
  language: "en",
  strategy: {
    outcome: "A useful product",
    importance: "It solves the stated problem",
    milestones: [{ title: "Validate", result: "Evidence exists", steps: ["Interview one user"] }],
    risks: [], assumptions: [], nextStep: "Write one interview question",
  },
  stepBreakdowns: {},
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

assert.equal(isSavedVisionStrategy(saved), true);
assert.equal(isSavedVisionStrategy({ ...saved, status: "active" }), true);
assert.equal(isSavedVisionStrategy({ ...saved, status: "archived", archivedAt: "2026-09-02T10:00:00.000Z" }), true);
assert.equal(isSavedVisionStrategy({ ...saved, status: "archived" }), false);
assert.equal(isSavedVisionStrategy({ ...saved, stepBreakdowns: { "m0-s0": ["Only one"] } }), false);
assert.equal(isSavedVisionStrategy({ ...saved, strategy: { ...saved.strategy, milestones: [] } }), false);
console.log("Saved vision strategy contract tests passed.");
