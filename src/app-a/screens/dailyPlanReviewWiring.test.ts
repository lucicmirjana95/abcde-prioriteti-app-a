import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import DailyPlanReview from "../components/daily-reset/DailyPlanReview";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import {
  movePlanItemToBlock,
  reorderPlanItems,
  updatePlanItemTitle,
  isWaitingForItem,
} from "../domain/daily-reset/planMutations";

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
  if (element.disabled || element.hasAttribute?.("disabled")) return;
  const propsKey = Object.keys(element).find((k) => k.startsWith("__reactProps$"));
  if (propsKey && element[propsKey]?.onClick) {
    element[propsKey].onClick({ preventDefault: () => {}, stopPropagation: () => {} });
  } else {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  }
}

function createSampleDraft(): DailyPlanDraft {
  return {
    planRationale: "Fokus na ključne stvari",
    availableMinutes: 180,
    plannedRequiredMinutes: 90,
    plannedFlexibleMinutes: 90,
    plannedFixedMinutes: 30,
    plannedOptionalMinutes: 30,
    classifiedItems: [
      { id: "c1", originalText: "Zadatak 1", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "P1" } },
      { id: "c2", originalText: "Zadatak 2", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "P2" } },
      { id: "c3", originalText: "Zadatak 3", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "P3" } },
      { id: "c_wait", originalText: "Čekam odgovor Marka", kind: "waiting_for", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "Wait" } },
      { id: "c_fix", originalText: "Sastanak u 14h", kind: "task", timeHorizon: "today", timeSensitivity: "deadline", isAmbiguous: false, needsCheck: false, priority: { explanation: "Fix" } },
    ],
    firstFocus: [
      { id: "p1", sourceItemIds: ["c1"], title: "Zadatak 1", block: "first_focus", estimatedMinutes: 45, requiredEnergy: 3, timeSensitivity: "none", needsCheck: false, priority: { explanation: "P1" }, capacityType: "flexible" },
      { id: "p2", sourceItemIds: ["c2"], title: "Zadatak 2", block: "first_focus", estimatedMinutes: 45, requiredEnergy: 3, timeSensitivity: "none", needsCheck: false, priority: { explanation: "P2" }, capacityType: "flexible" },
    ],
    laterToday: [
      { id: "p3", sourceItemIds: ["c3"], title: "Zadatak 3", block: "later_today", estimatedMinutes: 30, requiredEnergy: 2, timeSensitivity: "none", needsCheck: false, priority: { explanation: "P3" }, capacityType: "flexible" },
      { id: "p_wait", sourceItemIds: ["c_wait"], title: "Čekam odgovor Marka", block: "later_today", estimatedMinutes: 15, requiredEnergy: 1, timeSensitivity: "none", needsCheck: false, priority: { explanation: "Wait" }, capacityType: "flexible" },
      { id: "p_fix", sourceItemIds: ["c_fix"], title: "Sastanak u 14h", block: "later_today", estimatedMinutes: 30, requiredEnergy: 2, timeSensitivity: "deadline", needsCheck: false, priority: { explanation: "Fix" }, capacityType: "fixed" },
    ],
    ifCapacityRemains: [
      { id: "p_opt", sourceItemIds: ["c1"], title: "Opcioni zadatak", block: "if_capacity_remains", estimatedMinutes: 30, requiredEnergy: 1, timeSensitivity: "none", needsCheck: false, priority: { explanation: "Opt" }, capacityType: "flexible" },
    ],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
  };
}

