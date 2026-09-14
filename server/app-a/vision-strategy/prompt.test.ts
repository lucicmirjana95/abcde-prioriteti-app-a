import assert from "node:assert/strict";
import { buildVisionStrategyInstruction } from "./prompt";

const prompt = buildVisionStrategyInstruction("Serbian");
assert.ok(prompt.includes("Serbian"));
assert.ok(prompt.includes("necessary dependency order"));
assert.ok(prompt.includes("observable evidence"));
assert.ok(prompt.includes("Prefer fewer useful steps"));
assert.ok(prompt.includes("Do not schedule a downstream step before its prerequisite"));
assert.ok(prompt.includes("first currently executable step"));
assert.ok(prompt.includes("must not rely on an unfinished earlier step"));
assert.ok(prompt.includes("rather than fabricating a detailed path"));
assert.ok(prompt.includes("Do not fragment work into trivial interface actions"));
assert.ok(!prompt.toLowerCase().includes("disney"));
console.log("Vision strategy prompt tests passed.");
