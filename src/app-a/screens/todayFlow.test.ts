import assert from "assert";
import {
  TodayFlowController,
  convertDataToInput,
} from "./todayFlow";
import {
  DailyResetInput,
  DailyResetClarificationSubmission,
  ClarificationQuestion,
  DailyResetApiResponse,
} from "../domain/daily-reset/contracts";
import { DailyResetApiClient } from "../api";
import { DailyResetData } from "../types";

class MockApiClient implements DailyResetApiClient {
  analyzeCalls: DailyResetInput[] = [];
  resolveCalls: {
    submission: DailyResetClarificationSubmission;
    questions: ClarificationQuestion[];
  }[] = [];

  analyzeResponse: DailyResetApiResponse = {
    success: true,
    phase: "clarification_needed",
    questions: [
      {
        id: "q1",
        question: "Is this for work or home?",
        context: "Context text",
        relatedItemIds: [],
        materialImpact: "priority",
      },
    ],
  };

  resolveResponse: DailyResetApiResponse = {
    success: true,
    phase: "plan_ready",
    draft: {
      classifiedItems: [],
      firstFocus: [],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: "Test plan",
      plannedRequiredMinutes: 30,
      plannedOptionalMinutes: 0,
    },
  };

  async analyze(input: DailyResetInput, signal?: AbortSignal): Promise<DailyResetApiResponse> {
    this.analyzeCalls.push(input);
    return this.analyzeResponse;
  }

  async resolve(
    submission: DailyResetClarificationSubmission,
    questions: ClarificationQuestion[],
    signal?: AbortSignal
  ): Promise<DailyResetApiResponse> {
    this.resolveCalls.push({ submission, questions });
    return this.resolveResponse;
  }
}

