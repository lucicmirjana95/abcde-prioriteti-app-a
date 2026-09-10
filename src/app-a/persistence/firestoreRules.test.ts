import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = readFileSync("firestore.rules", "utf8");

for (const requiredMatch of [
  "match /users/{userId}",
  "match /routines/{routineId}",
  "match /routineCompletions/{completionId}",
  "match /visionStrategies/{strategyId}",
  "match /todayCandidates/{candidateId}",
  "match /appAUsers/{userId}",
  "match /dailyResets/{dateKey}",
  "match /rolloverDecisions/{decisionId}",
  "match /inboxItems/{inboxItemId}",
]) {
  assert.ok(rules.includes(requiredMatch), `Missing required App A rule: ${requiredMatch}`);
}

assert.ok(rules.includes("allow read, write: if false;"), "Firestore must remain default-deny");
assert.ok(rules.includes("request.auth != null && request.auth.uid == userId"), "Owner authentication guard is required");

for (const retiredPublicPath of [
  "match /boards/",
  "match /tasks/",
  "match /inbox/",
  "match /habits/",
  "match /stacks/",
  "match /intentions/",
  "match /logs/",
]) {
  assert.equal(rules.includes(retiredPublicPath), false, `Retired legacy path must stay closed: ${retiredPublicPath}`);
}

console.log("App A Firestore allowlist regression checks passed.");
