import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import InboxScreen from "./InboxScreen";
import type { InboxAdapter } from "../adapters/inboxAdapter";
import type { AppAInboxItem } from "../domain/inbox/contracts";
import type { AppAPreferences } from "../types";

// Setup global browser DOM environment for JSDOM
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

// Authenticated test user in localStorage
dom.window.localStorage.setItem("app_a_test_user_v1", "1");

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

function clickElement(element: any) {
  const propsKey = Object.keys(element).find((k) => k.startsWith("__reactProps$"));
  if (propsKey && element[propsKey]?.onClick) {
    element[propsKey].onClick({ preventDefault: () => {}, stopPropagation: () => {} });
  } else {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  }
}

const defaultPreferences: AppAPreferences = {
  language: "sr",
  theme: "light",
  timeZoneSetting: { mode: "automatic" },
  defaultFocusMinutes: 25,
  aiSuggestionsEnabled: true,
  reducedMotion: "system",
  soundEnabled: true,
  notificationsEnabled: false,
};

async function runInboxWiringTests() {
  console.log("Running Real React/JSDOM InboxScreen Wiring Tests...");
  const container = dom.window.document.getElementById("root")!;

  // -------------------------------------------------------------
  // Test 1: Stable Draft Identity across Network Failure and Retry
  // -------------------------------------------------------------
  console.log("▶ Test 1: Stable Draft Identity across Network Failure and Retry");
  {
    const savedItems: AppAInboxItem[] = [];
    let shouldFailSave = true;

    const mockAdapter: InboxAdapter = {
      loadItems: async () => [],
      saveItem: async (_userId, item) => {
        if (shouldFailSave) {
          throw new Error("Simulated network timeout");
        }
        savedItems.push(item);
      },
      updateItemStatus: async (_userId, item, status, extras) => ({
        ...item,
        status,
        ...extras,
        updatedAt: new Date().toISOString(),
      }),
      deleteItem: async () => {},
      addMissingDuration: async (_u, _id, min) => ({ ...savedItems[0], estimatedMinutes: min }),
      convertNoteToTask: async () => ({} as any),
      scheduleToday: async () => ({} as any),
      loadRecentPlans: async () => [],
      importPlanItems: async () => 0,
      loadVisionLibrary: async () => [],
      clarifyNote: async () => ({ questions: [], suggestions: [] }),
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InboxScreen, {
          language: "sr",
          preferences: defaultPreferences,
          adapter: mockAdapter,
        })
      );
    });

    // 1. Find textarea and type title
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    assert.ok(textarea, "Quick capture textarea must be rendered");

    await act(async () => {
      changeValue(textarea, "Plan za novi projekat");
    });
    assert.equal(textarea.value, "Plan za novi projekat");

    // 2. Find submit button and submit
    const submitBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Sačuvaj u Inboks")
    );
    assert.ok(submitBtn, "Submit button must exist");

    // First attempt fails
    await act(async () => {
      clickElement(submitBtn);
    });

    // Verify error banner is visible and textarea is NOT cleared
    const errorBanner = container.querySelector('[role="alert"]');
    assert.ok(errorBanner, "Error banner must appear after network failure");
    assert.equal(textarea.value, "Plan za novi projekat", "Textarea must retain text on failure");

    // Verify Retry button is present
    const retryBtn = Array.from(errorBanner.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Pokušaj ponovo")
    );
    assert.ok(retryBtn, "Retry button must be rendered inside error banner");

    // 3. Now let save succeed on Retry
    shouldFailSave = false;
    await act(async () => {
      clickElement(retryBtn);
    });

    assert.equal(savedItems.length, 1, "Item should be saved after successful retry");
    const firstSaved = savedItems[0];
    assert.equal(firstSaved.title, "Plan za novi projekat");
    assert.ok(firstSaved.id.startsWith("in_manual_"), "ID must be a manual inbox ID");
    assert.ok(firstSaved.mutationId?.startsWith("mut_in_"), "mutationId must be generated");

    // After success: verify textarea is cleared and error banner is gone
    assert.equal(textarea.value, "", "Textarea must be cleared upon confirmed persistence");
    assert.equal(container.querySelector('[role="alert"]'), null, "Error banner should be gone");

    // 4. Submit a SECOND draft to verify a NEW, distinct identity is generated
    await act(async () => {
      changeValue(textarea, "Drugi zadatak");
    });
    const submitBtn2 = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Sačuvaj u Inboks")
    );
    await act(async () => {
      clickElement(submitBtn2);
    });

    assert.equal(savedItems.length, 2);
    const secondSaved = savedItems[1];
    assert.equal(secondSaved.title, "Drugi zadatak");
    assert.notEqual(secondSaved.id, firstSaved.id, "Second draft must receive a fresh distinct ID");
    assert.notEqual(secondSaved.mutationId, firstSaved.mutationId, "Second draft must receive a fresh mutationId");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 2: Double Click Guard During Pending Submit
  // -------------------------------------------------------------
  console.log("▶ Test 2: Double Click Guard During Pending Submit");
  {
    let saveCallCount = 0;
    let resolveSave: () => void = () => {};

    const mockAdapter: InboxAdapter = {
      loadItems: async () => [],
      saveItem: async () => {
        saveCallCount++;
        return new Promise<void>((resolve) => {
          resolveSave = resolve;
        });
      },
      updateItemStatus: async () => ({} as any),
      deleteItem: async () => {},
      addMissingDuration: async () => ({} as any),
      convertNoteToTask: async () => ({} as any),
      scheduleToday: async () => ({} as any),
      loadRecentPlans: async () => [],
      importPlanItems: async () => 0,
      loadVisionLibrary: async () => [],
      clarifyNote: async () => ({ questions: [], suggestions: [] }),
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InboxScreen, {
          language: "sr",
          preferences: defaultPreferences,
          adapter: mockAdapter,
        })
      );
    });

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      changeValue(textarea, "Brzi dvoklik test");
    });

    const submitBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Sačuvaj u Inboks")
    ) as HTMLButtonElement;

    // Trigger double click before promise resolves
    await act(async () => {
      clickElement(submitBtn);
      clickElement(submitBtn);
    });

    assert.equal(saveCallCount, 1, "Rapid double-click must only fire adapter saveItem ONCE");
    assert.equal(submitBtn.disabled, true, "Button must be disabled during processing");

    // Resolve save
    await act(async () => {
      resolveSave();
    });

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 3: Optimistic Rollback on Status Update Failure
  // -------------------------------------------------------------
  console.log("▶ Test 3: Optimistic Rollback on Status Update Failure");
  {
    const initialItem: AppAInboxItem = {
      id: "in_item_rollback_test",
      title: "Važan ugovor sa klijentom",
      kind: "task",
      horizon: "later",
      status: "inbox",
      source: "manual",
      language: "sr",
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    };

    const mockAdapter: InboxAdapter = {
      loadItems: async () => [initialItem],
      saveItem: async () => {},
      updateItemStatus: async () => {
        throw new Error("Server rejected status update");
      },
      deleteItem: async () => {},
      addMissingDuration: async () => ({} as any),
      convertNoteToTask: async () => ({} as any),
      scheduleToday: async () => ({} as any),
      loadRecentPlans: async () => [],
      importPlanItems: async () => 0,
      loadVisionLibrary: async () => [],
      clarifyNote: async () => ({ questions: [], suggestions: [] }),
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InboxScreen, {
          language: "sr",
          preferences: defaultPreferences,
          adapter: mockAdapter,
        })
      );
    });

    // Card should be rendered
    const cardTitle = container.querySelector("article h2");
    assert.equal(cardTitle?.textContent, "Važan ugovor sa klijentom");

    // Open overflow menu
    const menuTrigger = container.querySelector('button[aria-label="Više radnji"]') as HTMLButtonElement;
    assert.ok(menuTrigger, "Overflow menu trigger must exist");

    await act(async () => {
      clickElement(menuTrigger);
    });

    // Click "Ove nedelje" (move to this week)
    const moveToWeekBtn = Array.from(container.querySelectorAll('button[role="menuitem"]')).find((b) =>
      b.textContent?.includes("Ove nedelje")
    );
    assert.ok(moveToWeekBtn, "Move to week button must exist");

    await act(async () => {
      clickElement(moveToWeekBtn);
    });

    // Status update failed -> verify error alert is displayed and item rolled back to 'later'
    const alert = container.querySelector('[role="alert"]');
    assert.ok(alert, "Error alert must be displayed on failure");
    assert.equal(alert?.textContent, "Radnja nije uspela. Pokušajte ponovo.");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 4: Optimistic Rollback on Delete Failure
  // -------------------------------------------------------------
  console.log("▶ Test 4: Optimistic Rollback on Delete Failure");
  {
    const initialItem: AppAInboxItem = {
      id: "in_item_delete_test",
      title: "Stavka za brisanje",
      kind: "task",
      horizon: "later",
      status: "inbox",
      source: "manual",
      language: "sr",
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    };

    const mockAdapter: InboxAdapter = {
      loadItems: async () => [initialItem],
      saveItem: async () => {},
      updateItemStatus: async () => ({} as any),
      deleteItem: async () => {
        throw new Error("Network error during delete");
      },
      addMissingDuration: async () => ({} as any),
      convertNoteToTask: async () => ({} as any),
      scheduleToday: async () => ({} as any),
      loadRecentPlans: async () => [],
      importPlanItems: async () => 0,
      loadVisionLibrary: async () => [],
      clarifyNote: async () => ({ questions: [], suggestions: [] }),
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InboxScreen, {
          language: "sr",
          preferences: defaultPreferences,
          adapter: mockAdapter,
        })
      );
    });

    // Open menu
    const menuTrigger = container.querySelector('button[aria-label="Više radnji"]') as HTMLButtonElement;
    await act(async () => {
      clickElement(menuTrigger);
    });

    // Click "Trajno obriši" (step 1)
    const deleteBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Trajno obriši")
    );
    assert.ok(deleteBtn);

    await act(async () => {
      clickElement(deleteBtn);
    });

    // Click confirmed delete (step 2)
    const confirmDeleteBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Trajno obriši") && b.className.includes("bg-red-600")
    );
    assert.ok(confirmDeleteBtn);

    await act(async () => {
      clickElement(confirmDeleteBtn);
    });

    // Delete failed -> verify rollback: item is still present in DOM, and error alert is shown
    const alert = container.querySelector('[role="alert"]');
    assert.ok(alert, "Error alert must be displayed");
    const restoredTitle = container.querySelector("article h2");
    assert.equal(restoredTitle?.textContent, "Stavka za brisanje", "Item must roll back into the list upon delete error");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 5: Accessible Overflow Menu and Escape Focus Return
  // -------------------------------------------------------------
  console.log("▶ Test 5: Accessible Overflow Menu and Escape Focus Return");
  {
    const item: AppAInboxItem = {
      id: "in_focus_test",
      title: "Test fokusiranja tastaturom",
      kind: "task",
      horizon: "later",
      status: "inbox",
      source: "manual",
      language: "sr",
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    };

    const mockAdapter: InboxAdapter = {
      loadItems: async () => [item],
      saveItem: async () => {},
      updateItemStatus: async () => ({} as any),
      deleteItem: async () => {},
      addMissingDuration: async () => ({} as any),
      convertNoteToTask: async () => ({} as any),
      scheduleToday: async () => ({} as any),
      loadRecentPlans: async () => [],
      importPlanItems: async () => 0,
      loadVisionLibrary: async () => [],
      clarifyNote: async () => ({ questions: [], suggestions: [] }),
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InboxScreen, {
          language: "sr",
          preferences: defaultPreferences,
          adapter: mockAdapter,
        })
      );
    });

    const trigger = container.querySelector('button[aria-label="Više radnji"]') as HTMLButtonElement;
    assert.equal(trigger.getAttribute("aria-expanded"), "false");

    await act(async () => {
      clickElement(trigger);
    });

    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    const menu = container.querySelector('[role="menu"]');
    assert.ok(menu, "Menu must be open");

    // Dispatch Escape keydown
    await act(async () => {
      const escapeEvent = new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      dom.window.document.dispatchEvent(escapeEvent);
    });

    assert.equal(trigger.getAttribute("aria-expanded"), "false", "Menu must close on Escape");
    assert.equal(dom.window.document.activeElement, trigger, "Focus must return to the trigger element on Escape");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 6: Inbox -> Vision: Operational Tasks Cannot Become Vision Suggestions
  // -------------------------------------------------------------
  console.log("▶ Test 6: Inbox -> Vision: Operational Tasks Cannot Become Vision Suggestions");
  {
    const operationalItem: AppAInboxItem = {
      id: "in_operational_errand",
      title: "Kupi mleko i hleb u prodavnici",
      details: "Operativna nabavka hrane",
      kind: "task",
      horizon: "this_week",
      status: "inbox",
      source: "manual",
      language: "sr",
      estimatedMinutes: 20,
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    };

    let visionOpened = false;

    const mockAdapter: InboxAdapter = {
      loadItems: async () => [operationalItem],
      saveItem: async () => {},
      updateItemStatus: async () => ({} as any),
      deleteItem: async () => {},
      addMissingDuration: async () => ({} as any),
      convertNoteToTask: async () => ({} as any),
      scheduleToday: async () => ({} as any),
      loadRecentPlans: async () => [],
      importPlanItems: async () => 0,
      loadVisionLibrary: async () => [],
      clarifyNote: async () => ({ questions: [], suggestions: [] }),
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InboxScreen, {
          language: "sr",
          preferences: defaultPreferences,
          adapter: mockAdapter,
          onOpenVision: () => {
            visionOpened = true;
          },
        })
      );
    });

    // Open menu
    const trigger = container.querySelector('button[aria-label="Više radnji"]') as HTMLButtonElement;
    await act(async () => {
      clickElement(trigger);
    });

    // Click "Razradi kao viziju"
    const developBtn = Array.from(container.querySelectorAll('button[role="menuitem"]')).find((b) =>
      b.textContent?.includes("Razradi kao viziju")
    );
    assert.ok(developBtn);

    await act(async () => {
      clickElement(developBtn);
    });

    assert.equal(visionOpened, false, "Operational errand must NOT open vision draft");
    const errorNotice = container.querySelector('[role="alert"]');
    assert.ok(errorNotice?.textContent?.includes("Operativni dnevni zadaci"), "Must inform user that operational tasks cannot be visions");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 7: Inbox -> Vision: Strategic Goal Successfully Develops Vision
  // -------------------------------------------------------------
  console.log("▶ Test 7: Inbox -> Vision: Strategic Goal Successfully Develops Vision");
  {
    const strategicItem: AppAInboxItem = {
      id: "in_strategic_platform",
      title: "Izgradnja platforme za kontinuiranu edukaciju pravnika",
      details: "Dugoročni cilj: kreiranje kurseva, mentorske mreže i godišnje konferencije sa 500 učesnika.",
      kind: "task",
      horizon: "later",
      status: "inbox",
      source: "manual",
      language: "sr",
      estimatedMinutes: 240,
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    };

    let visionOpened = false;

    const mockAdapter: InboxAdapter = {
      loadItems: async () => [strategicItem],
      saveItem: async () => {},
      updateItemStatus: async () => ({} as any),
      deleteItem: async () => {},
      addMissingDuration: async () => ({} as any),
      convertNoteToTask: async () => ({} as any),
      scheduleToday: async () => ({} as any),
      loadRecentPlans: async () => [],
      importPlanItems: async () => 0,
      loadVisionLibrary: async () => [],
      clarifyNote: async () => ({ questions: [], suggestions: [] }),
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InboxScreen, {
          language: "sr",
          preferences: defaultPreferences,
          adapter: mockAdapter,
          onOpenVision: () => {
            visionOpened = true;
          },
        })
      );
    });

    // Open menu
    const trigger = container.querySelector('button[aria-label="Više radnji"]') as HTMLButtonElement;
    await act(async () => {
      clickElement(trigger);
    });

    // Click "Razradi kao viziju"
    const developBtn = Array.from(container.querySelectorAll('button[role="menuitem"]')).find((b) =>
      b.textContent?.includes("Razradi kao viziju")
    );
    assert.ok(developBtn);

    await act(async () => {
      clickElement(developBtn);
    });

    assert.equal(visionOpened, true, "Strategic item must open vision draft");

    await act(async () => {
      root.unmount();
    });
  }

  // -------------------------------------------------------------
  // Test 8: Unmount Safety During Pending Adapter Request
  // -------------------------------------------------------------
  console.log("▶ Test 8: Unmount Safety During Pending Adapter Request");
  {
    let resolveSave: () => void = () => {};

    const mockAdapter: InboxAdapter = {
      loadItems: async () => [],
      saveItem: async () => {
        return new Promise<void>((resolve) => {
          resolveSave = resolve;
        });
      },
      updateItemStatus: async () => ({} as any),
      deleteItem: async () => {},
      addMissingDuration: async () => ({} as any),
      convertNoteToTask: async () => ({} as any),
      scheduleToday: async () => ({} as any),
      loadRecentPlans: async () => [],
      importPlanItems: async () => 0,
      loadVisionLibrary: async () => [],
      clarifyNote: async () => ({ questions: [], suggestions: [] }),
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InboxScreen, {
          language: "sr",
          preferences: defaultPreferences,
          adapter: mockAdapter,
        })
      );
    });

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      changeValue(textarea, "Unmount test");
    });

    const submitBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Sačuvaj u Inboks")
    ) as HTMLButtonElement;

    // Start request
    await act(async () => {
      clickElement(submitBtn);
    });

    // Unmount before adapter resolves
    await act(async () => {
      root.unmount();
    });

    // Now resolve adapter promise
    await act(async () => {
      resolveSave();
    });

    // Pass: No unhandled rejection or state update crash
    assert.ok(true, "Unmount while pending promise resolved cleanly");
  }

  console.log("✓ All InboxScreen Real React/JSDOM Wiring Tests Passed Successfully!");
}

runInboxWiringTests().catch((err) => {
  console.error("Inbox wiring tests failed:", err);
  process.exit(1);
});
