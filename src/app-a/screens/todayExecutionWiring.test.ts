import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import TodayExecutionScreen from "../components/daily-reset/TodayExecutionScreen";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import {
  movePlanItemToBlock,
  reorderPlanItems,
  toggleItemCompletion,
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

function createSampleExecutionDraft(): DailyPlanDraft {
  return {
    planRationale: "Izvršavanje plana",
    availableMinutes: 180,
    plannedRequiredMinutes: 105,
    plannedFlexibleMinutes: 75,
    plannedFixedMinutes: 30,
    plannedOptionalMinutes: 30,
    classifiedItems: [
      { id: "c1", originalText: "Prioritetan zadatak 1", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "P1" } },
      { id: "c2", originalText: "Zadatak 2", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "P2" } },
      { id: "c_wait", originalText: "Čekam povratnu informaciju", kind: "waiting_for", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "Wait" } },
      { id: "c_fix", originalText: "Fiksni termin u 11h", kind: "task", timeHorizon: "today", timeSensitivity: "deadline", isAmbiguous: false, needsCheck: false, priority: { explanation: "Fix" } },
    ],
    firstFocus: [
      { id: "p1", sourceItemIds: ["c1"], title: "Prioritetan zadatak 1", block: "first_focus", estimatedMinutes: 45, requiredEnergy: 3, timeSensitivity: "none", needsCheck: false, priority: { explanation: "P1" }, capacityType: "flexible" },
    ],
    laterToday: [
      { id: "p2", sourceItemIds: ["c2"], title: "Zadatak 2", block: "later_today", estimatedMinutes: 30, requiredEnergy: 2, timeSensitivity: "none", needsCheck: false, priority: { explanation: "P2" }, capacityType: "flexible" },
      { id: "p_wait", sourceItemIds: ["c_wait"], title: "Čekam povratnu informaciju", block: "later_today", estimatedMinutes: 15, requiredEnergy: 1, timeSensitivity: "none", needsCheck: false, priority: { explanation: "Wait" }, capacityType: "flexible" },
      { id: "p_fix", sourceItemIds: ["c_fix"], title: "Fiksni termin u 11h", block: "later_today", estimatedMinutes: 30, requiredEnergy: 2, timeSensitivity: "deadline", needsCheck: false, priority: { explanation: "Fix" }, capacityType: "fixed" },
    ],
    ifCapacityRemains: [
      { id: "p_opt", sourceItemIds: ["c1"], title: "Opciona stavka", block: "if_capacity_remains", estimatedMinutes: 30, requiredEnergy: 1, timeSensitivity: "none", needsCheck: false, priority: { explanation: "Opt" }, capacityType: "flexible" },
    ],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    intervention: {
      title: "Pauza i šetnja 10 minuta",
      description: "Ustani i protegni se na kratko",
      type: "rest",
      estimatedMinutes: 10,
      reason: "Održi energiju",
    },
  };
}