async function runTests() {
  const validData: DailyResetData = {
    energy: 3,
    pleasantness: 4,
    availableTime: { type: "1h" },
    stateNote: "Feeling okay",
    brainDump: "Do laundry, write code, call mom",
  };

  const sampleQuestion: ClarificationQuestion = {
    id: "q1",
    question: "Is laundry high priority?",
    context: "Time check",
    relatedItemIds: [],
    materialImpact: "priority",
  };

  // 1. Initial state is editing
  {
    const controller = new TodayFlowController("en", new MockApiClient(), validData);
    const state = controller.getState();
    assert.strictEqual(state.phase, "editing");
    assert.deepStrictEqual(state.inputData, validData);
  }

  // 2. Initial submit transitions state to submitting
  {
    const mock = new MockApiClient();
    let capturedPhaseDuringSubmit = "";
    mock.analyze = async (input) => {
      capturedPhaseDuringSubmit = controller.getState().phase;
      return mock.analyzeResponse;
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    assert.strictEqual(capturedPhaseDuringSubmit, "submitting");
  }

  // 3. Valid initial submit returning clarification_needed transitions to clarification_needed
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    const state = controller.getState();
    assert.strictEqual(state.phase, "clarification_needed");
    assert.strictEqual(state.questions.length, 1);
    assert.strictEqual(state.questions[0].id, "q1");
  }

  // 4. Valid initial submit returning plan_ready transitions to plan_ready
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "plan_ready",
      draft: {
        classifiedItems: [],
        firstFocus: [],
        laterToday: [],
        ifCapacityRemains: [],
        deferredItems: [],
        longTermIdeas: [],
        nonActionItems: [],
        planRationale: "Direct plan",
        plannedRequiredMinutes: 60,
        plannedOptionalMinutes: 0,
      },
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    const state = controller.getState();
    assert.strictEqual(state.phase, "plan_ready");
    assert.strictEqual(state.planDraft?.planRationale, "Direct plan");
  }

  // 5. Invalid initial input or analyze returning error transitions to error with failedPhase: "initial"
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: false,
      phase: "error",
      code: "service_unavailable",
      error: "Service is down",
      retryable: true,
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    const state = controller.getState();
    assert.strictEqual(state.phase, "error");
    assert.strictEqual(state.failedPhase, "initial");
  }

  // 6. Error state stores error message, code, and retryability
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: false,
      phase: "error",
      code: "rate_limited",
      error: "Too many requests",
      retryable: true,
      fieldErrors: { brainDump: "Too long" },
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    const state = controller.getState();
    assert.strictEqual(state.error?.message, "Too many requests");
    assert.strictEqual(state.error?.code, "rate_limited");
    assert.strictEqual(state.error?.retryable, true);
    assert.strictEqual(state.error?.fieldErrors?.brainDump, "Too long");
  }

  // 7. Manual retry in error state with failedPhase: "initial" re-triggers analyze
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: false,
      phase: "error",
      code: "service_unavailable",
      error: "Service issue",
      retryable: true,
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    assert.strictEqual(mock.analyzeCalls.length, 1);

    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };

    await controller.retry();
    assert.strictEqual(mock.analyzeCalls.length, 2);
    assert.strictEqual(controller.getState().phase, "clarification_needed");
  }

  // 8. backToEdit from error state (initial) restores state to editing with full input data preserved
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: false,
      phase: "error",
      code: "service_unavailable",
      error: "Error",
      retryable: true,
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.backToEdit();
    const state = controller.getState();
    assert.strictEqual(state.phase, "editing");
    assert.deepStrictEqual(state.inputData, validData);
  }

  // 9. backToEdit from clarification_needed restores state to editing with full input data preserved
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.backToEdit();
    const state = controller.getState();
    assert.strictEqual(state.phase, "editing");
    assert.deepStrictEqual(state.inputData, validData);
  }

  // 10. backToEdit from plan_ready restores state to editing with full input data preserved
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "plan_ready",
      draft: {
        classifiedItems: [],
        firstFocus: [],
        laterToday: [],
        ifCapacityRemains: [],
        deferredItems: [],
        longTermIdeas: [],
        nonActionItems: [],
        planRationale: "Plan",
        plannedRequiredMinutes: 30,
        plannedOptionalMinutes: 0,
      },
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.backToEdit();
    const state = controller.getState();
    assert.strictEqual(state.phase, "editing");
    assert.deepStrictEqual(state.inputData, validData);
  }

  // 11. Submitting clarification answers transitions state to resolving
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    let capturedPhase = "";
    mock.resolve = async (sub, q) => {
      capturedPhase = controller.getState().phase;
      return mock.resolveResponse;
    };

    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.setAnswer("q1", "Yes, very high priority");
    await controller.submitResolve();
    assert.strictEqual(capturedPhase, "resolving");
  }

  // 12. Valid resolve returning plan_ready transitions state to plan_ready
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.setAnswer("q1", "Answer text");
    await controller.submitResolve();
    const state = controller.getState();
    assert.strictEqual(state.phase, "plan_ready");
    assert.strictEqual(state.planDraft?.planRationale, "Test plan");
  }

  // 13. resolve returning error transitions state to error with failedPhase: "resolve"
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    mock.resolveResponse = {
      success: false,
      phase: "error",
      code: "invalid_ai_response",
      error: "Invalid AI response",
      retryable: true,
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.setAnswer("q1", "Answer");
    await controller.submitResolve();
    const state = controller.getState();
    assert.strictEqual(state.phase, "error");
    assert.strictEqual(state.failedPhase, "resolve");
  }

  // 14. Manual retry in error state with failedPhase: "resolve" re-triggers resolve
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    mock.resolveResponse = {
      success: false,
      phase: "error",
      code: "service_unavailable",
      error: "Fail",
      retryable: true,
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.setAnswer("q1", "Answer");
    await controller.submitResolve();
    assert.strictEqual(mock.resolveCalls.length, 1);

    mock.resolveResponse = {
      success: true,
      phase: "plan_ready",
      draft: {
        classifiedItems: [],
        firstFocus: [],
        laterToday: [],
        ifCapacityRemains: [],
        deferredItems: [],
        longTermIdeas: [],
        nonActionItems: [],
        planRationale: "Resolved plan",
        plannedRequiredMinutes: 30,
        plannedOptionalMinutes: 0,
      },
    };

    await controller.retry();
    assert.strictEqual(mock.resolveCalls.length, 2);
    assert.strictEqual(controller.getState().phase, "plan_ready");
  }

  // 15. backToEdit from error state (failed resolve phase) restores state to editing with original input data
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    mock.resolveResponse = {
      success: false,
      phase: "error",
      code: "service_unavailable",
      error: "Error",
      retryable: true,
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.setAnswer("q1", "Answer");
    await controller.submitResolve();
    controller.backToEdit();
    const state = controller.getState();
    assert.strictEqual(state.phase, "editing");
    assert.deepStrictEqual(state.inputData, validData);
  }

  // 16. Submitting empty brain dump locally triggers validation error without calling API
  {
    const mock = new MockApiClient();
    const controller = new TodayFlowController("en", mock, { brainDump: "   " });
    await controller.submitInitial();
    assert.strictEqual(mock.analyzeCalls.length, 0);
    const state = controller.getState();
    assert.strictEqual(state.phase, "error");
    assert.strictEqual(state.error?.code, "invalid_input");
  }

  // 17. Submitting empty answer for a clarification question triggers validation error without calling API
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    await controller.submitResolve({ q1: "   " });
    assert.strictEqual(mock.resolveCalls.length, 0);
    const state = controller.getState();
    assert.strictEqual(state.phase, "error");
    assert.strictEqual(state.error?.code, "invalid_input");
  }

  // 18. Trimming of input text in convertDataToInput / payload construction
  {
    const mock = new MockApiClient();
    const controller = new TodayFlowController("en", mock, {
      ...validData,
      brainDump: "  Do laundry and read  ",
      stateNote: "  Tired  ",
    });
    await controller.submitInitial();
    const call = mock.analyzeCalls[0];
    assert.strictEqual(call.brainDump, "  Do laundry and read  ");
    assert.strictEqual(call.stateNote, "  Tired  ");
  }

  // 19. Language selection passed to API client
  {
    const mockSr = new MockApiClient();
    const controllerSr = new TodayFlowController("sr", mockSr, validData);
    await controllerSr.submitInitial();
    assert.strictEqual(mockSr.analyzeCalls[0].language, "sr");

    const mockTr = new MockApiClient();
    const controllerTr = new TodayFlowController("tr", mockTr, validData);
    await controllerTr.submitInitial();
    assert.strictEqual(mockTr.analyzeCalls[0].language, "tr");
  }

  // 20. Available time conversion 30m -> 30 minutes
  {
    const input = convertDataToInput({ ...validData, availableTime: { type: "30m" } }, "en");
    assert.strictEqual(input.availableMinutes, 30);
  }

  // 21. Available time conversion 1h -> 60 minutes
  {
    const input = convertDataToInput({ ...validData, availableTime: { type: "1h" } }, "en");
    assert.strictEqual(input.availableMinutes, 60);
  }

  // 22. Available time conversion 2h -> 120 minutes
  {
    const input = convertDataToInput({ ...validData, availableTime: { type: "2h" } }, "en");
    assert.strictEqual(input.availableMinutes, 120);
  }

  // 23. Available time conversion 4h -> 240 minutes
  {
    const input = convertDataToInput({ ...validData, availableTime: { type: "4h" } }, "en");
    assert.strictEqual(input.availableMinutes, 240);
  }

  // 24. Available time conversion most_day -> 480 minutes
  {
    const input = convertDataToInput({ ...validData, availableTime: { type: "most_day" } }, "en");
    assert.strictEqual(input.availableMinutes, 480);
  }

  // 25. Available time conversion custom -> hours * 60 + minutes
  {
    const input = convertDataToInput(
      { ...validData, availableTime: { type: "custom", customHours: 2, customMinutes: 45 } },
      "en"
    );
    assert.strictEqual(input.availableMinutes, 165);
  }

  // 26. Serbian error message fallback in local validation
  {
    const controller = new TodayFlowController("sr", new MockApiClient(), { brainDump: "" });
    await controller.submitInitial();
    const state = controller.getState();
    assert.strictEqual(state.error?.message, "Napišite šta vam je na umu da bismo kreirali plan.");
  }

  // 27. English error message fallback in local validation
  {
    const controller = new TodayFlowController("en", new MockApiClient(), { brainDump: "" });
    await controller.submitInitial();
    const state = controller.getState();
    assert.strictEqual(state.error?.message, "Please write what is on your mind to create a plan.");
  }

  // 28. Turkish error message fallback in local validation
  {
    const controller = new TodayFlowController("tr", new MockApiClient(), { brainDump: "" });
    await controller.submitInitial();
    const state = controller.getState();
    assert.strictEqual(state.error?.message, "Bir plan oluşturmak için lütfen aklınızdakileri yazın.");
  }

  // 29. Reset flow clears questions, answers, draft, and returns to editing
  {
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.setAnswer("q1", "Answer");
    controller.reset();
    const state = controller.getState();
    assert.strictEqual(state.phase, "editing");
    assert.strictEqual(state.questions.length, 0);
    assert.deepStrictEqual(state.answers, {});
    assert.strictEqual(state.planDraft, null);
  }

  // 30. State updates trigger subscribed listeners
  {
    const controller = new TodayFlowController("en", new MockApiClient(), validData);
    let notifyCount = 0;
    const unsubscribe = controller.subscribe(() => {
      notifyCount++;
    });
    controller.updateInputData({ stateNote: "Updated note" });
    assert.strictEqual(notifyCount, 1);
    unsubscribe();
    controller.updateInputData({ stateNote: "Updated note 2" });
    assert.strictEqual(notifyCount, 1);
  }

  // 31. A persisted confirmed plan can restore the flow without an AI request
  {
    const mock = new MockApiClient();
    const response = mock.resolveResponse;
    if (response.phase !== "plan_ready") throw new Error("Expected plan fixture");
    const controller = new TodayFlowController("en", mock);
    controller.loadConfirmedPlan(response.draft, validData);
    const state = controller.getState();
    assert.strictEqual(state.phase, "plan_ready");
    assert.strictEqual(state.planDraft?.planRationale, "Test plan");
    assert.deepStrictEqual(state.inputData, validData);
    assert.strictEqual(mock.analyzeCalls.length, 0);
  }

  // 32. Cancellation during initial submission preserves input and reverts to editing
  {
    let abortSignalTriggered = false;
    const mock = new MockApiClient();
    mock.analyze = async (input, signal) => {
      signal?.addEventListener("abort", () => {
        abortSignalTriggered = true;
      });
      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 50));
      return mock.analyzeResponse;
    };
    const controller = new TodayFlowController("en", mock, validData);
    const submitPromise = controller.submitInitial();
    assert.strictEqual(controller.getState().phase, "submitting");
    
    // User cancels
    controller.cancel();
    assert.strictEqual(controller.getState().phase, "editing");
    assert.deepStrictEqual(controller.getState().inputData, validData);
    assert.strictEqual(abortSignalTriggered, true);

    await submitPromise;
    // Late response must be ignored
    assert.strictEqual(controller.getState().phase, "editing");
  }

  // 33. Cancellation during resolve submission preserves answers and reverts to clarification_needed
  {
    let abortSignalTriggered = false;
    const mock = new MockApiClient();
    mock.analyzeResponse = {
      success: true,
      phase: "clarification_needed",
      questions: [sampleQuestion],
    };
    mock.resolve = async (submission, questions, signal) => {
      signal?.addEventListener("abort", () => {
        abortSignalTriggered = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      return mock.resolveResponse;
    };
    const controller = new TodayFlowController("en", mock, validData);
    await controller.submitInitial();
    controller.setAnswer("q1", "Detailed answer");
    
    const resolvePromise = controller.submitResolve();
    assert.strictEqual(controller.getState().phase, "resolving");

    // User cancels
    controller.cancel();
    assert.strictEqual(controller.getState().phase, "clarification_needed");
    assert.strictEqual(controller.getState().answers["q1"], "Detailed answer");
    assert.strictEqual(abortSignalTriggered, true);

    await resolvePromise;
    // Late response must be ignored
    assert.strictEqual(controller.getState().phase, "clarification_needed");
  }

  // 34. Timeout displays localized recoverable message
  {
    const mock = new MockApiClient();
    mock.analyze = async () => {
      throw new Error("Timeout");
    };
    const controllerEn = new TodayFlowController("en", mock, validData);
    await controllerEn.submitInitial();
    assert.strictEqual(controllerEn.getState().phase, "error");
    assert.strictEqual(controllerEn.getState().error?.code, "timeout");
    assert.strictEqual(
      controllerEn.getState().error?.message,
      "Planning took too long this time. Your input is preserved — you can try again."
    );
    assert.strictEqual(controllerEn.getState().error?.retryable, true);

    const controllerSr = new TodayFlowController("sr", mock, validData);
    await controllerSr.submitInitial();
    assert.strictEqual(
      controllerSr.getState().error?.message,
      "Planiranje je ovog puta trajalo predugo. Vaš unos je sačuvan — možete pokušati ponovo."
    );

    const controllerTr = new TodayFlowController("tr", mock, validData);
    await controllerTr.submitInitial();
    assert.strictEqual(
      controllerTr.getState().error?.message,
      "Planlama bu sefer çok uzun sürdü. Girişiniz korundu — tekrar deneyebilirsiniz."
    );
  }

  console.log("✅ All 34 today flow tests passed successfully!");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
