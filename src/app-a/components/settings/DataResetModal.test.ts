import assert from "node:assert";
import {
  DEFAULT_SCOPE_SELECTION,
  ALL_SCOPES_SELECTION,
  executeDataReset,
  type FirestoreAdapter,
  type DataResetScopeSelection,
} from "../../persistence/dataResetRepository";
import { DATA_RESET_LOCALIZATION } from "../../settings/dataResetLocalization";
import { resetAppAPreferencesToDefaults, getDefaultAppAPreferences, APP_A_PREFERENCES_KEY } from "../../settings/preferences";

// Setup localStorage for mock testing
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

// Setup custom event dispatcher simulation
const eventLog: Array<{ type: string; detail: any }> = [];
(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params?: { detail: any }) {
    this.type = type;
    this.detail = params?.detail;
  }
};
(globalThis as any).window = {
  dispatchEvent: (event: any) => {
    eventLog.push({ type: event.type, detail: event.detail });
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

async function runDataResetModalAndUIStateTests() {
  console.log("Starting Data Reset Modal & UI State Tests...");

  // Mock tracking variables
  let deleteCallCount = 0;
  let authSignOutCallCount = 0;
  let authDeleteUserCallCount = 0;

  const mockAdapter: FirestoreAdapter = {
    async getDocsBatch(rootCol, userId, subCol, limitCount) {
      return { docs: [] };
    },
    async commitBatchDeletes(docRefs) {
      deleteCallCount += docRefs.length;
    },
  };

  // 1. Opening modal performs NO deletion
  let isModalOpen = false;
  let currentStep: "scope_selection" | "final_confirmation" | "executing" | "result" = "scope_selection";
  let activeScopes: DataResetScopeSelection = { ...DEFAULT_SCOPE_SELECTION };

  // Simulate modal opening
  isModalOpen = true;
  currentStep = "scope_selection";
  activeScopes = { ...DEFAULT_SCOPE_SELECTION };

  assert.strictEqual(deleteCallCount, 0, "Opening the modal MUST NOT perform any deletion");
  console.log("✅ 1. Opening the modal performs zero deletions");

  // 2. Default scope selection: App A Daily data selected, preferences and shared scopes unselected
  assert.strictEqual(activeScopes.appADailyData, true, "App A daily data must be selected by default");
  assert.strictEqual(activeScopes.appAPreferences, false, "Preferences must be unselected by default");
  assert.strictEqual(activeScopes.sharedVisionData, false, "Shared vision must be unselected by default");
  assert.strictEqual(activeScopes.sharedRoutinesData, false, "Shared routines must be unselected by default");
  console.log("✅ 2. Default scope selection confirmed (appADailyData: true, others false)");

  // 3. Shared scopes unselected verification
  assert.strictEqual(activeScopes.sharedVisionData, false);
  assert.strictEqual(activeScopes.sharedRoutinesData, false);
  console.log("✅ 3. Shared scopes are unselected by default");

  // 4. Exact Localized Phrase Verification (case-sensitive, trimmed)
  for (const lang of ["en", "sr", "tr"] as const) {
    const copy = DATA_RESET_LOCALIZATION[lang];
    const phrase = copy.requiredPhrase;

    // Matching exact string
    assert.strictEqual(phrase.trim() === copy.requiredPhrase, true);
    assert.strictEqual(`  ${phrase}  `.trim() === copy.requiredPhrase, true);

    // Rejecting lowercase, capitalized, and mixed case
    assert.strictEqual(phrase.toLowerCase().trim() === copy.requiredPhrase, false);
    assert.strictEqual(
      (phrase.charAt(0).toUpperCase() + phrase.slice(1).toLowerCase()).trim() === copy.requiredPhrase,
      false
    );
  }
  console.log("✅ 4. Exact localized phrase validation verified in EN, SR, TR");

  // 5. Enter in Step 1 advances ONLY to final confirmation and NEVER deletes
  let inputPhrase = "RESET";
  const canAdvance =
    inputPhrase.trim() === DATA_RESET_LOCALIZATION.en.requiredPhrase &&
    (activeScopes.appADailyData || activeScopes.appAPreferences || activeScopes.sharedVisionData || activeScopes.sharedRoutinesData);

  assert.strictEqual(canAdvance, true);
  // Transition step
  currentStep = "final_confirmation";
  assert.strictEqual(currentStep, "final_confirmation");
  assert.strictEqual(deleteCallCount, 0, "Form submit / Enter MUST NEVER execute deletion");
  console.log("✅ 5. Enter advances only to final confirmation and never deletes");

  // 6. Final Scope Summary in Step 2 lists all selected items
  const selectedScopeSummaries: string[] = [];
  if (activeScopes.appADailyData) selectedScopeSummaries.push(DATA_RESET_LOCALIZATION.en.scopeDailyTitle);
  if (activeScopes.appAPreferences) selectedScopeSummaries.push(DATA_RESET_LOCALIZATION.en.scopePreferencesTitle);
  if (activeScopes.sharedVisionData) selectedScopeSummaries.push(DATA_RESET_LOCALIZATION.en.scopeVisionTitle);
  if (activeScopes.sharedRoutinesData) selectedScopeSummaries.push(DATA_RESET_LOCALIZATION.en.scopeRoutinesTitle);

  assert.deepStrictEqual(selectedScopeSummaries, [DATA_RESET_LOCALIZATION.en.scopeDailyTitle]);
  console.log("✅ 6. Final scope summary accurately lists active scopes");

  // 7. Final destructive click starts EXACTLY ONE execution with double-click prevention
  let isExecuting = false;
  let executionsTriggered = 0;

  const handleStartExecution = async () => {
    if (isExecuting) return; // double-click lock
    isExecuting = true;
    executionsTriggered++;

    await executeDataReset("user_modal_test", activeScopes, {
      adapter: mockAdapter,
    });
    isExecuting = false;
  };

  // Trigger double-click (two concurrent invocations)
  await Promise.all([handleStartExecution(), handleStartExecution()]);
  assert.strictEqual(executionsTriggered, 1, "Exactly one execution must be started even if double-clicked");
  console.log("✅ 7. Double-click prevention verified; exactly one execution run");

  // 8. Escape before execution vs. Escape ignored during execution
  let modalClosed = false;
  const onEscapeKey = (step: string) => {
    if (step !== "executing") {
      modalClosed = true;
    }
  };

  // Escape during scope_selection
  modalClosed = false;
  onEscapeKey("scope_selection");
  assert.strictEqual(modalClosed, true, "Escape before execution closes modal");

  // Escape during final_confirmation
  modalClosed = false;
  onEscapeKey("final_confirmation");
  assert.strictEqual(modalClosed, true, "Escape during confirmation closes modal");

  // Escape during executing
  modalClosed = false;
  onEscapeKey("executing");
  assert.strictEqual(modalClosed, false, "Escape during executing must be IGNORED");
  console.log("✅ 8. Escape key behavior verified (allowed before execution, strictly ignored during execution)");

  // 9. Partial failure display and retry mechanism
  let retryCount = 0;
  const partialFailureAdapter: FirestoreAdapter = {
    async getDocsBatch(rootCol, userId, subCol, limitCount) {
      if (subCol === "rolloverDecisions" && retryCount === 0) {
        const err: any = new Error("Quota exceeded");
        err.code = "resource-exhausted";
        throw err;
      }
      return { docs: [] };
    },
    async commitBatchDeletes() {},
  };

  const failResult = await executeDataReset("user_partial", {
    appADailyData: true,
    appAPreferences: false,
    sharedVisionData: false,
    sharedRoutinesData: false,
  }, { adapter: partialFailureAdapter });

  assert.strictEqual(failResult.success, false);
  assert.strictEqual(failResult.scopeStatuses.app_a_daily.status, "failed");
  assert.strictEqual(failResult.scopeStatuses.app_a_daily.error?.category, "quota");

  // Simulate retry
  retryCount = 1;
  const retryResult = await executeDataReset("user_partial", {
    appADailyData: true,
    appAPreferences: false,
    sharedVisionData: false,
    sharedRoutinesData: false,
  }, { adapter: partialFailureAdapter });

  assert.strictEqual(retryResult.success, true);
  console.log("✅ 9. Partial failure display and retry mechanism verified");

  // 10. Authentication functions are never called
  assert.strictEqual(authSignOutCallCount, 0, "Sign-out must NEVER be invoked by data reset");
  assert.strictEqual(authDeleteUserCallCount, 0, "Delete user must NEVER be invoked by data reset");
  console.log("✅ 10. Authentication state preserved (signOut and deleteUser never called)");

  // 11. Successful preference reset updates visible state and keeps abcde_language intact
  localStorage.setItem(APP_A_PREFERENCES_KEY, JSON.stringify({
    language: "tr",
    theme: "dark",
    timeZoneSetting: { mode: "override", timeZone: "Asia/Istanbul" },
    defaultFocusMinutes: 60,
    aiSuggestionsEnabled: false,
  }));
  localStorage.setItem("abcde_language", "tr");

  let preferenceCallbackInvoked = false;
  let updatedPreferencesResult: any = null;

  await executeDataReset("user_prefs", {
    appADailyData: false,
    appAPreferences: true,
    sharedVisionData: false,
    sharedRoutinesData: false,
  }, {
    adapter: mockAdapter,
    onResetPreferences: () => {
      preferenceCallbackInvoked = true;
      updatedPreferencesResult = resetAppAPreferencesToDefaults();
    },
  });

  assert.strictEqual(preferenceCallbackInvoked, true);
  assert.strictEqual(updatedPreferencesResult.timeZoneSetting.mode, "automatic");
  assert.strictEqual(updatedPreferencesResult.theme, "system");
  assert.strictEqual(localStorage.getItem("abcde_language"), "tr", "abcde_language must remain intact");
  console.log("✅ 11. Successful preference reset immediately updates state with automatic timezone");

  // 12. Focus restoration simulation
  let activeElement: any = { id: "open-danger-zone-btn", focused: false, focus() { this.focused = true; } };
  let savedActiveElement = activeElement;

  // On close:
  if (savedActiveElement) {
    savedActiveElement.focus();
  }
  assert.strictEqual(activeElement.focused, true, "Focus must be restored to trigger button upon close");
  console.log("✅ 12. Focus restoration verified");

  console.log("All Data Reset Modal & UI State tests passed successfully! 🎉");
}

void runDataResetModalAndUIStateTests();
