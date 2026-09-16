import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ClarificationForm from "../components/daily-reset/ClarificationForm";
import {
  TodayFlowController,
  CLARIFICATION_UNKNOWN_VALUE,
  ClarificationHistoryEntry,
  filterDuplicateQuestions,
} from "./todayFlow";
import type {
  DailyResetApiClient,
} from "../api";
import type {
  DailyResetInput,
  DailyResetClarificationSubmission,
  ClarificationQuestion,
  DailyResetApiResponse,
} from "../domain/daily-reset/contracts";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost",
});

(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
(globalThis as any).HTMLInputElement = dom.window.HTMLInputElement;
(globalThis as any).HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).KeyboardEvent = dom.window.KeyboardEvent;
(globalThis as any).MouseEvent = dom.window.MouseEvent;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

(dom.window.Element.prototype as any).attachEvent = () => {};
(dom.window.Element.prototype as any).detachEvent = () => {};

function clickElement(element: any) {
  const propsKey = Object.keys(element).find((k) => k.startsWith("__reactProps$"));
  if (propsKey && element[propsKey]?.onClick) {
    element[propsKey].onClick({ preventDefault: () => {}, stopPropagation: () => {} });
  } else {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  }
}

function changeValue(element: any, value: string) {
  const propsKey = Object.keys(element).find((k) => k.startsWith("__reactProps$"));
  if (propsKey && element[propsKey]?.onChange) {
    element[propsKey].onChange({ target: { value } });
  } else {
    element.value = value;
    element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  }
}

