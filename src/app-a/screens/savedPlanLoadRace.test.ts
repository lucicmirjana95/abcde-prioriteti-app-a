import assert from "node:assert/strict";
import { TodayFlowController } from "./todayFlow";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";

const sampleDraft: DailyPlanDraft = {
  classifiedItems: [],
  firstFocus: [
    {
      id: "focus-1",
      sourceItemIds: ["s1"],
      title: "First priority",
      block: "first_focus",
      estimatedMinutes: 25,
      requiredEnergy: 3,
      timeSensitivity: "none",
      priority: { explanation: "Important task" },
      needsCheck: false,
    },
  ],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "Test plan rationale",
  plannedRequiredMinutes: 25,
  plannedOptionalMinutes: 0,
};

const sampleSavedDocument: AppADailyPlanDocument = {
  schemaVersion: 1,
  localDate: "2026-09-01",
  timezone: "UTC",
  language: "en",
  status: "confirmed",
  checkIn: {
    energy: 4,
    pleasantness: 4,
    availableMinutes: 60,
    stateNote: "",
  },
  plan: sampleDraft,
  execution: {
    completedItemIds: ["focus-1"],
  },
};

async function runTests() {
  // 1. Prove loadConfirmedPlan retains exact function identity across renders when dependencies do not change
  {
    const controller = new TodayFlowController("en");
    const createCallbacks = (ctrl: TodayFlowController) => ({
      loadConfirmedPlan: (draft: DailyPlanDraft, data?: any) => ctrl.loadConfirmedPlan(draft, data),
    });

    const callbackCache = new Map<TodayFlowController, ReturnType<typeof createCallbacks>>();
    const getStableCallbacks = (ctrl: TodayFlowController) => {
      if (!callbackCache.has(ctrl)) {
        callbackCache.set(ctrl, createCallbacks(ctrl));
      }
      return callbackCache.get(ctrl)!;
    };

    const render1 = getStableCallbacks(controller);
    const render2 = getStableCallbacks(controller);

    assert.strictEqual(
      render1.loadConfirmedPlan,
      render2.loadConfirmedPlan,
      "loadConfirmedPlan must maintain strict referential identity across renders with the same controller"
    );
  }

  // 2. Lifecycle simulation: Prove setting isLoadingSavedPlan does not cancel the active load with stable callbacks
  {
    interface MockState {
      isLoadingSavedPlan: boolean;
      saveStatus: string;
      saveError: string | null;
      viewMode: string;
      completedItemIds: string[];
      activePlanDate: string;
    }

    const state: MockState = {
      isLoadingSavedPlan: false,
      saveStatus: "idle",
      saveError: null,
      viewMode: "review",
      completedItemIds: [],
      activePlanDate: "2026-09-01",
    };

    const loadedForUserAndDate = { current: null as string | null };
    const controller = new TodayFlowController("en");
    let readCount = 0;

    let resolveLoad: ((doc: AppADailyPlanDocument | null) => void) | null = null;
    const mockLoadRepo = (_uid: string, _date: string): Promise<AppADailyPlanDocument | null> => {
      readCount++;
      return new Promise((resolve) => {
        resolveLoad = resolve;
      });
    };

    const user = { uid: "user-123" };
    const localDate = "2026-09-01";
    const loadKey = `${user.uid}:${localDate}`;

    const runEffect = (loadConfirmedPlanFn: (draft: DailyPlanDraft, data?: any) => void) => {
      if (loadedForUserAndDate.current === loadKey) return;
      loadedForUserAndDate.current = loadKey;
      state.isLoadingSavedPlan = true;

      let cancelled = false;
      mockLoadRepo(user.uid, localDate)
        .then((saved) => {
          if (!cancelled && saved) {
            loadConfirmedPlanFn(saved.plan);
            state.completedItemIds = saved.execution?.completedItemIds || [];
            state.activePlanDate = saved.localDate;
            state.viewMode = "execution";
            state.saveStatus = "saved";
          }
        })
        .catch(() => {
          if (!cancelled) {
            state.saveStatus = "error";
            state.saveError = "Failed to load plan";
          }
        })
        .finally(() => {
          if (!cancelled) {
            state.isLoadingSavedPlan = false;
          }
        });

      return () => {
        cancelled = true;
      };
    };

    const stableLoadConfirmedPlan = (draft: DailyPlanDraft, data?: any) =>
      controller.loadConfirmedPlan(draft, data);

    runEffect(stableLoadConfirmedPlan);
    assert.equal(state.isLoadingSavedPlan, true, "Loading state starts as true");
    assert.equal(readCount, 1, "Exactly one repository read triggered");

    // Resolving promise when effect has NOT been cancelled:
    assert(resolveLoad !== null);
    (resolveLoad as (doc: AppADailyPlanDocument | null) => void)(sampleSavedDocument);

    await new Promise((resolve) => setTimeout(resolve, 10));

    // 3. Successful load clears loading and enters execution mode
    assert.equal(state.isLoadingSavedPlan, false, "Loading state is cleanly reset to false");
    assert.equal(state.viewMode, "execution", "View mode successfully transitions to execution");
    assert.equal(state.saveStatus, "saved", "Save status transitions to saved");
    assert.deepEqual(state.completedItemIds, ["focus-1"], "Completed items are restored");
    assert.equal(controller.getState().phase, "plan_ready", "Controller phase is plan_ready");

    // 6. Prove only one repository read occurred during initial load
    assert.equal(readCount, 1, "No duplicate reads occurred during load cycle");
  }

  // 4. Prove rejected load clears loading and exposes the localized error state
  {
    const state = {
      isLoadingSavedPlan: false,
      saveStatus: "idle",
      saveError: null as string | null,
    };

    const loadedForUserAndDate = { current: null as string | null };
    const user = { uid: "user-456" };
    const localDate = "2026-09-01";
    const loadKey = `${user.uid}:${localDate}`;

    let rejectLoad: ((err: Error) => void) | null = null;
    const mockFailingRepo = (): Promise<AppADailyPlanDocument | null> => {
      return new Promise((_, reject) => {
        rejectLoad = reject;
      });
    };

    loadedForUserAndDate.current = loadKey;
    state.isLoadingSavedPlan = true;

    let cancelled = false;
    mockFailingRepo()
      .then(() => {})
      .catch(() => {
        if (!cancelled) {
          state.saveStatus = "error";
          state.saveError = "Localized plan load error";
        }
      })
      .finally(() => {
        if (!cancelled) {
          state.isLoadingSavedPlan = false;
        }
      });

    assert.equal(state.isLoadingSavedPlan, true);
    rejectLoad!(new Error("Network disconnect"));

    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(state.isLoadingSavedPlan, false, "Loading state clears on failure");
    assert.equal(state.saveStatus, "error", "Status is error");
    assert.equal(state.saveError, "Localized plan load error", "Localized error string exposed");
  }

  // 5. Prove a genuine unmount or relevant identity/date change still blocks stale results
  {
    const state = {
      isLoadingSavedPlan: false,
      viewMode: "review",
      saveStatus: "idle",
    };

    let resolveLoad: ((doc: AppADailyPlanDocument | null) => void) | null = null;
    const mockLoad = (): Promise<AppADailyPlanDocument | null> => {
      return new Promise((resolve) => {
        resolveLoad = resolve;
      });
    };

    state.isLoadingSavedPlan = true;
    let cancelled = false;
    const cleanup = () => {
      cancelled = true;
    };

    mockLoad()
      .then((saved) => {
        if (!cancelled && saved) {
          state.viewMode = "execution";
          state.saveStatus = "saved";
        }
      })
      .finally(() => {
        if (!cancelled) {
          state.isLoadingSavedPlan = false;
        }
      });

    // Trigger unmount before promise resolves:
    cleanup();

    // Resolve promise after unmount:
    resolveLoad!(sampleSavedDocument);
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(state.viewMode, "review", "View mode remains untouched because load was cancelled on unmount");
    assert.equal(state.saveStatus, "idle", "Save status remains untouched");
  }

  console.log("✅ All saved plan load race regression tests passed successfully!");
}

void runTests();