async function runDailyPlanReviewWiringTests() {
  console.log("Running Real React/JSDOM DailyPlanReview Wiring Tests...");
  const container = dom.window.document.getElementById("root")!;

  // -------------------------------------------------------------
  // Test 1: Rendering of DailyPlanReview without tabs (single vertical view)
  // -------------------------------------------------------------
  console.log("▶ Test 1: Single vertical view renders 'Zašto ovako', 'Prvi fokus', 'Kasnije danas', 'Ako ostane kapaciteta'");
  {
    const root = createRoot(container);
    const draft = createSampleDraft();

    await act(async () => {
      root.render(
        React.createElement(DailyPlanReview, {
          initialDraft: draft,
          language: "sr",
          onBackToEdit: () => {},
          onConfirm: async () => {},
        })
      );
    });

    const text = container.textContent || "";
    assert.ok(text.includes("Zašto ovako"), "Must include 'Zašto ovako' section");
    assert.ok(text.includes("Prvi fokus"), "Must include 'Prvi fokus' section");
    assert.ok(text.includes("Kasnije danas"), "Must include 'Kasnije danas' section");
    assert.ok(text.includes("Ako ostane kapaciteta"), "Must include 'Ako ostane kapaciteta' section");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 2: Moving items across blocks and enforcing First Focus limit (max 3)
  // -------------------------------------------------------------
  console.log("▶ Test 2: Block transitions and enforcing First Focus max 3 flexible limit");
  {
    const draft = createSampleDraft();
    // Move p3 to first_focus -> should succeed (now 3 flexible items)
    const res1 = movePlanItemToBlock(draft, "p3", "first_focus");
    assert.strictEqual(res1.error, undefined);
    assert.strictEqual(res1.draft.firstFocus.length, 3);
    assert.strictEqual(res1.draft.manualPriorityOverride, true);

    // Attempting to move a 4th flexible item to first_focus -> blocked with first_focus_limit_exceeded
    const res2 = movePlanItemToBlock(res1.draft, "p_opt", "first_focus");
    assert.strictEqual(res2.error, "first_focus_limit_exceeded");
    assert.strictEqual(res2.draft.firstFocus.length, 3);
  }

  // -------------------------------------------------------------
  // Test 3: Fixed commitments and waiting-for restrictions
  // -------------------------------------------------------------
  console.log("▶ Test 3: Fixed commitments locked and waiting-for blocked from First Focus");
  {
    const draft = createSampleDraft();

    // Invariant: Fixed commitment cannot be moved
    const resFix = movePlanItemToBlock(draft, "p_fix", "first_focus");
    assert.strictEqual(resFix.error, "cannot_move_fixed_task");

    // Invariant: Fixed commitment cannot be reordered
    const resReorderFix = reorderPlanItems(draft, "p_fix", "up");
    assert.strictEqual(resReorderFix.error, "cannot_reorder_fixed_task");

    // Invariant: Waiting-for item cannot enter First Focus
    assert.strictEqual(isWaitingForItem(draft.laterToday.find(i => i.id === "p_wait")!, draft), true);
    const resWait = movePlanItemToBlock(draft, "p_wait", "first_focus");
    assert.strictEqual(resWait.error, "waiting_for_cannot_be_first_focus");
  }

  // -------------------------------------------------------------
  // Test 4: Reordering items updates draft and sets manualPriorityOverride
  // -------------------------------------------------------------
  console.log("▶ Test 4: Reordering items updates draft order and sets manualPriorityOverride");
  {
    const draft = createSampleDraft();
    assert.strictEqual(draft.firstFocus[0].id, "p1");
    assert.strictEqual(draft.firstFocus[1].id, "p2");

    const reordered = reorderPlanItems(draft, "p1", "down");
    assert.strictEqual(reordered.error, undefined);
    assert.strictEqual(reordered.draft.firstFocus[0].id, "p2");
    assert.strictEqual(reordered.draft.firstFocus[1].id, "p1");
    assert.strictEqual(reordered.draft.manualPriorityOverride, true);
  }

  // -------------------------------------------------------------
  // Test 5: Editing plan item title
  // -------------------------------------------------------------
  console.log("▶ Test 5: Title edit updates item and classified reference");
  {
    const draft = createSampleDraft();
    const resEmpty = updatePlanItemTitle(draft, "p1", "   ");
    assert.strictEqual(resEmpty.error, "title_cannot_be_empty");

    const resValid = updatePlanItemTitle(draft, "p1", "Ažuriran naziv zadatka 1");
    assert.strictEqual(resValid.error, undefined);
    assert.strictEqual(resValid.draft.firstFocus[0].title, "Ažuriran naziv zadatka 1");
    assert.strictEqual(resValid.draft.classifiedItems[0].originalText, "Ažuriran naziv zadatka 1");
    assert.strictEqual(resValid.draft.manualPriorityOverride, true);
  }

  // -------------------------------------------------------------
  // Test 6: Single-flight confirm protection (double-click guard)
  // -------------------------------------------------------------
  console.log("▶ Test 6: Single-flight confirm protection prevents double submit");
  {
    const root = createRoot(container);
    let confirmCalls = 0;
    const draft = createSampleDraft();

    await act(async () => {
      root.render(
        React.createElement(DailyPlanReview, {
          initialDraft: draft,
          language: "sr",
          onBackToEdit: () => {},
          onConfirm: async () => {
            confirmCalls++;
          },
          saveStatus: "saving", // In-flight
        })
      );
    });

    const confirmBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Čuvanje") || b.textContent?.includes("Pregled završen")
    );
    assert.ok(confirmBtn);
    assert.strictEqual(confirmBtn.hasAttribute("disabled"), true, "Button must be disabled while saving");

    await act(async () => {
      clickElement(confirmBtn);
      clickElement(confirmBtn);
    });

    assert.strictEqual(confirmCalls, 0, "No duplicate confirm calls while saveStatus === saving");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 7: Save Error and Retry Mechanism in DailyPlanReview
  // -------------------------------------------------------------
  console.log("▶ Test 7: Save error displays error message and preserves plan for retry");
  {
    const root = createRoot(container);
    let retried = false;
    const draft = createSampleDraft();

    await act(async () => {
      root.render(
        React.createElement(DailyPlanReview, {
          initialDraft: draft,
          language: "sr",
          saveStatus: "error",
          saveError: "Čuvanje nije uspelo zbog greške u mreži.",
          onBackToEdit: () => {},
          onConfirm: async () => {
            retried = true;
          },
        })
      );
    });

    const text = container.textContent || "";
    assert.ok(text.includes("Čuvanje nije uspelo zbog greške u mreži."), "Error alert must be visible");

    const retryBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Pregled završen") || b.textContent?.includes("Sačuvaj")
    );
    assert.ok(retryBtn);

    await act(async () => {
      clickElement(retryBtn);
    });

    assert.strictEqual(retried, true, "Retry must re-invoke onConfirm with unmodified draft");

    await act(async () => {
      root.unmount();
    });
  }

  console.log("🎉 All DailyPlanReview Wiring Tests Passed Successfully!");
  process.exit(0);
}

runDailyPlanReviewWiringTests().catch((e) => {
  console.error("DailyPlanReview Wiring Test failed:", e);
  process.exit(1);
});
