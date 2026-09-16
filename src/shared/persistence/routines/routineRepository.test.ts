import assert from "node:assert/strict";
import {
  createRoutine,
  updateRoutine,
  permanentDeleteRoutine,
  loadRoutines,
  loadRoutinesWithDiagnostics,
  recordRoutineCompletion,
  getLastLoadRoutinesDiagnostics,
} from "./routineRepository";
import type { SharedRoutine } from "../../domain/routines";
import { firestoreAdapter } from "./firestoreAdapter";
import { resetGuardAdapter } from "./resetGuardAdapter";
import { RoutineManagementController } from "../../../app-a/domain/routines/RoutineManagementController";
import {
  getRoutineCompletionDocumentId,
  computeRoutineSemanticFingerprint,
} from "../../domain/routines";

async function runRepoTests() {
  console.log("Running Routine Repository Concurrency Tests...");

  let mockDb: Record<string, any> = {};

  // Mock firestore adapter methods
  (firestoreAdapter as any).db = {};
  (firestoreAdapter as any).doc = (db: any, ...args: string[]) => args.join("/");
  (firestoreAdapter as any).collection = (db: any, ...args: string[]) => args.join("/");
  (firestoreAdapter as any).query = (coll: string) => coll;
  (firestoreAdapter as any).where = () => ({});
  (firestoreAdapter as any).setDoc = async (ref: string, data: any) => {
    mockDb[ref] = JSON.parse(JSON.stringify(data));
  };
  (firestoreAdapter as any).deleteDoc = async (ref: string) => {
    delete mockDb[ref];
  };
  (firestoreAdapter as any).getDocs = async (collPath: string) => {
    const prefix = collPath.endsWith("/") ? collPath : collPath + "/";
    const docs = Object.entries(mockDb)
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
      .map(([key, data]) => ({
        id: key.slice(prefix.length),
        data: () => JSON.parse(JSON.stringify(data)),
      }));
    return { docs };
  };
  
  (firestoreAdapter as any).runTransaction = async (db: any, cb: any) => {
    // Isolated working copy / staging set
    const stagingWrites: Record<string, any> = {};
    const stagingDeletes: Set<string> = new Set();

    const transaction = {
      get: async (ref: string) => {
        if (stagingDeletes.has(ref)) {
          return { exists: () => false, data: () => null };
        }
        if (ref in stagingWrites) {
          return {
            exists: () => true,
            data: () => JSON.parse(JSON.stringify(stagingWrites[ref])),
          };
        }
        return {
          exists: () => ref in mockDb,
          data: () => (mockDb[ref] ? JSON.parse(JSON.stringify(mockDb[ref])) : null),
        };
      },
      set: (ref: string, data: any) => {
        stagingDeletes.delete(ref);
        stagingWrites[ref] = JSON.parse(JSON.stringify(data));
      },
      delete: (ref: string) => {
        delete stagingWrites[ref];
        stagingDeletes.add(ref);
      },
    };

    // If cb throws, stagingWrites and stagingDeletes are completely discarded (rollback)
    await cb(transaction);

    // Commit staging only upon successful completion of cb
    for (const ref of stagingDeletes) {
      delete mockDb[ref];
    }
    for (const [ref, data] of Object.entries(stagingWrites)) {
      mockDb[ref] = data;
    }
  };

  let blockReset = false;
  resetGuardAdapter.isResetBlocked = () => blockReset;

  const baseRoutine: SharedRoutine = {
    id: "r1",
    title: "Test Routine",
    fullAction: "Do it fully",
    minimumAction: "Do it min",
    recurrence: { type: "daily" },
    status: "active",
    timeZone: "UTC",
    language: "en",
    source: "user",
    sortOrder: 0,
    goalRelationships: [],
    activeFrom: "2024-01-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 18. create -> revision 1
  mockDb = {};
  const res18 = await createRoutine("user1", baseRoutine);
  assert.equal(res18.type, "success");
  if (res18.type === "success") {
    assert.equal(res18.routine.revision, 1);
  }
  assert.ok(mockDb["users/user1/routines/r1"]);

  // 19. duplicate create -> conflict
  const res19 = await createRoutine("user1", baseRoutine);
  assert.equal(res19.type, "conflict");
  if (res19.type === "conflict") assert.equal(res19.reason, "already_exists");

  // 20. update sa dobrom revision -> +1
  const res20 = await updateRoutine("user1", "r1", 1, (r) => ({ ...r, title: "New" }));
  assert.equal(res20.type, "success");
  if (res20.type === "success") {
    assert.equal(res20.routine.revision, 2);
    assert.equal(res20.routine.title, "New");
  }

  // 21. stale revision -> conflict
  const res21 = await updateRoutine("user1", "r1", 1, (r) => ({ ...r, title: "Another" }));
  assert.equal(res21.type, "conflict");
  if (res21.type === "conflict") assert.equal(res21.reason, "routine_changed_elsewhere");

  // 22. dva paralelna update-a iz revision 1 -> tačno jedan success
  mockDb = {};
  await createRoutine("user1", baseRoutine);
  // Simulating the race by updating mockDb directly
  mockDb["users/user1/routines/r1"].revision = 2; 
  const res22 = await updateRoutine("user1", "r1", 1, (r) => ({ ...r, title: "Update B" }));
  assert.equal(res22.type, "conflict");

  // 23. legacy revision 0 -> prvi update revision 1
  mockDb = {};
  mockDb["users/user1/routines/r1"] = { ...baseRoutine, revision: undefined };
  const res23 = await updateRoutine("user1", "r1", 0, (r) => ({ ...r, title: "Update" }));
  assert.equal(res23.type, "success");
  if (res23.type === "success") assert.equal(res23.routine.revision, 1);

  // 24. resetGuard blokira transaction
  blockReset = true;
  const res24 = await createRoutine("user1", baseRoutine);
  assert.equal(res24.type, "reset_in_progress");
  blockReset = false;

  // 25. mutation retry
  mockDb = {};
  await createRoutine("user1", baseRoutine);
  await updateRoutine("user1", "r1", 1, (r) => ({ ...r, title: "A" }));
  const res25 = await updateRoutine("user1", "r1", 1, (r) => ({ ...r, title: "A" }));
  assert.equal(res25.type, "conflict"); // expected 1, current is 2 -> conflict

  // 26. pause koristi isti revision guard
  mockDb = {};
  await createRoutine("user1", baseRoutine);
  const res26 = await updateRoutine("user1", "r1", 1, (r) => ({ ...r, status: "paused", pausedAt: new Date().toISOString() }));
  assert.equal(res26.type, "success");
  if (res26.type === "success") assert.equal(res26.routine.status, "paused");

  // 27. resume koristi isti revision guard
  mockDb = {};
  mockDb["users/user1/routines/r1"] = { ...baseRoutine, status: "paused", pausedAt: new Date().toISOString(), revision: 2 };
  const res27 = await updateRoutine("user1", "r1", 2, (r) => ({ ...r, status: "active", pausedAt: undefined }));
  assert.equal(res27.type, "success");
  if (res27.type === "success") assert.equal(res27.routine.status, "active");

  // 28. archive koristi isti revision guard
  mockDb = {};
  await createRoutine("user1", baseRoutine);
  const res28 = await updateRoutine("user1", "r1", 1, (r) => ({ ...r, status: "archived", archivedAt: new Date().toISOString() }));
  assert.equal(res28.type, "success");
  if (res28.type === "success") assert.equal(res28.routine.status, "archived");

  // 29. edit ne briše nepomenuta polja
  mockDb = {};
  await createRoutine("user1", { ...baseRoutine, why: "Health" });
  const res29 = await updateRoutine("user1", "r1", 1, (r) => ({ ...r, title: "New Title" }));
  assert.equal(res29.type, "success");
  if (res29.type === "success") {
    assert.equal(res29.routine.title, "New Title");
    assert.equal(res29.routine.why, "Health");
  }

  // 30. Trajno brisanje (permanentDeleteRoutine)
  console.log("Running Permanent Delete Tests (30)...");
  mockDb = {};
  const r2Routine: SharedRoutine = { ...baseRoutine, id: "r2", title: "Routine 2" };
  await createRoutine("user1", baseRoutine); // r1 revision 1
  await createRoutine("user1", r2Routine);   // r2 revision 1
  mockDb["users/user1/routineCompletions/2024-01-01_r1"] = {
    routineId: "r1",
    localDate: "2024-01-01",
    status: "full",
    sourceApp: "app_a",
    recordedAt: "2024-01-01T10:00:00.000Z",
    completedAt: "2024-01-01T10:00:00.000Z",
  };

  // 30a: Nedostaje potvrda
  const res30NoToken = await permanentDeleteRoutine("user1", "r1", 1, "WRONG_TOKEN");
  assert.equal(res30NoToken.type, "error");
  assert.ok(mockDb["users/user1/routines/r1"]);

  // 30b: resetGuard blokira brisanje
  blockReset = true;
  const res30Reset = await permanentDeleteRoutine("user1", "r1", 1, "PERMANENT_DELETE_CONFIRMED");
  assert.equal(res30Reset.type, "reset_in_progress");
  assert.ok(mockDb["users/user1/routines/r1"]);
  blockReset = false;

  // 30c: Revision conflict sprečava brisanje ako je expectedRevision zastareo
  const res30Conflict = await permanentDeleteRoutine("user1", "r1", 99, "PERMANENT_DELETE_CONFIRMED");
  assert.equal(res30Conflict.type, "conflict");
  assert.ok(mockDb["users/user1/routines/r1"]);

  // 30d: Uspešno brisanje ciljane rutine
  const res30Success = await permanentDeleteRoutine("user1", "r1", 1, "PERMANENT_DELETE_CONFIRMED");
  assert.equal(res30Success.type, "success");
  // Tačno ciljana rutina je obrisana
  assert.equal(mockDb["users/user1/routines/r1"], undefined);
  // Druga rutina r2 ostaje netaknuta
  assert.ok(mockDb["users/user1/routines/r2"]);
  assert.equal(mockDb["users/user1/routines/r2"].title, "Routine 2");
  // Istorijski zapisi završavanja za r1 ostaju sačuvani
  assert.ok(mockDb["users/user1/routineCompletions/2024-01-01_r1"]);
  assert.equal(mockDb["users/user1/routineCompletions/2024-01-01_r1"].status, "full");

  // 30e: Retry brisanja ne briše druge dokumente i javlja not_found
  const res30Retry = await permanentDeleteRoutine("user1", "r1", 1, "PERMANENT_DELETE_CONFIRMED");
  assert.equal(res30Retry.type, "conflict");
  if (res30Retry.type === "conflict") assert.equal(res30Retry.reason, "not_found");
  assert.ok(mockDb["users/user1/routines/r2"]);

  console.log("Running Completion Consistency Tests...");

  // 31. stabilan completion ID
  const compId = getRoutineCompletionDocumentId("r1", "2024-01-01");
  assert.equal(compId, "2024-01-01_r1");

  // 32. completion ne menja routine revision (pravi test)
  mockDb = {};
  await createRoutine("user1", baseRoutine);
  assert.equal(mockDb["users/user1/routines/r1"].revision, 1);
  await recordRoutineCompletion("user1", {
    routineId: "r1",
    localDate: "2024-01-01",
    status: "full",
    sourceApp: "app_a",
    recordedAt: "2024-01-01T12:00:00.000Z",
    completedAt: "2024-01-01T12:00:00.000Z",
  });
  // Revision rutine mora ostati nepromenjen (1)
  assert.equal(mockDb["users/user1/routines/r1"].revision, 1);
  assert.ok(mockDb["users/user1/routineCompletions/2024-01-01_r1"]);

  // 33. routine update ne briše completion (pravi test)
  await updateRoutine("user1", "r1", 1, (r) => ({ ...r, title: "Title Rev 2" }));
  assert.equal(mockDb["users/user1/routines/r1"].revision, 2);
  assert.equal(mockDb["users/user1/routines/r1"].title, "Title Rev 2");
  // Completion zapis postoji nepromenjen
  assert.ok(mockDb["users/user1/routineCompletions/2024-01-01_r1"]);
  assert.equal(mockDb["users/user1/routineCompletions/2024-01-01_r1"].status, "full");

  // 34. resetGuard completion zaštita
  blockReset = true;
  try {
    await recordRoutineCompletion("user1", {
      routineId: "r1",
      localDate: "2024-01-01",
      status: "full",
      sourceApp: "app_a",
      recordedAt: new Date().toISOString()
    });
    assert.fail("Should throw reset_in_progress");
  } catch (e: any) {
    assert.equal(e.message, "reset_in_progress");
  }
  blockReset = false;

  // 35. Idempotentnost i stabilan identitet ručne rutine kroz retry i receipt kolekciju
  console.log("Running Manual Routine Idempotency & Receipt Tests (35)...");
  mockDb = {};
  const controller = new RoutineManagementController({
    createRoutine,
    updateRoutine,
    permanentDeleteRoutine,
  });

  const draft = controller.initManualDraft({
    title: "Draft Routine",
    fullAction: "Full action",
    minimumAction: "Min action",
  });
  assert.ok(draft.id.startsWith("r_manual_"));
  assert.ok(draft.mutationId?.startsWith("mut_"));

  // Prvi poziv uspešno kreira rutinu i receipt
  const created = await controller.create("user1", draft);
  assert.equal(created.id, draft.id);
  assert.equal(mockDb[`users/user1/routines/${draft.id}`].title, "Draft Routine");
  assert.ok(mockDb[`users/user1/routineMutationReceipts/${draft.mutationId}`]);
  const receiptDoc = mockDb[`users/user1/routineMutationReceipts/${draft.mutationId}`];
  assert.equal(receiptDoc.routineId, draft.id);
  assert.ok(receiptDoc.payloadFingerprint);
  // Receipt ne sme sadržati plaintext korisnički naslov
  assert.equal((receiptDoc as any).title, undefined);

  // Simulacija neizvesnog mrežnog odgovora: klijent ponavlja isti zahtev sa istim draft-om
  const retried = await controller.create("user1", draft);
  assert.equal(retried.id, draft.id);
  // Tačno jedan dokument rutine i tačno jedan receipt postoje u bazi
  const allRoutineKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user1/routines/"));
  assert.equal(allRoutineKeys.length, 1);
  assert.equal(allRoutineKeys[0], `users/user1/routines/${draft.id}`);
  const allReceiptKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user1/routineMutationReceipts/"));
  assert.equal(allReceiptKeys.length, 1);

  // Isti mutationId upotrebljen za drugi routineId -> konflikt
  const conflictingIdDraft = {
    ...draft,
    id: "r_manual_different_id_123",
  };
  try {
    await controller.create("user1", conflictingIdDraft);
    assert.fail("Should reject reused mutationId with different routineId");
  } catch (e: any) {
    assert.ok(e.message.includes("mutation_id_used_for_different_routine"));
  }
  // Ne sme biti kreiran drugi dokument
  assert.equal(mockDb["users/user1/routines/r_manual_different_id_123"], undefined);

  // Isti mutationId i isti id ali promenjen semantički payload -> konflikt
  const conflictingPayloadDraft = {
    ...draft,
    title: "Completely Changed Title",
  };
  try {
    await controller.create("user1", conflictingPayloadDraft);
    assert.fail("Should reject reused mutationId with altered payload");
  } catch (e: any) {
    assert.ok(e.message.includes("mutation_payload_mismatch"));
  }

  // Slučaj: Receipt postoji, ali rutina nedostaje -> konflikt:mutation_receipt_missing_routine
  const corruptMutationId = "mut_corrupt_test_123456";
  const corruptRoutineId = "r_manual_missing_corrupt";
  const corruptDraft = {
    ...draft,
    id: corruptRoutineId,
    mutationId: corruptMutationId,
  };
  const corruptFingerprint = await computeRoutineSemanticFingerprint(corruptDraft as SharedRoutine);
  // Ručno ubacujemo samo receipt u mockDb, bez rutine
  mockDb[`users/user1/routineMutationReceipts/${corruptMutationId}`] = {
    mutationId: corruptMutationId,
    routineId: corruptRoutineId,
    payloadFingerprint: corruptFingerprint,
    createdAt: new Date().toISOString(),
  };
  const preCorruptDbState = { ...mockDb };
  try {
    await controller.create("user1", corruptDraft);
    assert.fail("Should reject when receipt exists but routine document is missing");
  } catch (e: any) {
    assert.ok(e.message.includes("conflict:mutation_receipt_missing_routine"));
  }
  // Ne sme biti kreirana rutina niti izmenjena baza
  assert.equal(mockDb[`users/user1/routines/${corruptRoutineId}`], undefined);
  assert.deepEqual(mockDb, preCorruptDbState);

  // Slučaj: Rutina postoji, receipt nedostaje -> sigurna oporavak semantika (backfill receipt u istoj transakciji)
  const recoveryMutationId = "mut_recovery_test_123456";
  const recoveryRoutineId = "r_manual_recovery_123";
  const recoveryDraft = {
    ...draft,
    id: recoveryRoutineId,
    mutationId: recoveryMutationId,
  };
  const recoveryFingerprint = await computeRoutineSemanticFingerprint(recoveryDraft as SharedRoutine);
  // Postavimo postojeću rutinu u bazu, ali bez receipt-a
  mockDb[`users/user1/routines/${recoveryRoutineId}`] = {
    ...recoveryDraft,
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  assert.equal(mockDb[`users/user1/routineMutationReceipts/${recoveryMutationId}`], undefined);
  // Poziv createRoutine prepoznaje identičan id, mutationId i fingerprint, i pravi nedostajući receipt
  const recoveryResult = await controller.create("user1", recoveryDraft);
  assert.equal(recoveryResult.id, recoveryRoutineId);
  assert.ok(mockDb[`users/user1/routineMutationReceipts/${recoveryMutationId}`]);
  assert.equal(mockDb[`users/user1/routineMutationReceipts/${recoveryMutationId}`].payloadFingerprint, recoveryFingerprint);

  // Slučaj: Rutina postoji, receipt nedostaje, ali se fingerprint ne poklapa -> konflikt
  const recoveryMismatchMutationId = "mut_recovery_mismatch_123456";
  const recoveryMismatchRoutineId = "r_manual_recovery_mismatch";
  const recoveryMismatchDraft = {
    ...draft,
    id: recoveryMismatchRoutineId,
    mutationId: recoveryMismatchMutationId,
    title: "Draft Title A",
  };
  mockDb[`users/user1/routines/${recoveryMismatchRoutineId}`] = {
    ...recoveryMismatchDraft,
    title: "Database Title B Different",
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  try {
    await controller.create("user1", recoveryMismatchDraft);
    assert.fail("Should reject recovery when routine content does not match payload fingerprint");
  } catch (e: any) {
    assert.ok(e.message.includes("conflict:existing_routine_fingerprint_mismatch"));
  }
  assert.equal(mockDb[`users/user1/routineMutationReceipts/${recoveryMismatchMutationId}`], undefined);

  // Rollback dokaz: Transakcija koja baci grešku nakon jednog ili više staged write-ova ne ostavlja parcijalne podatke
  const initialDbBeforeRollback = JSON.parse(JSON.stringify(mockDb));
  let errorAfterWriteThrown = false;
  try {
    await (firestoreAdapter as any).runTransaction((firestoreAdapter as any).db, async (txn: any) => {
      txn.set("users/user1/routines/staged_routine_test", { test: true });
      txn.set("users/user1/routineMutationReceipts/staged_receipt_test", { test: true });
      // Baci grešku nakon dva staged write-a
      errorAfterWriteThrown = true;
      throw new Error("simulated_transaction_failure_after_writes");
    });
  } catch (e: any) {
    assert.equal(e.message, "simulated_transaction_failure_after_writes");
  }
  assert.ok(errorAfterWriteThrown);
  // Dokazujemo da staging promene nisu dospele u mockDb
  assert.equal(mockDb["users/user1/routines/staged_routine_test"], undefined);
  assert.equal(mockDb["users/user1/routineMutationReceipts/staged_receipt_test"], undefined);
  assert.deepEqual(mockDb, initialDbBeforeRollback);

  // Obriši privremene podatke specifične za recovery i corrupt testove da bi stanje odgovaralo nastavku testa
  delete mockDb[`users/user1/routineMutationReceipts/${corruptMutationId}`];
  delete mockDb[`users/user1/routines/${recoveryRoutineId}`];
  delete mockDb[`users/user1/routineMutationReceipts/${recoveryMutationId}`];
  delete mockDb[`users/user1/routines/${recoveryMismatchRoutineId}`];

  // Novo kreiranje sa novim identitetom i novim mutationId -> stvara drugi dokument
  const secondDraft = controller.initManualDraft({
    title: "Second Routine",
    fullAction: "Second action",
    minimumAction: "Second min",
  });
  const createdSecond = await controller.create("user1", secondDraft);
  assert.equal(createdSecond.id, secondDraft.id);
  assert.equal(Object.keys(mockDb).filter((k) => k.startsWith("users/user1/routines/")).length, 2);
  assert.equal(Object.keys(mockDb).filter((k) => k.startsWith("users/user1/routineMutationReceipts/")).length, 2);

  // ResetGuard blokada: ne piše ni rutinu ni receipt
  blockReset = true;
  const thirdDraft = controller.initManualDraft({ title: "Blocked" });
  try {
    await controller.create("user1", thirdDraft);
    assert.fail("Should throw when reset is blocked");
  } catch (e: any) {
    assert.ok(e.message.includes("reset_in_progress"));
  }
  assert.equal(mockDb[`users/user1/routines/${thirdDraft.id}`], undefined);
  assert.equal(mockDb[`users/user1/routineMutationReceipts/${thirdDraft.mutationId}`], undefined);
  blockReset = false;

  // 36. loadRoutines kanonska normalizacija
  console.log("Running loadRoutines Normalization Tests (36)...");
  mockDb = {};
  // 36a: Nova kompletna rutina
  const modernRoutine: SharedRoutine = {
    ...baseRoutine,
    id: "r_modern",
    estimatedMinutes: 25,
    frequency: { kind: "daily" },
    origin: { kind: "manual" },
    revision: 3,
  };
  mockDb["users/user1/routines/r_modern"] = modernRoutine;

  // 36b: Validna legacy rutina bez estimatedMinutes i bez frequency
  const legacyRoutine = {
    ...baseRoutine,
    id: "r_legacy",
    recurrence: { type: "selected_weekdays", weekdays: [1, 3, 5] },
    // bez estimatedMinutes, frequency, origin, revision
    estimatedMinutes: undefined,
    frequency: undefined,
    origin: undefined,
    revision: undefined,
  };
  mockDb["users/user1/routines/r_legacy"] = legacyRoutine;

  // 36c: Nevalidan dokument
  mockDb["users/user1/routines/r_corrupt"] = {
    id: "r_corrupt",
    title: "", // nevalidno prazan naslov
  };

  const { routines: loaded, diagnostics } = await loadRoutinesWithDiagnostics("user1");
  // Nevalidan dokument ne ruši učitavanje ostalih!
  assert.equal(loaded.length, 2);

  const loadedModern = loaded.find((r) => r.id === "r_modern");
  assert.ok(loadedModern);
  assert.equal(loadedModern.estimatedMinutes, 25);
  assert.equal(loadedModern.revision, 3);

  const loadedLegacy = loaded.find((r) => r.id === "r_legacy");
  assert.ok(loadedLegacy);
  assert.equal(loadedLegacy.needsDuration, true);
  assert.equal(loadedLegacy.needsSchedule, true);
  assert.equal(loadedLegacy.estimatedMinutes, undefined);
  assert.equal(loadedLegacy.frequency, undefined); // nema izmišljanja rasporeda
  assert.equal(loadedLegacy.revision, 0);

  // Dijagnostika beleži preskočen dokument
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].docId, "r_corrupt");
  assert.ok(diagnostics[0].errors.length > 0);

  // Paralelno učitavanje za dva korisnika: dijagnostika ostaje striktno izolovana
  mockDb["users/user2/routines/r_user2_valid"] = { ...baseRoutine, id: "r_user2_valid" };
  const [resUser1, resUser2] = await Promise.all([
    loadRoutinesWithDiagnostics("user1"),
    loadRoutinesWithDiagnostics("user2"),
  ]);
  assert.equal(resUser1.diagnostics.length, 1);
  assert.equal(resUser1.diagnostics[0].docId, "r_corrupt");
  assert.equal(resUser2.diagnostics.length, 0);

  // Učitavanje nije pisalo po bazi (nema side-effect snapshot update-a pri read-u)
  assert.equal(mockDb["users/user1/routines/r_legacy"].revision, undefined);

  // 37. Completion datum, timezone i ponovljeno beleženje
  console.log("Running Completion Date and Timezone Tests (37)...");
  mockDb = {};
  await createRoutine("user1", baseRoutine);

  // Prošli datum je dozvoljen
  await recordRoutineCompletion("user1", {
    routineId: "r1",
    localDate: "2024-01-01",
    status: "full",
    sourceApp: "app_a",
    recordedAt: "2024-01-01T12:00:00.000Z",
    completedAt: "2024-01-01T12:00:00.000Z",
  });
  assert.ok(mockDb["users/user1/routineCompletions/2024-01-01_r1"]);

  // Budući datum je zabranjen i ne piše u bazu
  try {
    await recordRoutineCompletion("user1", {
      routineId: "r1",
      localDate: "2099-01-01",
      status: "full",
      sourceApp: "app_a",
      recordedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }, "Europe/Belgrade");
    assert.fail("Should reject future date");
  } catch (e: any) {
    assert.ok(e.message.includes("completion_future_date_forbidden"));
    assert.equal(mockDb["users/user1/routineCompletions/2099-01-01_r1"], undefined);
  }

  // Prelaz ponoći u Europe/Belgrade:
  // 2026-09-12 22:30:00 UTC je 2026-09-13 00:30:00 u Belgrade (UTC+2)
  const midnightTransitionNow = new Date("2026-09-12T22:30:00.000Z");
  // 2026-09-13 je validan današnji dan za Belgrade u tom trenutku
  await recordRoutineCompletion("user1", {
    routineId: "r1",
    localDate: "2026-09-13",
    status: "full",
    sourceApp: "app_a",
    recordedAt: midnightTransitionNow.toISOString(),
    completedAt: midnightTransitionNow.toISOString(),
  }, "Europe/Belgrade", midnightTransitionNow);
  assert.ok(mockDb["users/user1/routineCompletions/2026-09-13_r1"]);

  // 2026-09-14 je u tom trenutku sutra (budući) i mora biti odbijen
  try {
    await recordRoutineCompletion("user1", {
      routineId: "r1",
      localDate: "2026-09-14",
      status: "full",
      sourceApp: "app_a",
      recordedAt: midnightTransitionNow.toISOString(),
      completedAt: midnightTransitionNow.toISOString(),
    }, "Europe/Belgrade", midnightTransitionNow);
    assert.fail("Should reject 2026-09-14 as future date");
  } catch (e: any) {
    assert.ok(e.message.includes("completion_future_date_forbidden"));
  }

  // Ponovljeno beleženje za isti dan i istu rutinu ne stvara drugi dokument
  await recordRoutineCompletion("user1", {
    routineId: "r1",
    localDate: "2024-01-01",
    status: "minimum",
    sourceApp: "app_a",
    recordedAt: "2024-01-01T15:00:00.000Z",
    completedAt: "2024-01-01T15:00:00.000Z",
  });
  const compKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user1/routineCompletions/"));
  // Zapis za 2024-01-01 je ažuriran na status 'minimum', i nema duplikata
  assert.equal(mockDb["users/user1/routineCompletions/2024-01-01_r1"].status, "minimum");
  assert.equal(compKeys.filter((k) => k === "users/user1/routineCompletions/2024-01-01_r1").length, 1);

  // --- Dodatni testovi za Task 1 Timezone validaciju bez tihog prelaska na UTC ---
  const initialDbBeforeTzTests = JSON.parse(JSON.stringify(mockDb));

  // 1. Eksplicitno nevalidna IANA zona u argumentu mora biti odbijena sa completion_timezone_invalid
  try {
    await recordRoutineCompletion("user1", {
      routineId: "r1",
      localDate: "2024-01-01",
      status: "full",
      sourceApp: "app_a",
      recordedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      timeZone: "Europe/Belgrade",
    }, "Not/A_Real_TimeZone_123");
    assert.fail("Should reject invalid effectiveTimeZone");
  } catch (e: any) {
    assert.ok(e.message.includes("completion_timezone_invalid"));
  }

  // 2. Eksplicitno nevalidna IANA zona u completion.timeZone mora biti odbijena
  try {
    await recordRoutineCompletion("user1", {
      routineId: "r1",
      localDate: "2024-01-01",
      status: "full",
      sourceApp: "app_a",
      recordedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      timeZone: "Invalid/TimeZone_ABC",
    });
    assert.fail("Should reject invalid completion.timeZone");
  } catch (e: any) {
    assert.ok(e.message.includes("completion_timezone_invalid"));
  }

  // 3. Različite zone u argumentu i completion objektu daju completion_timezone_mismatch
  try {
    await recordRoutineCompletion("user1", {
      routineId: "r1",
      localDate: "2024-01-01",
      status: "full",
      sourceApp: "app_a",
      recordedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      timeZone: "America/New_York",
    }, "Europe/Belgrade");
    assert.fail("Should reject mismatched timezones");
  } catch (e: any) {
    assert.ok(e.message.includes("completion_timezone_mismatch"));
  }

  // 4. Legacy poziv bez obe zone dozvoljava UTC fallback za prošli datum
  await recordRoutineCompletion("user1", {
    routineId: "r1",
    localDate: "2024-01-02",
    status: "full",
    sourceApp: "app_a",
    recordedAt: "2024-01-02T12:00:00.000Z",
    completedAt: "2024-01-02T12:00:00.000Z",
  });
  assert.ok(mockDb["users/user1/routineCompletions/2024-01-02_r1"]);

  // 5. Potvrda da nijedan od gore odbijenih slučajeva nije izvršio write u bazu
  assert.equal(mockDb["users/user1/routineCompletions/2024-01-01_r1"].status, "minimum"); // ostao raniji zapis
  assert.equal(mockDb["users/user1/routineCompletions/2099-01-01_r1"], undefined);
  assert.equal(mockDb["users/user1/routineCompletions/2026-09-14_r1"], undefined);

  console.log("routineRepository tests passed!");
}

runRepoTests().catch(e => {
  console.error(e);
  process.exit(1);
});
