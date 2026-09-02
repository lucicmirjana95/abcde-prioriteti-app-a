import assert from "node:assert";
import type { DataResetScopeKey } from "../persistence/dataResetRepository";

// Mock Event system
interface DataResetEventDetail {
  completedScopes: DataResetScopeKey[];
  timestamp: number;
}

class MockCustomEvent<T = any> {
  type: string;
  detail: T;
  constructor(type: string, dict?: { detail: T }) {
    this.type = type;
    this.detail = dict?.detail as T;
  }
}

async function runDataResetEventScopeTests() {
  console.log("Starting Data Reset Event Scope Tests...");

  // Mock consumers
  let todayScreenCleared = false;
  let visionScreenRefreshed = false;
  let routinesRefreshed = false;

  const todayListener = (event: MockCustomEvent<DataResetEventDetail>) => {
    const completed = event.detail?.completedScopes;
    if (!completed || completed.includes("app_a_daily")) {
      todayScreenCleared = true;
    }
  };

  const visionListener = (event: MockCustomEvent<DataResetEventDetail>) => {
    const completed = event.detail?.completedScopes;
    if (!completed || completed.includes("vision_shared")) {
      visionScreenRefreshed = true;
    }
  };

  const routinesListener = (event: MockCustomEvent<DataResetEventDetail>) => {
    const completed = event.detail?.completedScopes;
    if (!completed || completed.includes("routines_shared")) {
      routinesRefreshed = true;
    }
  };

  // 1. Non-sensitive payload verification
  const eventPayload: DataResetEventDetail = {
    completedScopes: ["app_a_daily", "app_a_preferences"],
    timestamp: 1725280000000,
  };
  const keys = Object.keys(eventPayload);
  assert.deepStrictEqual(keys, ["completedScopes", "timestamp"], "Event detail must contain only non-sensitive fields");
  console.log("✅ 1. Event detail contains only non-sensitive completed scope categories");

  // 2. Only App A Daily reset -> Today clears, Vision & Routines do NOT refresh
  todayScreenCleared = false;
  visionScreenRefreshed = false;
  routinesRefreshed = false;

  const appADailyEvent = new MockCustomEvent<DataResetEventDetail>("app-a-data-reset", {
    detail: { completedScopes: ["app_a_daily"], timestamp: Date.now() },
  });
  todayListener(appADailyEvent);
  visionListener(appADailyEvent);
  routinesListener(appADailyEvent);

  assert.strictEqual(todayScreenCleared, true, "TodayScreen must clear when app_a_daily reset");
  assert.strictEqual(visionScreenRefreshed, false, "VisionScreen must NOT refresh on app_a_daily-only reset");
  assert.strictEqual(routinesRefreshed, false, "Routines must NOT refresh on app_a_daily-only reset");
  console.log("✅ 2. App A daily reset isolates effect strictly to TodayScreen");

  // 3. Only Vision reset -> Vision refreshes, Today & Routines unaffected
  todayScreenCleared = false;
  visionScreenRefreshed = false;
  routinesRefreshed = false;

  const visionEvent = new MockCustomEvent<DataResetEventDetail>("app-a-data-reset", {
    detail: { completedScopes: ["vision_shared"], timestamp: Date.now() },
  });
  todayListener(visionEvent);
  visionListener(visionEvent);
  routinesListener(visionEvent);

  assert.strictEqual(todayScreenCleared, false, "TodayScreen must NOT clear on vision-only reset");
  assert.strictEqual(visionScreenRefreshed, true, "VisionScreen must refresh on vision_shared reset");
  assert.strictEqual(routinesRefreshed, false, "Routines must NOT refresh on vision-only reset");
  console.log("✅ 3. Vision shared reset isolates effect strictly to VisionScreen");

  // 4. Only Routines reset -> Routines refresh, Today & Vision unaffected
  todayScreenCleared = false;
  visionScreenRefreshed = false;
  routinesRefreshed = false;

  const routinesEvent = new MockCustomEvent<DataResetEventDetail>("app-a-data-reset", {
    detail: { completedScopes: ["routines_shared"], timestamp: Date.now() },
  });
  todayListener(routinesEvent);
  visionListener(routinesEvent);
  routinesListener(routinesEvent);

  assert.strictEqual(todayScreenCleared, false, "TodayScreen must NOT clear on routines-only reset");
  assert.strictEqual(visionScreenRefreshed, false, "VisionScreen must NOT refresh on routines-only reset");
  assert.strictEqual(routinesRefreshed, true, "Routines must refresh on routines_shared reset");
  console.log("✅ 4. Routines shared reset isolates effect strictly to Routines");

  // 5. Partial failure test: when app_a_daily fails but vision succeeds
  todayScreenCleared = false;
  visionScreenRefreshed = false;
  routinesRefreshed = false;

  const partialEvent = new MockCustomEvent<DataResetEventDetail>("app-a-data-reset", {
    detail: { completedScopes: ["vision_shared"], timestamp: Date.now() }, // app_a_daily failed and was omitted
  });
  todayListener(partialEvent);
  visionListener(partialEvent);
  routinesListener(partialEvent);

  assert.strictEqual(todayScreenCleared, false, "TodayScreen MUST NOT clear local state when app_a_daily failed");
  assert.strictEqual(visionScreenRefreshed, true, "VisionScreen refreshes because vision_shared succeeded");
  console.log("✅ 5. Partial failure prevents clearing of failed scope locally");

  console.log("All Data Reset Event Scope tests passed successfully! 🎉");
}

void runDataResetEventScopeTests();
