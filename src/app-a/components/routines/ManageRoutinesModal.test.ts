import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { firestoreAdapter } from "../../../shared/persistence/routines/firestoreAdapter";
import ManageRoutinesModal from "./ManageRoutinesModal";
import type { SharedRoutine } from "../../../shared/domain/routines";

// Setup global browser DOM environment
const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost",
});

(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
(globalThis as any).HTMLInputElement = dom.window.HTMLInputElement;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function changeInputValue(input: any, value: string) {
  const propsKey = Object.keys(input).find((k) => k.startsWith("__reactProps$"));
  if (propsKey && input[propsKey]?.onChange) {
    input[propsKey].onChange({ target: { value } });
  } else {
    input.value = value;
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  }
}

async function runManageRoutinesModalTests() {
  console.log("Running ManageRoutinesModal Component Lifecycle & Race Protection Tests...");

  let mockDb: Record<string, any> = {};

  (firestoreAdapter as any).db = {};
  (firestoreAdapter as any).doc = (_db: any, ...args: string[]) => args.join("/");
  (firestoreAdapter as any).collection = (_db: any, ...args: string[]) => args.join("/");
  (firestoreAdapter as any).runTransaction = async (db: any, cb: any) => {
    const stagingWrites: Record<string, any> = {};
    const stagingDeletes: Set<string> = new Set();
    const transaction = {
      get: async (ref: string) => {
        if (stagingDeletes.has(ref)) return { exists: () => false, data: () => null };
        if (ref in stagingWrites) return { exists: () => true, data: () => JSON.parse(JSON.stringify(stagingWrites[ref])) };
        return { exists: () => ref in mockDb, data: () => (mockDb[ref] ? JSON.parse(JSON.stringify(mockDb[ref])) : null) };
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
    await cb(transaction);
    for (const ref of stagingDeletes) delete mockDb[ref];
    for (const [ref, data] of Object.entries(stagingWrites)) mockDb[ref] = data;
  };

  const sampleRoutine: SharedRoutine = {
    id: "r_existing_1",
    title: "Read Book",
    fullAction: "Read 20 pages",
    minimumAction: "Read 5 pages",
    status: "active",
    recurrence: { type: "daily" },
    activeFrom: "2026-01-01",
    timeZone: "UTC",
    source: "user",
    language: "en",
    sortOrder: 1,
    revision: 1,
    goalRelationships: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // --- Test 1: Real Component Render, Form Display, and Creation ---
  {
    mockDb = {};
    const container = dom.window.document.getElementById("root")!;
    const root = createRoot(container);
    let changedFired = 0;
    let closedFired = 0;

    await act(async () => {
      root.render(
        React.createElement(ManageRoutinesModal, {
          userId: "user_test_1",
          language: "en",
          routines: [sampleRoutine],
          onClose: () => { closedFired++; },
          onChanged: () => { changedFired++; },
        }),
      );
    });

    // Verify existing routine is displayed in DOM
    assert.ok(container.textContent?.includes("Read Book"));
    assert.ok(container.textContent?.includes("Add Routine"));

    // Click "Add Routine"
    const addBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Add Routine"),
    );
    assert.ok(addBtn, "Add Routine button must exist");

    await act(async () => {
      addBtn?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // Inputs should now be present
    const inputs = Array.from(container.querySelectorAll("input"));
    assert.ok(inputs.length >= 3, "Form inputs must appear");

    // Fill title
    const titleInput = inputs.find((i) => i.placeholder === "Title");
    assert.ok(titleInput, "Title input must exist");

    await act(async () => {
      changeInputValue(titleInput, "New Exercise Routine");
    });

    // Click Save
    const saveBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    );
    assert.ok(saveBtn, "Save button must exist");
    assert.equal(saveBtn.disabled, false, "Save button must be enabled after entering title");

    await act(async () => {
      saveBtn?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // Verification: onChanged was called and routine document was written in Firestore
    assert.equal(changedFired, 1, "onChanged callback must be invoked after successful create");
    const routineKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user_test_1/routines/"));
    assert.equal(routineKeys.length, 1);
    const createdRoutine = mockDb[routineKeys[0]];
    assert.equal(createdRoutine.title, "New Exercise Routine");
    assert.equal(createdRoutine.fullAction, "New Exercise Routine");

    // Clean up component
    await act(async () => {
      root.unmount();
    });
  }

  // --- Test 2: Double Click / Rapid Inflight Click Protection ---
  {
    mockDb = {};
    const container = dom.window.document.getElementById("root")!;
    const root = createRoot(container);
    let changedFired = 0;

    await act(async () => {
      root.render(
        React.createElement(ManageRoutinesModal, {
          userId: "user_test_rapid",
          language: "en",
          routines: [],
          onClose: () => {},
          onChanged: () => { changedFired++; },
        }),
      );
    });

    // Open create form
    const addBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Add Routine"),
    );
    await act(async () => {
      addBtn?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const titleInput = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title")!;
    await act(async () => {
      changeInputValue(titleInput, "Rapid Routine");
    });

    const saveBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    )!;

    // Simulate 3 rapid clicks synchronously in the same event turn
    await act(async () => {
      saveBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      saveBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      saveBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // Only 1 save must have been processed, exactly 1 routine created, 1 receipt created
    assert.equal(changedFired, 1, "Only single creation should execute for rapid clicks");
    const routineKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user_test_rapid/routines/"));
    assert.equal(routineKeys.length, 1, "Only 1 routine doc should exist");
    const receiptKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user_test_rapid/routineMutationReceipts/"));
    assert.equal(receiptKeys.length, 1, "Only 1 receipt doc should exist");

    await act(async () => {
      root.unmount();
    });
  }

  // --- Test 3: Unmount During Inflight Create/Save Protects Against State Updates & Callback ---
  {
    mockDb = {};
    const container = dom.window.document.getElementById("root")!;
    const root = createRoot(container);
    let changedFired = 0;

    let resolveTransaction: () => void = () => {};
    const originalRunTxn = (firestoreAdapter as any).runTransaction;

    // We make transaction hang until we resolve it
    (firestoreAdapter as any).runTransaction = async (db: any, cb: any) => {
      await new Promise<void>((resolve) => {
        resolveTransaction = resolve;
      });
      return originalRunTxn(db, cb);
    };

    await act(async () => {
      root.render(
        React.createElement(ManageRoutinesModal, {
          userId: "user_test_unmount",
          language: "en",
          routines: [],
          onClose: () => {},
          onChanged: () => { changedFired++; },
        }),
      );
    });

    // Open create form and enter title
    const addBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Add Routine"),
    );
    await act(async () => {
      addBtn?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const titleInput = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title")!;
    await act(async () => {
      changeInputValue(titleInput, "Unmounted Routine");
    });

    const saveBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    )!;

    // Trigger save (now hanging in transaction)
    act(() => {
      saveBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // Unmount component while save is still pending!
    await act(async () => {
      root.unmount();
    });

    // Now resolve the backend transaction
    await act(async () => {
      resolveTransaction();
      // Allow any microtasks to settle
      await new Promise((r) => setTimeout(r, 20));
    });

    // Because the component unmounted, onChanged MUST NOT be called!
    assert.equal(changedFired, 0, "onChanged must NOT be called when unmounted during pending operation");

    // Restore original transaction adapter
    (firestoreAdapter as any).runTransaction = originalRunTxn;
  }

  // --- Test 4: Error Handling and Safe Retry ---
  {
    mockDb = {};
    const container = dom.window.document.getElementById("root")!;
    const root = createRoot(container);
    let changedFired = 0;

    let shouldFail = true;
    const originalRunTxn = (firestoreAdapter as any).runTransaction;
    (firestoreAdapter as any).runTransaction = async (db: any, cb: any) => {
      if (shouldFail) {
        throw new Error("simulated_network_error");
      }
      return originalRunTxn(db, cb);
    };

    await act(async () => {
      root.render(
        React.createElement(ManageRoutinesModal, {
          userId: "user_test_retry",
          language: "en",
          routines: [],
          onClose: () => {},
          onChanged: () => { changedFired++; },
        }),
      );
    });

    // Open create form and enter title
    const addBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Add Routine"),
    );
    await act(async () => {
      addBtn?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const titleInput = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title")!;
    await act(async () => {
      changeInputValue(titleInput, "Retryable Routine");
    });

    const saveBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    )!;

    // First attempt fails
    await act(async () => {
      saveBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // Error message displayed: RoutineManagementController wraps repository error:
    // create_failed:error (or the inner error message)
    assert.ok(
      container.textContent?.includes("create_failed") || container.textContent?.includes("simulated_network_error"),
      "Error text must be displayed in the modal",
    );
    assert.equal(changedFired, 0, "onChanged must not fire when creation fails");

    // Now allow network to succeed and retry
    shouldFail = false;
    const retrySaveBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    )!;

    await act(async () => {
      retrySaveBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    assert.equal(changedFired, 1, "onChanged must be fired upon successful retry");
    const routineKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user_test_retry/routines/"));
    assert.equal(routineKeys.length, 1);

    (firestoreAdapter as any).runTransaction = originalRunTxn;
    await act(async () => {
      root.unmount();
    });
  }

  // --- Test 5 (Mandatory Gate Test 1): Pending Draft A -> Cancel/Open Draft B -> Late Success A ---
  {
    console.log("Running Test 5: Draft A pending -> Cancel/Open Draft B -> Late Success A...");
    mockDb = {};
    const container = dom.window.document.getElementById("root")!;
    const root = createRoot(container);
    let changedFired = 0;
    let closedFired = 0;

    let resolveTransactionA: () => void = () => {};
    let draftACaptured: SharedRoutine | null = null;
    let draftBCaptured: SharedRoutine | null = null;

    const originalRunTxn = (firestoreAdapter as any).runTransaction;
    let isRequestA = true;

    (firestoreAdapter as any).runTransaction = async (db: any, cb: any) => {
      if (isRequestA) {
        // Intercept Draft A to extract its saved routine object and hang until manually released
        return new Promise<void>((resolve, reject) => {
          resolveTransactionA = async () => {
            try {
              await originalRunTxn(db, async (txn: any) => {
                const origSet = txn.set;
                txn.set = (ref: string, data: any) => {
                  if (ref.includes("/routines/")) {
                    draftACaptured = data;
                  }
                  origSet(ref, data);
                };
                return cb(txn);
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          };
        });
      }
      return originalRunTxn(db, async (txn: any) => {
        const origSet = txn.set;
        txn.set = (ref: string, data: any) => {
          if (ref.includes("/routines/")) {
            draftBCaptured = data;
          }
          origSet(ref, data);
        };
        return cb(txn);
      });
    };

    await act(async () => {
      root.render(
        React.createElement(ManageRoutinesModal, {
          userId: "user_race_success",
          language: "en",
          routines: [],
          onClose: () => { closedFired++; },
          onChanged: () => { changedFired++; },
        }),
      );
    });

    // 1. User opens draft A
    const addBtnA = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Add Routine"),
    )!;
    await act(async () => {
      addBtnA.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // Type title for Draft A
    const titleInputA = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title")!;
    await act(async () => {
      changeInputValue(titleInputA, "Draft A Routine");
    });

    // 2. Click Save for Draft A (hangs in runTransaction)
    const saveBtnA = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    )!;

    // Track write to inspect Draft A identity
    const origSet = (firestoreAdapter as any).runTransaction;
    act(() => {
      saveBtnA.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // 3. User cancels Draft A via Cancel button while Save A is pending
    const cancelBtnA = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cancel"),
    )!;
    await act(async () => {
      cancelBtnA.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // Confirm that the form closed back to the routine list view
    assert.ok(container.textContent?.includes("Add Routine"), "Modal returned to routine list");

    // 4. User opens new Draft B
    isRequestA = false; // Next request will be Draft B
    const addBtnB = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Add Routine"),
    )!;
    await act(async () => {
      addBtnB.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // 5. Fill Draft B with distinctive title
    const titleInputB = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title")!;
    await act(async () => {
      changeInputValue(titleInputB, "Draft B Routine Distinctive");
    });

    // Verify Draft B title is displayed in input
    assert.equal(titleInputB.value, "Draft B Routine Distinctive");

    // 6. Now resolve the stale pending backend Promise for Draft A
    await act(async () => {
      resolveTransactionA();
      await new Promise((r) => setTimeout(r, 20));
    });

    // Verification:
    // - Draft B must remain open and visible
    const activeTitleInputAfterLateA = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title");
    assert.ok(activeTitleInputAfterLateA, "Draft B form must remain open and active");
    assert.equal(activeTitleInputAfterLateA.value, "Draft B Routine Distinctive", "Draft B title must remain intact");

    // - Stale success A must NOT invoke onChanged in the context of the active modal
    assert.equal(changedFired, 0, "Stale success A must NOT trigger onChanged callback");

    // - Modal must NOT be closed
    assert.equal(closedFired, 0, "Modal must remain open");

    // - Save button for Draft B must be enabled and active (not locked by A)
    const saveBtnB = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    )!;
    assert.equal(saveBtnB.disabled, false, "Draft B save button must be enabled");

    // 7. Save Draft B and verify it completes cleanly with separate identity
    await act(async () => {
      saveBtnB.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    assert.equal(changedFired, 1, "onChanged must fire once when Draft B saves successfully");

    // Verify written routines in mockDb: both A (from server persistence) and B exist, with distinct IDs
    const routineKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user_race_success/routines/"));
    assert.equal(routineKeys.length, 2, "Both Routine A and Routine B are saved with distinct IDs");

    const savedA = Object.values(mockDb).find((doc: any) => doc.title === "Draft A Routine");
    const savedB = Object.values(mockDb).find((doc: any) => doc.title === "Draft B Routine Distinctive");
    assert.ok(savedA, "Routine A was persisted to DB");
    assert.ok(savedB, "Routine B was persisted to DB");
    assert.ok(draftACaptured, "Draft A routine was captured in create call");
    assert.ok(draftBCaptured, "Draft B routine was captured in create call");
    assert.equal((draftACaptured as any).id, savedA.id);
    assert.equal((draftBCaptured as any).id, savedB.id);
    assert.notEqual(savedA.id, savedB.id, "Routine A and B must have different IDs");
    assert.notEqual(savedA.mutationId, savedB.mutationId, "Routine A and B must have different mutationIds");

    (firestoreAdapter as any).runTransaction = originalRunTxn;
    await act(async () => {
      root.unmount();
    });
  }

  // --- Test 6 (Mandatory Gate Test 2): Pending Draft A -> Cancel/Open Draft B -> Late Error A ---
  {
    console.log("Running Test 6: Draft A pending -> Cancel/Open Draft B -> Late Error A...");
    mockDb = {};
    const container = dom.window.document.getElementById("root")!;
    const root = createRoot(container);
    let changedFired = 0;
    let closedFired = 0;

    let rejectTransactionA: (err: any) => void = () => {};
    let draftBCaptured: SharedRoutine | null = null;
    const originalRunTxn = (firestoreAdapter as any).runTransaction;
    let isRequestA = true;

    (firestoreAdapter as any).runTransaction = async (db: any, cb: any) => {
      if (isRequestA) {
        return new Promise<void>((_resolve, reject) => {
          rejectTransactionA = reject;
        });
      }
      return originalRunTxn(db, async (txn: any) => {
        const origSet = txn.set;
        txn.set = (ref: string, data: any) => {
          if (ref.includes("/routines/")) {
            draftBCaptured = data;
          }
          origSet(ref, data);
        };
        return cb(txn);
      });
    };

    await act(async () => {
      root.render(
        React.createElement(ManageRoutinesModal, {
          userId: "user_race_error",
          language: "en",
          routines: [],
          onClose: () => { closedFired++; },
          onChanged: () => { changedFired++; },
        }),
      );
    });

    // 1. Open Draft A
    const addBtnA = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Add Routine"),
    )!;
    await act(async () => {
      addBtnA.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const titleInputA = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title")!;
    await act(async () => {
      changeInputValue(titleInputA, "Draft A Failing Routine");
    });

    // 2. Click Save for Draft A (hangs in pending Promise)
    const saveBtnA = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    )!;
    act(() => {
      saveBtnA.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // 3. User cancels Draft A while Save A is pending
    const cancelBtnA = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cancel"),
    )!;
    await act(async () => {
      cancelBtnA.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // 4. User opens new Draft B
    isRequestA = false;
    const addBtnB = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Add Routine"),
    )!;
    await act(async () => {
      addBtnB.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    // 5. Fill Draft B
    const titleInputB = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title")!;
    await act(async () => {
      changeInputValue(titleInputB, "Draft B Safe From Error");
    });

    // 6. Now reject stale Promise for Draft A with an explicit simulated failure
    await act(async () => {
      rejectTransactionA(new Error("simulated_stale_network_crash_A"));
      await new Promise((r) => setTimeout(r, 20));
    });

    // Verification:
    // - Draft B form must remain open and unaffected
    const activeTitleInputAfterLateError = Array.from(container.querySelectorAll("input")).find((i) => i.placeholder === "Title");
    assert.ok(activeTitleInputAfterLateError, "Draft B form must remain open");
    assert.equal(activeTitleInputAfterLateError.value, "Draft B Safe From Error");

    // - The error from A must NOT be displayed in Draft B
    assert.equal(
      container.textContent?.includes("simulated_stale_network_crash_A"),
      false,
      "Late error from Draft A must NOT be shown in Draft B",
    );

    // - Draft B is not locked or unlocked by A's finally block; Save button remains active and functional
    const saveBtnB = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Save"),
    )!;
    assert.equal(saveBtnB.disabled, false, "Draft B save button must remain enabled");

    // 7. Save Draft B and verify normal completion
    await act(async () => {
      saveBtnB.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    assert.equal(changedFired, 1, "onChanged fires when Draft B is saved");
    const routineKeys = Object.keys(mockDb).filter((k) => k.startsWith("users/user_race_error/routines/"));
    assert.equal(routineKeys.length, 1, "Only Draft B is persisted");
    const savedRoutineB = mockDb[routineKeys[0]];
    assert.equal(savedRoutineB.title, "Draft B Safe From Error");

    (firestoreAdapter as any).runTransaction = originalRunTxn;
    await act(async () => {
      root.unmount();
    });
  }

  console.log("ManageRoutinesModal Component Lifecycle & Race Protection Tests passed!");
}

runManageRoutinesModalTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
