import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { getLocalDateInTimeZone } from "./date";
import { getEffectiveTimeZone } from "../settings/preferences";
import { recordRoutineCompletion } from "../../shared/persistence/routines/routineRepository";
import { firestoreAdapter } from "../../shared/persistence/routines/firestoreAdapter";
import type { RoutineCompletion, SharedRoutine } from "../../shared/domain/routines";
import { useDailyRoutines } from "./useDailyRoutines";
import type { PlannedRoutinePersistence } from "./useDailyRoutines";

// Setup global browser DOM environment
const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost",
});

(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function runTimezoneCompletionTests() {
  console.log("Running useDailyRoutines Timezone & Boundary Tests...");

  const mockDb: Record<string, any> = {};

  (firestoreAdapter as any).db = {};
  (firestoreAdapter as any).doc = (_db: any, ...args: string[]) => args.join("/");
  (firestoreAdapter as any).collection = (_db: any, ...args: string[]) => args.join("/");
  (firestoreAdapter as any).query = (c: any) => c;
  (firestoreAdapter as any).where = () => ({});
  (firestoreAdapter as any).getDocs = async (q: string) => {
    const docs = Object.entries(mockDb)
      .filter(([k]) => k.startsWith(q))
      .map(([id, data]) => ({
        id: id.split("/").pop(),
        data: () => JSON.parse(JSON.stringify(data)),
      }));
    return { docs };
  };
  (firestoreAdapter as any).setDoc = async (ref: string, data: any) => {
    mockDb[ref] = JSON.parse(JSON.stringify(data));
  };
  (firestoreAdapter as any).deleteDoc = async (ref: string) => {
    delete mockDb[ref];
  };

  // Scenario requested:
  // Current UTC time: 2026-09-12T22:30:00.000Z
  // Effective timezone: Europe/Belgrade (UTC+2 in DST summer time)
  // Local time in Belgrade: 2026-09-13 00:30:00 -> Local date: 2026-09-13
  const simulatedUtcTime = new Date("2026-09-12T22:30:00.000Z");
  const effectiveTimeZone = "Europe/Belgrade";

  const calculatedLocalDate = getLocalDateInTimeZone(simulatedUtcTime, effectiveTimeZone);
  assert.equal(
    calculatedLocalDate,
    "2026-09-13",
    "Belgrade local date at 22:30 UTC on Sep 12 must be 2026-09-13",
  );

  // 1. Legitimate completion immediately after local midnight in Belgrade
  const completion: RoutineCompletion = {
    routineId: "r_morning_stretch",
    localDate: calculatedLocalDate,
    status: "full",
    sourceApp: "app_a",
    recordedAt: simulatedUtcTime.toISOString(),
    completedAt: simulatedUtcTime.toISOString(),
    timeZone: effectiveTimeZone,
  };

  await recordRoutineCompletion("user_belgrade", completion, effectiveTimeZone, simulatedUtcTime);

  const docPath = "users/user_belgrade/routineCompletions/2026-09-13_r_morning_stretch";
  assert.ok(mockDb[docPath], "Completion document must exist with local date key");
  assert.equal(mockDb[docPath].localDate, "2026-09-13");
  assert.equal(mockDb[docPath].status, "full");
  assert.equal(mockDb[docPath].timeZone, "Europe/Belgrade");

  // 2. Negative check: local date 2026-09-14 is tomorrow in Belgrade at that moment, must be rejected
  const futureCompletion: RoutineCompletion = {
    routineId: "r_morning_stretch",
    localDate: "2026-09-14",
    status: "full",
    sourceApp: "app_a",
    recordedAt: simulatedUtcTime.toISOString(),
    completedAt: simulatedUtcTime.toISOString(),
    timeZone: effectiveTimeZone,
  };

  await assert.rejects(
    async () => {
      await recordRoutineCompletion("user_belgrade", futureCompletion, effectiveTimeZone, simulatedUtcTime);
    },
    (err: any) => {
      assert.ok(err.message.includes("completion_future_date_forbidden"));
      return true;
    },
    "Future local date 2026-09-14 must be rejected",
  );
  assert.equal(mockDb["users/user_belgrade/routineCompletions/2026-09-14_r_morning_stretch"], undefined);

  // 3. Re-recording on same local date updates status without creating a duplicate record
  const updateCompletion: RoutineCompletion = {
    ...completion,
    status: "minimum",
  };
  await recordRoutineCompletion("user_belgrade", updateCompletion, effectiveTimeZone, simulatedUtcTime);
  assert.equal(mockDb[docPath].status, "minimum");

  const matchingKeys = Object.keys(mockDb).filter((k) =>
    k.startsWith("users/user_belgrade/routineCompletions/"),
  );
  assert.equal(matchingKeys.length, 1, "Only one completion document must exist for the date and routine");

  // 4. Actual React Hook Test: mount useDailyRoutines, verify execution, state updates, and payload
  {
    console.log("Running useDailyRoutines Real React Hook Mounting & Recording Tests...");
    const hookUserId = "user_hook_real";

    // Seed an active routine into mockDb
    const seededRoutine: SharedRoutine = {
      id: "r_hook_stretch",
      title: "Morning Stretch",
      fullAction: "Do full stretch",
      minimumAction: "Do mini stretch",
      status: "active",
      recurrence: { type: "daily" },
      activeFrom: "2026-01-01",
      timeZone: "Europe/Belgrade",
      source: "user",
      language: "en",
      sortOrder: 1,
      goalRelationships: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDb[`users/${hookUserId}/routines/r_hook_stretch`] = seededRoutine;

    // Track calls made to setDoc to verify actual completion payload
    const writtenCompletions: Record<string, RoutineCompletion> = {};
    const originalSetDoc = (firestoreAdapter as any).setDoc;
    (firestoreAdapter as any).setDoc = async (ref: string, data: any) => {
      if (ref.includes("routineCompletions")) {
        writtenCompletions[ref] = JSON.parse(JSON.stringify(data));
      }
      return originalSetDoc(ref, data);
    };

    let hookResult: ReturnType<typeof useDailyRoutines>;
    let persistedPlannedIds: string[] = [];
    let plannedToggleCalls = 0;
    let rejectNextPlannedToggle = false;
    let resolvePendingToggle: ((value: string[]) => void) | null = null;
    const plannedPersistence: PlannedRoutinePersistence = {
      load: async () => [...persistedPlannedIds],
      toggle: async (_userId, _localDate, routineId, planned) => {
        plannedToggleCalls++;
        if (rejectNextPlannedToggle) {
          rejectNextPlannedToggle = false;
          throw new Error("offline");
        }
        if (routineId === "r_pending") {
          return await new Promise<string[]>((resolve) => {
            resolvePendingToggle = resolve;
          });
        }
        persistedPlannedIds = planned
          ? Array.from(new Set([...persistedPlannedIds, routineId]))
          : persistedPlannedIds.filter((id) => id !== routineId);
        return [...persistedPlannedIds];
      },
    };
    function HookTestComponent({ userId }: { userId: string }) {
      hookResult = useDailyRoutines(userId, undefined, plannedPersistence);
      return null;
    }

    const container = dom.window.document.getElementById("root")!;
    const root = createRoot(container);

    // Initial mount: triggers loading = true and starts async refresh()
    await act(async () => {
      root.render(React.createElement(HookTestComponent, { userId: hookUserId }));
    });

    // Wait for the async load to populate state
    for (let i = 0; i < 20 && hookResult!.loading; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
      });
    }

    assert.equal(hookResult!.loading, false, "Loading should be false after data fetch");
    assert.equal(hookResult!.routines.length, 1, "Seeded routine should be loaded");
    assert.equal(hookResult!.routines[0].id, "r_hook_stretch");
    assert.equal(hookResult!.completions.length, 0, "Initially completions should be empty");

    // Execute the hook's record callback for 'full' completion
    await act(async () => {
      await hookResult!.record("r_hook_stretch", "full");
    });

    // Verify hook state updated optimistically/reactively
    assert.equal(hookResult!.completions.length, 1, "Completions length in hook state must be 1");
    const recordedInHook = hookResult!.completions[0];
    assert.equal(recordedInHook.routineId, "r_hook_stretch");
    assert.equal(recordedInHook.status, "full");
    assert.ok(recordedInHook.timeZone, "timeZone must be present in completion");
    assert.equal(recordedInHook.sourceApp, "app_a");

    // Verify Firestore adapter was called with correct document path and payload
    const completionRefKeys = Object.keys(writtenCompletions);
    assert.equal(completionRefKeys.length, 1, "Exactly one completion write should have occurred");
    const writtenPayload = writtenCompletions[completionRefKeys[0]];
    assert.equal(writtenPayload.routineId, "r_hook_stretch");
    assert.equal(writtenPayload.status, "full");
    assert.equal(writtenPayload.timeZone, recordedInHook.timeZone);
    assert.equal(writtenPayload.localDate, recordedInHook.localDate);

    // Now update status via hook record callback to 'minimum'
    await act(async () => {
      await hookResult!.record("r_hook_stretch", "minimum");
    });

    assert.equal(hookResult!.completions.length, 1, "Hook state still has 1 completion (updated)");
    assert.equal(hookResult!.completions[0].status, "minimum", "Status must be updated to minimum");

    // Planning persists and the hook adopts the repository result.
    await act(async () => {
      await hookResult!.togglePlannedRoutine("r_hook_stretch", true);
    });
    assert.deepEqual(hookResult!.plannedRoutineIds, ["r_hook_stretch"]);
    assert.deepEqual(persistedPlannedIds, ["r_hook_stretch"]);

    // A failed persistence call must roll the optimistic UI state back.
    rejectNextPlannedToggle = true;
    await act(async () => {
      await hookResult!.togglePlannedRoutine("r_hook_stretch", false);
    });
    assert.deepEqual(hookResult!.plannedRoutineIds, ["r_hook_stretch"]);
    assert.equal(hookResult!.error, "routine_save_failed");

    // A second rapid action is ignored while the first persistence request is pending.
    const callsBeforePending = plannedToggleCalls;
    let firstPending!: Promise<void>;
    await act(async () => {
      firstPending = hookResult!.togglePlannedRoutine("r_pending", true);
      void hookResult!.togglePlannedRoutine("r_other", true);
      await Promise.resolve();
    });
    assert.equal(plannedToggleCalls, callsBeforePending + 1);
    assert.deepEqual(hookResult!.plannedRoutineIds.sort(), ["r_hook_stretch", "r_pending"].sort());
    resolvePendingToggle?.(["r_hook_stretch", "r_pending"]);
    await act(async () => {
      await firstPending;
    });
    assert.deepEqual(hookResult!.plannedRoutineIds.sort(), ["r_hook_stretch", "r_pending"].sort());

    // Clean up
    (firestoreAdapter as any).setDoc = originalSetDoc;
    await act(async () => {
      root.unmount();
    });
  }

  console.log("useDailyRoutines Timezone & Boundary Tests passed.");
}

runTimezoneCompletionTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