async function runClarificationMultiRoundWiringTests() {
  console.log("Running Real React/JSDOM Clarification Multi-Round Wiring Tests...");
  const container = dom.window.document.getElementById("root")!;

  // -------------------------------------------------------------
  // Test 1: Deduplication of semantically identical questions
  // -------------------------------------------------------------
  console.log("▶ Test 1: Semantic Deduplication of Clarification Questions");
  {
    const existingHistory: ClarificationHistoryEntry[] = [
      {
        roundIndex: 1,
        questionId: "q_work",
        question: {
          id: "q_work",
          question: "Da li je ovo za posao ili lično?",
          context: "Posao/lično",
          relatedItemIds: [],
          materialImpact: "priority",
        },
        context: "Posao/lično",
        materialImpact: "priority",
        relatedItemIds: [],
        answer: "Za posao",
      },
    ];

    const newFromAi: ClarificationQuestion[] = [
      {
        id: "q_work_dup",
        question: "Da li je ovo za posao ili lično?", // duplicate text
        context: "Context",
        relatedItemIds: [],
        materialImpact: "priority",
      },
      {
        id: "q_work", // duplicate ID
        question: "Neko drugo pitanje?",
        context: "Context",
        relatedItemIds: [],
        materialImpact: "priority",
      },
      {
        id: "q_deadline",
        question: "Koji je tačan rok za završetak?", // genuine new question
        context: "Rok",
        relatedItemIds: [],
        materialImpact: "deadline",
      },
    ];

    const filtered = filterDuplicateQuestions(newFromAi, existingHistory);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, "q_deadline");
  }

  // -------------------------------------------------------------
  // Test 2: Multi-round clarification preserves history & passes full QA context
  // -------------------------------------------------------------
  console.log("▶ Test 2: Controller preserves structured history across rounds and includes full QA in resolve");
  {
    let resolvePayloads: DailyResetClarificationSubmission[] = [];

    const mockApi: DailyResetApiClient = {
      analyze: async () => ({
        success: true,
        phase: "clarification_needed",
        questions: [
          { id: "q1", question: "Pitanje 1?", context: "C1", relatedItemIds: [], materialImpact: "priority" },
        ],
      }),
      resolve: async (sub) => {
        resolvePayloads.push(sub);
        if (resolvePayloads.length === 1) {
          // Round 1 answered -> AI asks Round 2 question
          return {
            success: true,
            phase: "clarification_needed",
            questions: [
              { id: "q2", question: "Pitanje 2?", context: "C2", relatedItemIds: [], materialImpact: "duration" },
            ],
          };
        }
        // Round 2 answered -> Plan ready
        return {
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
            planRationale: "Ready",
            plannedRequiredMinutes: 60,
            plannedOptionalMinutes: 0,
          },
        };
      },
    };

    const controller = new TodayFlowController("sr", mockApi, { brainDump: "Moj radni zadatak" });
    await controller.submitInitial();

    assert.strictEqual(controller.getState().phase, "clarification_needed");
    assert.strictEqual(controller.getState().questions.length, 1);
    assert.strictEqual(controller.getState().questions[0].id, "q1");

    // Answer round 1
    controller.setAnswer("q1", "Odgovor 1");
    await controller.submitResolve();

    // Round 2 arrived: check history has round 1
    assert.strictEqual(controller.getState().phase, "clarification_needed");
    assert.strictEqual(controller.getState().roundIndex, 2);
    assert.strictEqual(controller.getState().history.length, 1);
    assert.strictEqual(controller.getState().history[0].question.id, "q1");
    assert.strictEqual(controller.getState().history[0].answer, "Odgovor 1");
    assert.strictEqual(controller.getState().questions[0].id, "q2");

    // Answer round 2
    controller.setAnswer("q2", "Odgovor 2");
    await controller.submitResolve();

    assert.strictEqual(controller.getState().phase, "plan_ready");
    assert.strictEqual(resolvePayloads.length, 2);

    // Verify resolve payload for round 2 contained BOTH answers
    const finalResolve = resolvePayloads[1];
    assert.strictEqual(finalResolve.clarificationAnswers.length, 2);
    assert.deepStrictEqual(finalResolve.clarificationAnswers, [
      { questionId: "q1", answer: "Odgovor 1" },
      { questionId: "q2", answer: "Odgovor 2" },
    ]);
  }

  // -------------------------------------------------------------
  // Test 3: React ClarificationForm - Explicit Unknown button and badge
  // -------------------------------------------------------------
  console.log("▶ Test 3: React ClarificationForm - Explicit 'Ne znam' (__UNKNOWN__) selection");
  {
    const root = createRoot(container);
    let lastAnswers: Record<string, string> = {};
    let submitted = false;

    const questions: ClarificationQuestion[] = [
      { id: "q1", question: "Koji je prioritet?", context: "P", relatedItemIds: [], materialImpact: "priority" },
    ];

    await act(async () => {
      root.render(
        React.createElement(ClarificationForm, {
          questions,
          answers: lastAnswers,
          language: "sr",
          onAnswerChange: (qId, ans) => {
            lastAnswers = { ...lastAnswers, [qId]: ans };
          },
          onMarkUnknown: (qId) => {
            lastAnswers = { ...lastAnswers, [qId]: CLARIFICATION_UNKNOWN_VALUE };
          },
          onSubmit: () => {
            submitted = true;
          },
          onBackToEdit: () => {},
        })
      );
    });

    // Find "Ne znam" button
    const unsureBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Ne znam")
    );
    assert.ok(unsureBtn, "Ne znam button must be rendered");

    // Click "Ne znam"
    await act(async () => {
      clickElement(unsureBtn);
    });

    assert.strictEqual(lastAnswers["q1"], CLARIFICATION_UNKNOWN_VALUE);

    // Re-render with updated answer
    await act(async () => {
      root.render(
        React.createElement(ClarificationForm, {
          questions,
          answers: lastAnswers,
          unknowns: { q1: true },
          language: "sr",
          onAnswerChange: () => {},
          onSubmit: () => {
            submitted = true;
          },
          onBackToEdit: () => {},
        })
      );
    });

    // Verify marked badge on button
    const markedBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Označeno: Ne znam")
    );
    assert.ok(markedBtn, "Button must show marked unsure label");
    assert.strictEqual(markedBtn.getAttribute("aria-pressed"), "true");

    // Submit should now succeed without empty error
    const submitBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Nastavi")
    );
    assert.ok(submitBtn);

    await act(async () => {
      clickElement(submitBtn);
    });

    assert.strictEqual(submitted, true, "Submit should succeed when answered with explicit unknown");
    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 4: Synchronous double-click ref guard in ClarificationForm
  // -------------------------------------------------------------
  console.log("▶ Test 4: Synchronous double-click ref guard blocks duplicate submits");
  {
    const root = createRoot(container);
    let submitCount = 0;

    const questions: ClarificationQuestion[] = [
      { id: "q1", question: "Pitanje?", context: "C", relatedItemIds: [], materialImpact: "priority" },
    ];

    await act(async () => {
      root.render(
        React.createElement(ClarificationForm, {
          questions,
          answers: { q1: "Validan odgovor" },
          language: "sr",
          onAnswerChange: () => {},
          onSubmit: () => {
            submitCount++;
          },
          onBackToEdit: () => {},
        })
      );
    });

    const submitBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Nastavi")
    );
    assert.ok(submitBtn);

    // Simulate rapid concurrent double clicks
    await act(async () => {
      clickElement(submitBtn);
      clickElement(submitBtn);
    });

    assert.strictEqual(submitCount, 1, "Only first click must invoke onSubmit; ref guard must block duplicate");
    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 5: Summary view after ~3 rounds with Draft Now and Save Later
  // -------------------------------------------------------------
  console.log("▶ Test 5: Summary view after round 3 renders 'Šta sam razumeo', 'Napravi nacrt sada', 'Sačuvaj i nastavi kasnije'");
  {
    const root = createRoot(container);
    let actionTriggered: string | null = null;
    let saveLaterTriggered = false;

    const history: ClarificationHistoryEntry[] = [
      { roundIndex: 1, questionId: "q1", question: { id: "q1", question: "Pitanje 1?", context: "", relatedItemIds: [], materialImpact: "priority" }, context: "", relatedItemIds: [], materialImpact: "priority", answer: "Odgovor 1" },
      { roundIndex: 2, questionId: "q2", question: { id: "q2", question: "Pitanje 2?", context: "", relatedItemIds: [], materialImpact: "priority" }, context: "", relatedItemIds: [], materialImpact: "priority", answer: "Odgovor 2" },
      { roundIndex: 3, questionId: "q3", question: { id: "q3", question: "Pitanje 3?", context: "", relatedItemIds: [], materialImpact: "priority" }, context: "", relatedItemIds: [], materialImpact: "priority", answer: "Odgovor 3" },
    ];

    const questions: ClarificationQuestion[] = [
      { id: "q4", question: "Pitanje 4?", context: "", relatedItemIds: [], materialImpact: "priority" },
    ];

    await act(async () => {
      root.render(
        React.createElement(ClarificationForm, {
          questions,
          answers: {},
          history,
          roundIndex: 4,
          showSummaryOptions: true,
          language: "sr",
          onAnswerChange: () => {},
          onSubmit: (action) => {
            actionTriggered = action || "submit";
          },
          onBackToEdit: () => {},
          onSaveLater: () => {
            saveLaterTriggered = true;
          },
        })
      );
    });

    // Check "Šta sam razumeo" heading
    assert.ok(container.textContent?.includes("Šta sam razumeo do sada"), "Summary section must be present");
    assert.ok(container.textContent?.includes("Q: Pitanje 1?"), "History Q1 must be listed");
    assert.ok(container.textContent?.includes("A: Odgovor 1"), "History A1 must be listed");

    // Find "Napravi nacrt sada" button
    const draftNowBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Napravi nacrt sada")
    );
    assert.ok(draftNowBtn, "Draft now button must be visible");

    await act(async () => {
      clickElement(draftNowBtn);
    });
    assert.strictEqual(actionTriggered, "draft_now");

    // Find "Sačuvaj i nastavi kasnije" button
    const saveLaterBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Sačuvaj i nastavi kasnije")
    );
    assert.ok(saveLaterBtn, "Save later button must be visible");

    await act(async () => {
      clickElement(saveLaterBtn);
    });
    assert.strictEqual(saveLaterTriggered, true);

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 6: Resilience with 20+ answers on resolve error & clean retry
  // -------------------------------------------------------------
  console.log("▶ Test 6: 20+ accumulated answers preserved on AI error, retry repeats identical payload without re-asking");
  {
    let resolveCallsCount = 0;
    let lastPayloadSent: DailyResetClarificationSubmission | null = null;
    let shouldFail = true;

    const mockApi: DailyResetApiClient = {
      analyze: async () => ({
        success: true,
        phase: "clarification_needed",
        questions: [{ id: "q21", question: "Pitanje 21?", context: "", relatedItemIds: [], materialImpact: "priority" }],
      }),
      resolve: async (sub) => {
        resolveCallsCount++;
        lastPayloadSent = sub;
        if (shouldFail) {
          throw new Error("Network timeout");
        }
        return {
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
            planRationale: "Final success",
            plannedRequiredMinutes: 100,
            plannedOptionalMinutes: 0,
          },
        };
      },
    };

    const controller = new TodayFlowController("sr", mockApi, { brainDump: "Veliki projekat" });

    // Prepopulate 20 answered questions in history
    const bigHistory: ClarificationHistoryEntry[] = [];
    for (let i = 1; i <= 20; i++) {
      bigHistory.push({
        roundIndex: Math.ceil(i / 2),
        questionId: `q${i}`,
        question: { id: `q${i}`, question: `Pitanje ${i}?`, context: "", relatedItemIds: [], materialImpact: "priority" },
        context: "",
        materialImpact: "priority",
        relatedItemIds: [],
        answer: `Odgovor na pitanje ${i}`,
      });
    }

    controller.restoreDraft({
      phase: "clarification_needed",
      language: "sr",
      inputData: { brainDump: "Veliki projekat", stateNote: "" },
      questions: [{ id: "q21", question: "Pitanje 21?", context: "", relatedItemIds: [], materialImpact: "priority" }],
      answers: { q21: "Odgovor 21" },
      unknowns: {},
      history: bigHistory,
      roundIndex: 11,
      showSummaryOptions: true,
      planDraft: null,
      error: null,
      failedPhase: null,
      unsaved: true,
    });

    assert.strictEqual(controller.getState().history.length, 20);

    // Submit resolve -> fails with network error
    await controller.submitResolve();

    assert.strictEqual(controller.getState().phase, "error");
    assert.strictEqual(controller.getState().failedPhase, "resolve");
    assert.strictEqual(controller.getState().history.length, 21, "All 21 answers must remain preserved");

    // All answers in state must be preserved
    assert.strictEqual(controller.getState().answers["q21"], "Odgovor 21");

    // Retry must repeat the exact resolve call without wiping answers or re-asking
    shouldFail = false;
    await controller.retry();

    assert.strictEqual(controller.getState().phase, "plan_ready");
    assert.strictEqual(resolveCallsCount, 2);
    assert.strictEqual(lastPayloadSent!.clarificationAnswers.length, 21);
    assert.strictEqual(lastPayloadSent!.clarificationAnswers[20].questionId, "q21");
    assert.strictEqual(lastPayloadSent!.clarificationAnswers[20].answer, "Odgovor 21");
  }

  console.log("🎉 All Clarification Multi-Round Wiring Tests Passed Successfully!");
}

runClarificationMultiRoundWiringTests().catch((e) => {
  console.error("Clarification Multi-Round Wiring Test failed:", e);
  process.exit(1);
});
