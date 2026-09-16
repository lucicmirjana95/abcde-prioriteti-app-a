import { test } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import ArchivedVisionLink from "./ArchivedVisionLink";
import type { SavedVisionStrategy } from "../../../shared/domain/vision";

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
globalThis.window = dom.window as any;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockVision: SavedVisionStrategy = {
  id: "v1",
  idea: "Learn to play guitar",
  language: "en",
  status: "archived",
  provenanceItemIds: [],
  createdAt: "2023-01-01T00:00:00Z",
  updatedAt: "2023-01-01T00:00:00Z",
  strategy: {
    outcome: "Play guitar",
    importance: "Fun",
    milestones: [],
    risks: [],
    assumptions: [],
    nextStep: "Buy guitar",
  },
  stepBreakdowns: {},
};

test("ArchivedVisionLink renders for en and calls onConnect on restore", () => {
  const rootElement = document.createElement("div");
  const root = createRoot(rootElement);
  let connected = false;

  act(() => {
    root.render(
      React.createElement(ArchivedVisionLink, {
        archivedVision: mockVision,
        language: "en",
        onConnect: () => { connected = true; }
      })
    );
  });

  const text = rootElement.textContent || "";
  assert.match(text, /A similar vision is archived: Learn to play guitar\. Restore and connect\?/);

  const buttons = Array.from(rootElement.querySelectorAll("button"));
  assert.strictEqual(buttons.length, 2);
  const restoreBtn = buttons.find(b => b.textContent === "Restore");
  assert.ok(restoreBtn);
  assert.match(restoreBtn.className, /min-h-\[44px\]/);

  act(() => {
    restoreBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  
  assert.strictEqual(connected, true);
});

test("ArchivedVisionLink renders for sr and dismiss hides it locally", () => {
  const rootElement = document.createElement("div");
  const root = createRoot(rootElement);
  let connected = false;

  act(() => {
    root.render(
      React.createElement(ArchivedVisionLink, {
        archivedVision: mockVision,
        language: "sr",
        onConnect: () => { connected = true; }
      })
    );
  });

  const text = rootElement.textContent || "";
  assert.match(text, /Slična vizija je arhivirana: Learn to play guitar\. Vrati i poveži\?/);

  const buttons = Array.from(rootElement.querySelectorAll("button"));
  const dismissBtn = buttons.find(b => b.textContent === "Odbaci");
  assert.ok(dismissBtn);
  assert.match(dismissBtn.className, /min-h-\[44px\]/);

  act(() => {
    dismissBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  
  assert.strictEqual(connected, false);
  assert.strictEqual(rootElement.textContent, ""); // Hides banner
});

test("ArchivedVisionLink renders for tr", () => {
  const rootElement = document.createElement("div");
  const root = createRoot(rootElement);

  act(() => {
    root.render(
      React.createElement(ArchivedVisionLink, {
        archivedVision: mockVision,
        language: "tr",
        onConnect: () => {}
      })
    );
  });

  const text = rootElement.textContent || "";
  assert.match(text, /Benzer bir vizyon arşivlendi: Learn to play guitar\. Geri yükle ve bağla\?/);
});
