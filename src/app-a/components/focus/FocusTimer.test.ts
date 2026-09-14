import assert from "node:assert/strict";
import { getInitialFocusMinutes } from "./FocusTimer";

assert.equal(getInitialFocusMinutes(30, 25), 30, "task duration must override the preference default");
assert.equal(getInitialFocusMinutes(120, 25), 120, "long tasks must keep their exact duration");
assert.equal(getInitialFocusMinutes(0, 45), 45, "invalid task duration must use the preference default");
assert.equal(getInitialFocusMinutes(Number.NaN, 60), 60, "non-finite task duration must use the preference default");

console.log("Focus timer duration tests passed.");
