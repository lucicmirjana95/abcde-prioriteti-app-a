import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import PlanCreationDisclosure from "./PlanCreationDisclosure";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", { url: "http://localhost" });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).KeyboardEvent = dom.window.KeyboardEvent;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Minimal CSS custom property shim so style lookups don't crash
(dom.window as any).CSS = { supports: () => false };

function clickElement(el: Element) {
  const propsKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  if (propsKey && (el as any)[propsKey]?.onClick) {
    (el as any)[propsKey].onClick({ preventDefault: () => {}, stopPropagation: () => {} });
  } else {
    el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  }
}

function keydownElement(el: Element, key: string) {
  const propsKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  if (propsKey && (el as any)[propsKey]?.onKeyDown) {
    (el as any)[propsKey].onKeyDown({ key, preventDefault: () => {}, stopPropagation: () => {} });
  } else {
    el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true }));
  }
}

const container = dom.window.document.getElementById("root")!;

async function runTests() {
  console.log("Running PlanCreationDisclosure tests...");

  // ── Test 1: Default state is CLOSED ──────────────────────────────────────
  console.log("▶ Test 1: Default state is closed (aria-expanded=false)");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "sr" })); });
    const btn = container.querySelector("button[aria-expanded]")!;
    assert.equal(btn.getAttribute("aria-expanded"), "false", "Must start closed");
    await act(async () => { root.unmount(); });
  }

  // ── Test 2: Click opens ───────────────────────────────────────────────────
  console.log("▶ Test 2: Click toggles open");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "sr" })); });
    const btn = container.querySelector("button[aria-expanded]")!;
    await act(async () => { clickElement(btn); });
    assert.equal(btn.getAttribute("aria-expanded"), "true", "Must be open after click");
    await act(async () => { root.unmount(); });
  }

  // ── Test 3: Second click closes ───────────────────────────────────────────
  console.log("▶ Test 3: Second click closes");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "sr" })); });
    const btn = container.querySelector("button[aria-expanded]")!;
    await act(async () => { clickElement(btn); });
    await act(async () => { clickElement(btn); });
    assert.equal(btn.getAttribute("aria-expanded"), "false", "Must be closed after second click");
    await act(async () => { root.unmount(); });
  }

  // ── Test 4: Keyboard Enter toggles ────────────────────────────────────────
  console.log("▶ Test 4: Enter key opens");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "sr" })); });
    const btn = container.querySelector("button[aria-expanded]")!;
    await act(async () => { keydownElement(btn, "Enter"); });
    assert.equal(btn.getAttribute("aria-expanded"), "true", "Enter must open");
    await act(async () => { root.unmount(); });
  }

  // ── Test 5: Keyboard Space toggles ────────────────────────────────────────
  console.log("▶ Test 5: Space key opens");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "sr" })); });
    const btn = container.querySelector("button[aria-expanded]")!;
    await act(async () => { keydownElement(btn, " "); });
    assert.equal(btn.getAttribute("aria-expanded"), "true", "Space must open");
    await act(async () => { root.unmount(); });
  }

  // ── Test 6: aria-expanded and aria-controls wiring ───────────────────────
  console.log("▶ Test 6: aria-controls points to region id");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "en" })); });
    const btn = container.querySelector("button[aria-expanded]")!;
    const controlsId = btn.getAttribute("aria-controls");
    assert.ok(controlsId, "aria-controls must be set");
    const region = container.querySelector(`[id="${controlsId}"]`);
    assert.ok(region, "region must exist with matching id");
    assert.equal(region!.getAttribute("role"), "region");
    await act(async () => { root.unmount(); });
  }

  // ── Test 7: SR text renders in Serbian ───────────────────────────────────
  console.log("▶ Test 7: Serbian text renders correctly");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "sr" })); });
    const text = container.textContent || "";
    assert.ok(text.includes("Kako nastaje tvoj plan?"), "SR header title must render");
    assert.ok(text.includes("Uneseš šta ti je na umu"), "SR header desc must render");
    await act(async () => { root.unmount(); });
  }

  // ── Test 8: EN text renders in English ───────────────────────────────────
  console.log("▶ Test 8: English text renders correctly");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "en" })); });
    const text = container.textContent || "";
    assert.ok(text.includes("How is your plan created?"), "EN header title must render");
    await act(async () => { root.unmount(); });
  }

  // ── Test 9: TR text renders in Turkish ───────────────────────────────────
  console.log("▶ Test 9: Turkish text renders correctly");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "tr" })); });
    const text = container.textContent || "";
    assert.ok(text.includes("Planın nasıl oluşturulur?"), "TR header title must render");
    await act(async () => { root.unmount(); });
  }

  // ── Test 10: Step 2 content mentions Energija/Energy, not available time ─
  console.log("▶ Test 10: Step 2 mentions Energy/Pleasantness, not available time");
  {
    for (const lang of ["sr", "en", "tr"] as const) {
      const root = createRoot(container);
      await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: lang })); });
      // Open it
      const btn = container.querySelector("button[aria-expanded]")!;
      await act(async () => { clickElement(btn); });
      const text = container.textContent || "";
      // Must mention energy/pleasantness concept
      const mentionsEnergy = text.includes("Energija") || text.includes("Energy") || text.includes("Enerji");
      assert.ok(mentionsEnergy, `[${lang}] Step 2 must mention energy`);
      // Must NOT mention "available time" / "raspoloživo vreme"
      const mentionsAvailableTime = text.includes("raspoloživo vreme") || text.includes("available time") || text.includes("mevcut süre");
      assert.ok(!mentionsAvailableTime, `[${lang}] Must NOT mention available time`);
      await act(async () => { root.unmount(); });
    }
  }

  // ── Test 11: No form submission on toggle ─────────────────────────────────
  console.log("▶ Test 11: Does not submit form on toggle");
  {
    let submitted = false;
    const root = createRoot(container);
    const formEl = dom.window.document.createElement("form");
    formEl.addEventListener("submit", () => { submitted = true; });
    container.appendChild(formEl);
    // Render inside a form wrapper
    const formRoot = createRoot(formEl);
    await act(async () => { formRoot.render(React.createElement(PlanCreationDisclosure, { language: "sr" })); });
    const btn = formEl.querySelector("button[aria-expanded]")!;
    await act(async () => { clickElement(btn); });
    assert.ok(!submitted, "Toggle must not submit the form");
    await act(async () => { formRoot.unmount(); });
    container.removeChild(formEl);
  }

  // ── Test 12: No duplicate disclosure regions ──────────────────────────────
  console.log("▶ Test 12: Only one button[aria-expanded] rendered");
  {
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(PlanCreationDisclosure, { language: "sr" })); });
    const btns = container.querySelectorAll("button[aria-expanded]");
    assert.equal(btns.length, 1, "Must have exactly one toggle button");
    await act(async () => { root.unmount(); });
  }

  console.log("🎉 All PlanCreationDisclosure tests passed!");
  process.exit(0);
}

runTests().catch((e) => {
  console.error("PlanCreationDisclosure test failed:", e);
  process.exit(1);
});
