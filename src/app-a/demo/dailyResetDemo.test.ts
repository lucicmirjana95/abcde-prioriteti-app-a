import assert from "node:assert/strict";
import { validatePlanDraft } from "../domain/daily-reset/validation";
import {
  createDailyResetDemoClient,
  createDailyResetDemoDraft,
  createDailyResetDemoInitialData,
  DAILY_RESET_DEMO_SCENARIOS,
  getDailyResetDemoConfig,
} from "./dailyResetDemo";

async function run() {
  assert.equal(getDailyResetDemoConfig("?app=a"), null);
  assert.equal(getDailyResetDemoConfig("?app=b&demo=daily-reset"), null);
  assert.deepEqual(getDailyResetDemoConfig("?app=a&demo=daily-reset"), {
    enabled: true,
    scenario: "clarification",
  });
  assert.equal(
    getDailyResetDemoConfig("?app=a&demo=daily-reset&scenario=timeout")?.scenario,
    "timeout",
  );
  assert.equal(
    getDailyResetDemoConfig("?app=a&demo=daily-reset&scenario=unknown")?.scenario,
    "clarification",
  );

  for (const language of ["en", "sr", "tr"] as const) {
    const initial = createDailyResetDemoInitialData(language);
    assert.ok(initial.brainDump.length > 20);
    assert.equal(initial.availableTime?.type, "4h");
    const draft = createDailyResetDemoDraft(language);
    assert.equal(validatePlanDraft(draft).valid, true);
    assert.equal(draft.availableMinutes, 240);
    assert.equal(draft.plannedRequiredMinutes, 105);
    assert.equal(draft.firstFocus.length, 1);
    assert.equal(draft.deferredItems.length, 1);
    assert.equal(draft.longTermIdeas.length, 1);
    assert.equal(draft.nonActionItems.length, 1);
  }

  let globalFetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    globalFetchCalls += 1;
    throw new Error("Demo must not call fetch");
  };

  try {
    const input = { brainDump: "Demo brain dump", language: "en" as const };
    const clarificationClient = createDailyResetDemoClient("clarification", 0);
    const clarification = await clarificationClient.analyze(input);
    assert.equal(clarification.phase, "clarification_needed");
    if (clarification.phase !== "clarification_needed") throw new Error("Expected questions");
    const plan = await clarificationClient.resolve(
      { ...input, clarificationAnswers: [{ questionId: clarification.questions[0].id, answer: "Yes" }] },
      clarification.questions,
    );
    assert.equal(plan.phase, "plan_ready");

    const directPlan = await createDailyResetDemoClient("plan", 0).analyze(input);
    assert.equal(directPlan.phase, "plan_ready");

    const expectedCodes = {
      "rate-limit": "rate_limited",
      unavailable: "service_unavailable",
      timeout: "timeout",
      "invalid-response": "invalid_ai_response",
    } as const;
    for (const scenario of DAILY_RESET_DEMO_SCENARIOS) {
      if (scenario === "clarification" || scenario === "plan") continue;
      const response = await createDailyResetDemoClient(scenario, 0).analyze(input);
      assert.equal(response.phase, "error");
      if (response.phase === "error") assert.equal(response.code, expectedCodes[scenario]);
    }
    assert.equal(globalFetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("✅ All daily-reset demo tests passed successfully!");
}

run().catch((error) => {
  console.error("❌ Daily-reset demo test failed:", error);
  process.exitCode = 1;
});
