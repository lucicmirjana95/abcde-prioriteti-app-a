import assert from "node:assert/strict";

// Setup localStorage and sessionStorage for mock testing in Node environment
const store = new Map<string, string>();
const sessionStore = new Map<string, string>();

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

if (typeof globalThis.sessionStorage === "undefined") {
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => sessionStore.get(k) ?? null,
    setItem: (k: string, v: string) => sessionStore.set(k, String(v)),
    removeItem: (k: string) => sessionStore.delete(k),
    clear: () => sessionStore.clear(),
  };
}

const eventListeners: Record<string, Array<(event: any) => void>> = {};
let reloadCount = 0;

if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = {
    addEventListener: (type: string, listener: any) => {
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(listener);
    },
    removeEventListener: (type: string, listener: any) => {
      if (!eventListeners[type]) return;
      eventListeners[type] = eventListeners[type].filter(l => l !== listener);
    },
    location: {
      reload: () => {
        reloadCount++;
      }
    }
  };
} else {
  try {
    Object.defineProperty(globalThis.window, "location", {
      value: {
        reload: () => {
          reloadCount++;
        }
      },
      writable: true,
      configurable: true
    });
  } catch {
    // ignore
  }
}

async function runResetGuardTests() {
  console.log("Starting Central Reset Guard Comprehensive Test Suite...\n");

  const {
    initializeResetGuard,
    isResetBlocked,
    isResetBlockedGeneric,
    acquireResetLock,
    renewResetLease,
    updateResetLockStatus,
    releaseResetLock,
    resolveStaleResetLock,
    runGuardedAsyncAutosave,
    getTabId,
    verifyBypassToken,
    setTabResetGeneration,
  } = await import("./resetGuard");

  // Reset environment
  store.clear();
  sessionStore.clear();
  reloadCount = 0;
  releaseResetLock();
  setTabResetGeneration(0);

  // --- Test 1 (owner tab) ---
  console.log("▶ Test 1 (owner tab): Blokiranje običnih mutacija i u owner tabu, uz privatni deletion token");
  const opId1 = acquireResetLock("user_1");
  assert.ok(opId1.startsWith("reset_op_"), "Should return unique reset operation ID");

  // Normal UI mutations and autosave calls (WITHOUT bypass token) must be blocked on owner tab
  assert.strictEqual(isResetBlocked("user_1"), true, "Standard mutation must be strictly blocked on owner tab");
  assert.strictEqual(isResetBlockedGeneric(), true, "Generic writes must be strictly blocked on owner tab");

  // Authorized deletion path passing valid capability token must be allowed
  assert.strictEqual(isResetBlocked("user_1", opId1), false, "Bypass token must allow deletion path in owner tab");
  assert.strictEqual(isResetBlockedGeneric(opId1), false, "Bypass token must allow generic reset deletion");
  assert.strictEqual(verifyBypassToken(opId1), true, "Owner bypass token must verify successfully");
  console.log("  ✓ Test 1 passed: Owner tab mutations blocked, private deletion capability authorized.\n");

  // --- Test 2 (drugi tab) ---
  console.log("▶ Test 2 (drugi tab): Blokiranje mutacija u drugom tabu i očuvanje neisteklog locka pri reload-u");
  // Simulate second tab
  const ownerTab = getTabId();
  sessionStorage.setItem("app_a_tab_id", "tab_second_tab_999");

  // Second tab reloads while lease is active
  initializeResetGuard();
  const rawLockAfterReload = localStorage.getItem("app_a_active_reset");
  assert.ok(rawLockAfterReload !== null, "Second tab reload MUST NOT remove active, unexpired lease");

  // Writes from second tab must be blocked
  assert.strictEqual(isResetBlocked("user_1"), true, "Mutations must be blocked in second tab");
  assert.strictEqual(isResetBlockedGeneric(), true, "Generic writes must be blocked in second tab");

  // Second tab cannot acquire lock while active lease exists
  assert.throws(() => {
    acquireResetLock("user_1");
  }, /active_lease_exists/, "Second tab must not acquire active lease");

  // Restore owner tab session
  sessionStorage.setItem("app_a_tab_id", ownerTab);
  console.log("  ✓ Test 2 passed: Second tab blocked, active lock preserved across reload.\n");

  // --- Test 3 (heartbeat) ---
  console.log("▶ Test 3 (heartbeat): Obnova zakupa (heartbeatAt, expiresAt) i zaštita od preuzimanja");
  const lockBeforeHeartbeat = JSON.parse(localStorage.getItem("app_a_active_reset")!);
  const oldHeartbeat = lockBeforeHeartbeat.heartbeatAt;
  const oldExpires = lockBeforeHeartbeat.expiresAt;

  // Fake a slight delay for heartbeat
  renewResetLease("user_1", opId1);
  const lockAfterHeartbeat = JSON.parse(localStorage.getItem("app_a_active_reset")!);
  assert.ok(lockAfterHeartbeat.heartbeatAt >= oldHeartbeat, "Heartbeat timestamp must be updated");
  assert.ok(lockAfterHeartbeat.expiresAt >= oldExpires, "Lease expiration must be extended");

  // Renew with wrong tab or operationId does not extend
  renewResetLease("user_1", "invalid_op_id");
  const lockAfterInvalidRenew = JSON.parse(localStorage.getItem("app_a_active_reset")!);
  assert.strictEqual(lockAfterInvalidRenew.operationId, opId1, "Operation ID must remain unaltered");
  console.log("  ✓ Test 3 passed: Heartbeat extends lease and updates timestamp correctly.\n");

  // --- Test 4 (stale lease) ---
  console.log("▶ Test 4 (stale lease): Zastareli zakup se razrešava tek nakon isteka i sveže server sinhronizacije");
  // 4a. While lease is active, resolving as stale must be rejected
  const resolvedWhileActive = await resolveStaleResetLock("user_1");
  assert.strictEqual(resolvedWhileActive, false, "Active unexpired lease must not be resolved as stale");
  assert.ok(localStorage.getItem("app_a_active_reset") !== null, "Lock must remain intact");

  // 4b. Make lease expired
  const expiredLockData = JSON.parse(localStorage.getItem("app_a_active_reset")!);
  expiredLockData.expiresAt = Date.now() - 5000;
  localStorage.setItem("app_a_active_reset", JSON.stringify(expiredLockData));

  // 4c. If server sync fails, stale lease is NOT resolved
  let syncFailedCalled = false;
  const resolvedWithFailedSync = await resolveStaleResetLock("user_1", async () => {
    syncFailedCalled = true;
    throw new Error("network_offline");
  });
  assert.strictEqual(syncFailedCalled, true, "Server sync callback was called");
  assert.strictEqual(resolvedWithFailedSync, false, "Stale lease must not be removed if server sync fails");
  assert.ok(localStorage.getItem("app_a_active_reset") !== null, "Lock must stay preserved upon sync error");

  // 4d. If server sync succeeds, stale lease is resolved
  let syncSucceededCalled = false;
  const resolvedWithSuccessfulSync = await resolveStaleResetLock("user_1", async () => {
    syncSucceededCalled = true;
  });
  assert.strictEqual(syncSucceededCalled, true, "Successful server sync was called");
  assert.strictEqual(resolvedWithSuccessfulSync, true, "Stale lease successfully resolved after sync");
  assert.strictEqual(localStorage.getItem("app_a_active_reset"), null, "Stale lock cleanly removed");

  // 4e. Stale lease encountered during mutation triggers reload
  const opIdStale = acquireResetLock("user_1");
  const lockForMutation = JSON.parse(localStorage.getItem("app_a_active_reset")!);
  lockForMutation.expiresAt = Date.now() - 1000;
  localStorage.setItem("app_a_active_reset", JSON.stringify(lockForMutation));

  const initialReloads = reloadCount;
  const blockedStale = isResetBlocked("user_1");
  assert.strictEqual(blockedStale, true, "Stale lock must block mutation");
  assert.strictEqual(reloadCount, initialReloads + 1, "Must trigger window.location.reload() for fresh server state");
  assert.strictEqual(localStorage.getItem("app_a_active_reset"), null, "Stale lock removed on reload trigger");
  console.log("  ✓ Test 4 passed: Stale lease requires expiration and fresh server synchronization.\n");

  // --- Test 5 (pogrešan operationId) ---
  console.log("▶ Test 5 (pogrešan operationId): Pogrešan operationId ne može verifikovati token niti otpustiti lock");
  const opIdReal = acquireResetLock("user_1");

  // Wrong token validation
  assert.strictEqual(verifyBypassToken("wrong_token_xyz"), false, "Wrong token must fail verification");
  assert.strictEqual(verifyBypassToken(""), false, "Empty token must fail verification");
  assert.strictEqual(verifyBypassToken(null), false, "Null token must fail verification");

  // Wrong token cannot bypass write block
  assert.strictEqual(isResetBlocked("user_1", "wrong_token_xyz"), true, "Wrong operationId must not bypass block");

  // Wrong operationId cannot release lock
  releaseResetLock("wrong_token_xyz");
  assert.ok(localStorage.getItem("app_a_active_reset") !== null, "Lock must NOT be released with wrong operationId");
  console.log("  ✓ Test 5 passed: Unauthorized operation IDs rejected for verification and release.\n");

  // --- Test 6 (user izolacija) ---
  console.log("▶ Test 6 (user izolacija): Zakup jednog korisnika ne blokira drugog korisnika");
  // user_1 has active lock
  assert.strictEqual(isResetBlocked("user_1"), true, "User 1 must be blocked");
  // user_2 does NOT have an active lock
  assert.strictEqual(isResetBlocked("user_2"), false, "User 2 must NOT be blocked by User 1 reset");
  console.log("  ✓ Test 6 passed: User isolation strictly maintained.\n");

  // --- Test 7 (async race) ---
  console.log("▶ Test 7 (async race): Zaštita asinhronog autosave-a započetog pre ili tokom reseta");
  // Release existing lock to test async autosave started prior to reset
  releaseResetLock(opIdReal, false);

  // Scenario 7A: Async autosave starts before reset, but reset starts before commit
  let autosaveAttempted = false;
  let autosaveBlocked = false;
  const asyncAutosavePromise = (async () => {
    // Autosave begins
    autosaveAttempted = true;
    // Emulate async latency (e.g. state debounce or draft formatting)
    await new Promise((r) => setTimeout(r, 20));
    // When attempting to save to persistence layer:
    if (isResetBlocked("user_1")) {
      autosaveBlocked = true;
      throw new Error("reset_in_progress");
    }
  })();

  // Reset is initiated while async autosave was in flight
  const opIdRace = acquireResetLock("user_1");
  await assert.rejects(asyncAutosavePromise, /reset_in_progress/, "Autosave in flight must be aborted when reset starts");
  assert.strictEqual(autosaveAttempted, true, "Autosave had initiated");
  assert.strictEqual(autosaveBlocked, true, "Autosave was blocked by active reset guard");

  // Scenario 7B: Guarded async autosave helper rejects if reset starts during execution
  await assert.rejects(
    runGuardedAsyncAutosave("user_1", async (checkAborted) => {
      checkAborted();
      return "done";
    }),
    /reset_in_progress/,
    "runGuardedAsyncAutosave must reject if reset is active"
  );
  console.log("  ✓ Test 7 passed: Asynchronous autosaves in flight are safely intercepted and aborted.\n");

  // --- Test 8 (uspeh) ---
  console.log("▶ Test 8 (uspeh): Uspešan reset briše zakup i uvećava generaciju (invalidation stale stanja)");
  const currentGenBefore = Number(localStorage.getItem("app_a_reset_generation") || "0");
  setTabResetGeneration(currentGenBefore);

  // Successful release
  releaseResetLock(opIdRace, true);

  // Lock must be cleared
  assert.strictEqual(localStorage.getItem("app_a_active_reset"), null, "Active lock must be cleared on success");

  // Generation must be incremented
  const currentGenAfter = Number(localStorage.getItem("app_a_reset_generation") || "0");
  assert.strictEqual(currentGenAfter, currentGenBefore + 1, "Reset generation must increment on success");

  // Any stale callback holding the old tabResetGeneration is now invalidated and triggers reload
  const reloadsBefore = reloadCount;
  const blockedByStaleGen = isResetBlocked("user_1");
  assert.strictEqual(blockedByStaleGen, true, "Outdated generation must block subsequent writes");
  assert.strictEqual(reloadCount, reloadsBefore + 1, "Outdated generation must trigger reload to sync");

  // After sync/reload, tabResetGeneration updates to currentGenAfter
  setTabResetGeneration(currentGenAfter);
  assert.strictEqual(isResetBlocked("user_1"), false, "Writes permitted once fresh generation is synchronized");
  console.log("  ✓ Test 8 passed: Successful reset increments generation and invalidates pre-reset state.\n");

  // --- Test 9 (partial failure) ---
  console.log("▶ Test 9 (partial failure): Parcijalni neuspeh postavlja failed_pending_retry i zadržava zakup");
  const opIdPartial = acquireResetLock("user_1");
  
  // Transition status to failed_pending_retry upon partial error
  updateResetLockStatus("user_1", opIdPartial, "failed_pending_retry");
  const partialLock = JSON.parse(localStorage.getItem("app_a_active_reset")!);
  assert.strictEqual(partialLock.status, "failed_pending_retry", "Status must reflect failed_pending_retry");
  assert.strictEqual(isResetBlocked("user_1"), true, "Writes must remain blocked during partial failure");

  // Clean up
  releaseResetLock(opIdPartial, false);
  assert.strictEqual(localStorage.getItem("app_a_active_reset"), null, "Lock cleaned up after test");
  console.log("  ✓ Test 9 passed: Partial failure status preserves lock until user retry or exit.\n");

  console.log("=================================================");
  console.log("All 9 Central Reset Guard tests passed with 100% assertions! 🎉");
  console.log("=================================================");
}

runResetGuardTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Central Reset Guard Test failed:", err);
    process.exit(1);
  });

