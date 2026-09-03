import assert from "node:assert/strict";
import { getVisionSaveDiagnostic, VisionPersistenceError } from "./visionStrategyRepository";

assert.deepEqual(getVisionSaveDiagnostic({ code: "permission-denied" }), { stage: "set_doc", category: "permission_denied", firebaseCode: "permission-denied" });
assert.deepEqual(getVisionSaveDiagnostic({ code: "auth/unauthenticated" }), { stage: "set_doc", category: "unauthenticated", firebaseCode: "auth/unauthenticated" });
assert.equal(getVisionSaveDiagnostic({ code: "unavailable" }).category, "unavailable");
assert.equal(getVisionSaveDiagnostic({ code: "deadline-exceeded" }).category, "network");
assert.equal(getVisionSaveDiagnostic({ code: "invalid-data" }).category, "invalid_data");
const wrapped = new VisionPersistenceError({ stage: "set_doc", category: "permission_denied", firebaseCode: "permission-denied" });
assert.equal(getVisionSaveDiagnostic(wrapped).category, "permission_denied");
assert.equal(JSON.stringify(getVisionSaveDiagnostic({ code: "permission-denied", message: "users/private/path" })).includes("private"), false);

console.log("Vision persistence diagnostic tests passed.");