async function runTodayExecutionWiringTests() {
  console.log("Running Real React/JSDOM TodayExecutionScreen Wiring Tests...");
  const container = dom.window.document.getElementById("root")!;

  // -------------------------------------------------------------
  // Test 1: Rendering of Next Focus hero card and blocks
  // -------------------------------------------------------------
  console.log("▶ Test 1: Rendering Next Focus hero card, intervention and plan blocks");
  {
    const root = createRoot(container);
    const draft = createSampleExecutionDraft();

    await act(async () => {
      root.render(
        React.createElement(TodayExecutionScreen, {
          draft,
          language: "sr",
          completedItemIds: [],
          updatingItemId: null,
          error: null,
          onToggle: () => {},
          onEditPlan: () => {},
          defaultFocusMinutes: 25,
          onOpenReset: () => {},
          onQuickAddToday: async () => ({ status: "saved" as const }),
          onQuickSaveLater: async () => true,
        })
      );
    });

    const text = container.textContent || "";
    assert.ok(text.includes("Prioritetan zadatak 1"), "Must display hero/first focus task");
    assert.ok(text.includes("Pauza i šetnja 10 minuta"), "Must render safe intervention card");
    assert.ok(text.includes("Zadatak 2"), "Must display later today task");
    assert.ok(text.includes("Opciona stavka"), "Must display optional task");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 2: Toggle completion calls onToggle with exact itemId
  // -------------------------------------------------------------
  console.log("▶ Test 2: Task checkbox click triggers onToggle(itemId)");
  {
    const root = createRoot(container);
    const draft = createSampleExecutionDraft();
    let toggledItemId: string | null = null;

    await act(async () => {
      root.render(
        React.createElement(TodayExecutionScreen, {
          draft,
          language: "sr",
          completedItemIds: [],
          updatingItemId: null,
          error: null,
          onToggle: (id: string) => {
            toggledItemId = id;
          },
          onEditPlan: () => {},
          defaultFocusMinutes: 25,
          onOpenReset: () => {},
          onQuickAddToday: async () => ({ status: "saved" as const }),
          onQuickSaveLater: async () => true,
        })
      );
    });

    const toggleButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent?.includes("Završi") || b.getAttribute("aria-pressed") !== null
    );
    assert.ok(toggleButtons.length > 0, "Completion toggle buttons must exist");

    await act(async () => {
      clickElement(toggleButtons[0]);
    });

    assert.strictEqual(toggledItemId, "p1", "First item toggle button must pass 'p1'");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 3: In-flight updatingItemId disables toggle and blocks double click
  // -------------------------------------------------------------
  console.log("▶ Test 3: Updating item state disables toggle button and blocks multi-click");
  {
    const root = createRoot(container);
    const draft = createSampleExecutionDraft();
    let toggleCalls = 0;

    await act(async () => {
      root.render(
        React.createElement(TodayExecutionScreen, {
          draft,
          language: "sr",
          completedItemIds: [],
          updatingItemId: "p1", // In flight
          error: null,
          onToggle: () => {
            toggleCalls++;
          },
          onEditPlan: () => {},
          defaultFocusMinutes: 25,
          onOpenReset: () => {},
          onQuickAddToday: async () => ({ status: "saved" as const }),
          onQuickSaveLater: async () => true,
        })
      );
    });

    const p1Toggle = Array.from(container.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Prioritetan zadatak 1" || (b.textContent?.includes("Završi") && b.hasAttribute("disabled"))
    );
    assert.ok(p1Toggle, "p1 toggle button must be rendered");
    assert.strictEqual(p1Toggle.hasAttribute("disabled"), true, "Toggle must be disabled while updating");

    await act(async () => {
      clickElement(p1Toggle);
      clickElement(p1Toggle);
    });

    assert.strictEqual(toggleCalls, 0, "No onToggle calls allowed during in-flight update");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 4: Fixed commitments and waiting-for reorder invariants
  // -------------------------------------------------------------
  console.log("▶ Test 4: Invariants - fixed tasks locked, waiting-for blocked from first focus");
  {
    const draft = createSampleExecutionDraft();

    // 1. Fixed task cannot be moved
    const moveFix = movePlanItemToBlock(draft, "p_fix", "first_focus");
    assert.strictEqual(moveFix.error, "cannot_move_fixed_task");

    // 2. Fixed task cannot be reordered
    const reorderFix = reorderPlanItems(draft, "p_fix", "up");
    assert.strictEqual(reorderFix.error, "cannot_reorder_fixed_task");

    // 3. Waiting-for cannot enter first focus
    const waitItem = draft.laterToday.find((i) => i.id === "p_wait")!;
    assert.strictEqual(isWaitingForItem(waitItem, draft), true);
    const moveWait = movePlanItemToBlock(draft, "p_wait", "first_focus");
    assert.strictEqual(moveWait.error, "waiting_for_cannot_be_first_focus");
  }

  // -------------------------------------------------------------
  // Test 5: Reorder buttons touch targets are at least 44x44px
  // -------------------------------------------------------------
  console.log("▶ Test 5: Reorder touch targets maintain >= 44x44px accessibility standard");
  {
    const root = createRoot(container);
    const draft = createSampleExecutionDraft();

    await act(async () => {
      root.render(
        React.createElement(TodayExecutionScreen, {
          draft,
          language: "sr",
          completedItemIds: [],
          updatingItemId: null,
          error: null,
          onToggle: () => {},
          onEditPlan: () => {},
          defaultFocusMinutes: 25,
          onOpenReset: () => {},
          onQuickAddToday: async () => ({ status: "saved" as const }),
          onQuickSaveLater: async () => true,
        })
      );
    });

    const reorderButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.getAttribute("aria-label")?.includes("Pomeri") || b.getAttribute("aria-label")?.includes("Move")
    );

    assert.ok(reorderButtons.length > 0, "At least one reorder button must be rendered");

    for (const btn of reorderButtons) {
      const cls = btn.className || "";
      assert.ok(
        cls.includes("min-h-[44px]") && cls.includes("min-w-[44px]"),
        `Reorder button class ${cls} must include min-h-[44px] and min-w-[44px]`
      );
    }

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 6: Toggle Item Completion with Undo support
  // -------------------------------------------------------------
  console.log("▶ Test 6: Toggle Item Completion domain helper supports undo");
  {
    const draft = createSampleExecutionDraft();
    const c1 = toggleItemCompletion(draft, [], "p1");
    assert.deepStrictEqual(c1.completedItemIds, ["p1"]);

    // Untoggle
    const c2 = toggleItemCompletion(draft, c1.completedItemIds, "p1");
    assert.deepStrictEqual(c2.completedItemIds, []);
  }

  console.log("🎉 All TodayExecutionScreen Wiring Tests Passed Successfully!");
  process.exit(0);
}

runTodayExecutionWiringTests().catch((e) => {
  console.error("TodayExecutionScreen Wiring Test failed:", e);
  process.exit(1);
});
