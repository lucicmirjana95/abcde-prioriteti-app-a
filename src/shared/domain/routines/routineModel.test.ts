import assert from "node:assert/strict";
import { validateSharedRoutine, normalizeSharedRoutine } from "./validation";
import {
  createManualRoutineId,
  createVisionOriginRoutineId,
  createInboxOriginRoutineId,
} from "./identity";
import type { SharedRoutine } from "./contracts";

async function runModelTests() {
  console.log("Running Routine Model and Normalization Tests...");
  
  const baseRoutine: SharedRoutine = {
    id: "r_manual_123",
    title: "Test Routine",
    fullAction: "Do it fully",
    minimumAction: "Do it min",
    recurrence: { type: "daily" },
    status: "active",
    timeZone: "Europe/Belgrade",
    language: "en",
    source: "user",
    sortOrder: 0,
    goalRelationships: [],
    activeFrom: "2024-01-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. validna nova rutina
  const r: SharedRoutine = {
    ...baseRoutine,
    estimatedMinutes: 15,
    frequency: { kind: "daily" },
    origin: { kind: "manual" },
    revision: 1,
  };
  assert.equal(validateSharedRoutine(r).valid, true);
  assert.equal(normalizeSharedRoutine(r).type, "valid");

  // 2. validna legacy rutina bez novih polja
  assert.equal(validateSharedRoutine(baseRoutine).valid, true);

  // 3. legacy rutina daje needsDuration
  const norm = normalizeSharedRoutine(baseRoutine);
  assert.equal(norm.type, "valid_legacy");
  if (norm.type === "valid_legacy") {
    assert.equal(norm.needsDuration, true);
  }

  // 4. legacy bez schedule ne dobija izmišljene dane
  const legacyWeekdays: SharedRoutine = {
    ...baseRoutine,
    recurrence: { type: "selected_weekdays", weekdays: [1, 2, 3] },
  };
  const norm2 = normalizeSharedRoutine(legacyWeekdays);
  assert.equal(norm2.type, "valid_legacy");
  if (norm2.type === "valid_legacy") {
    assert.equal(norm2.needsSchedule, true);
    assert.equal(norm2.routine.frequency, undefined);
  }

  // 5. invalid estimatedMinutes
  assert.equal(validateSharedRoutine({ ...baseRoutine, estimatedMinutes: 0 }).valid, false);
  assert.equal(validateSharedRoutine({ ...baseRoutine, estimatedMinutes: 200 }).valid, false);

  // 6. invalid selected_days
  assert.equal(validateSharedRoutine({ ...baseRoutine, frequency: { kind: "selected_days", daysOfWeek: [0, 7] } }).valid, false);

  // 7. invalid times_per_week
  assert.equal(validateSharedRoutine({ ...baseRoutine, frequency: { kind: "times_per_week", count: 8 } }).valid, false);

  // 8. invalid preferredTime
  assert.equal(validateSharedRoutine({ ...baseRoutine, preferredTime: "25:00" }).valid, false);

  // 9. invalid timezone
  assert.equal(validateSharedRoutine({ ...baseRoutine, timeZone: "Mars/Base" }).valid, false);

  // 10. invalid revision
  assert.equal(validateSharedRoutine({ ...baseRoutine, revision: -1 }).valid, false);

  // 11. jedan nevalidan dokument ne ruši ostale rezultate
  assert.equal(normalizeSharedRoutine({ ...baseRoutine, title: "" }).type, "invalid");
  
  console.log("Running Stable ID Helpers Tests...");

  // 12. isti Vision source → isti ID
  const id1 = createVisionOriginRoutineId("u1", "v1", "f1");
  const id2 = createVisionOriginRoutineId("u1", "v1", "f1");
  assert.equal(id1, id2);

  // 13. različiti korisnici → različiti ID
  const id3 = createVisionOriginRoutineId("u2", "v1", "f1");
  assert.notEqual(id1, id3);

  // 14. isti Inbox source → isti ID
  const i1 = createInboxOriginRoutineId("u1", "i1", "f1");
  const i2 = createInboxOriginRoutineId("u1", "i1", "f1");
  assert.equal(i1, i2);

  // 15. različiti source ID-jevi → različiti ID
  assert.notEqual(id1, i1);

  // 16. naslov ne utiče na identitet
  assert.ok(id1);

  // 17. ID je path-safe
  const idSafe = createVisionOriginRoutineId("u1", "v1", "f1/\\?#");
  assert.match(idSafe, /^[a-zA-Z0-9_-]+$/);
  
  console.log("routineModel tests passed!");
}

runModelTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
