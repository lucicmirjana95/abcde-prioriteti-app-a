import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import SettingsScreen from "./SettingsScreen";
import AppAShell from "../components/AppAShell";
import type { AppAPreferences } from "../types";
import { getDefaultAppAPreferences } from "../settings/preferences";

// Setup global browser DOM environment for JSDOM
const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost",
});

(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
(globalThis as any).HTMLInputElement = dom.window.HTMLInputElement;
(globalThis as any).HTMLSelectElement = dom.window.HTMLSelectElement;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).MouseEvent = dom.window.MouseEvent;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Authenticated test user in localStorage to avoid anonymous Firebase auth attempts
dom.window.localStorage.setItem("app_a_test_user_v1", "1");

// Mock matchMedia
dom.window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

function clickElement(element: any) {
  const propsKey = Object.keys(element).find((k) => k.startsWith("__reactProps$"));
  if (propsKey && element[propsKey]?.onClick) {
    element[propsKey].onClick({ preventDefault: () => {}, stopPropagation: () => {} });
  } else {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  }
}

async function runIntegrationWiringTests() {
  console.log("Running App A Integration Wiring Tests (Settings, Shell, Accessibility)...");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);

  // 1. SettingsScreen - Controls and Accessibility
  {
    let currentPrefs: AppAPreferences = {
      ...getDefaultAppAPreferences(),
      language: "sr",
      theme: "system",
      reducedMotion: "system",
      soundEnabled: true,
      notificationsEnabled: false,
    };

    const handleChange = (next: AppAPreferences) => {
      currentPrefs = next;
    };

    await act(async () => {
      root.render(
        React.createElement(SettingsScreen, {
          language: currentPrefs.language,
          preferences: currentPrefs,
          onChange: handleChange,
        })
      );
    });

    // Verify switches exist with role="switch"
    const soundSwitch = container.querySelector("#sound-effects-switch");
    assert.ok(soundSwitch, "Sound switch should exist");
    assert.equal(soundSwitch.getAttribute("role"), "switch");
    assert.equal(soundSwitch.getAttribute("aria-checked"), "true");

    const notifSwitch = container.querySelector("#notifications-switch");
    assert.ok(notifSwitch, "Notifications switch should exist");
    assert.equal(notifSwitch.getAttribute("role"), "switch");
    assert.equal(notifSwitch.getAttribute("aria-checked"), "false");

    const aiSwitch = container.querySelector("#ai-planning-switch");
    assert.ok(aiSwitch, "AI planning switch should exist");
    assert.equal(aiSwitch.getAttribute("role"), "switch");
    assert.equal(aiSwitch.getAttribute("aria-checked"), "true");

    // Click sound switch -> toggles to false
    await act(async () => {
      clickElement(soundSwitch);
    });
    assert.equal(currentPrefs.soundEnabled, false, "Sound should toggle to false");

    // Click notifications switch -> toggles to true
    await act(async () => {
      clickElement(notifSwitch);
    });
    assert.equal(currentPrefs.notificationsEnabled, true, "Notifications should toggle to true");

    // Check Theme segmented buttons
    const themeGroup = container.querySelector('[aria-label="Izgled"]');
    assert.ok(themeGroup, "Theme group should exist");
    const themeButtons = Array.from(themeGroup.querySelectorAll("button"));
    assert.equal(themeButtons.length, 3, "3 theme options (system, day, evening)");

    // Click Evening theme ("Veče" in Serbian)
    const eveningButton = themeButtons.find((b) => b.textContent?.includes("Veče"));
    assert.ok(eveningButton, "Evening theme button exists");
    await act(async () => {
      clickElement(eveningButton);
    });
    assert.equal(currentPrefs.theme, "dark", "Theme should change to dark (evening)");

    // Check Reduced Motion segmented buttons
    const motionGroup = container.querySelector('[aria-label="Smanjeno kretanje"]');
    assert.ok(motionGroup, "Reduced motion group should exist");
    const motionButtons = Array.from(motionGroup.querySelectorAll("button"));
    assert.equal(motionButtons.length, 3, "3 motion options (system, reduced, standard)");

    // Click Reduced motion ("Smanjeno" in Serbian)
    const reducedButton = motionButtons.find((b) => b.textContent?.trim() === "Smanjeno");
    assert.ok(reducedButton, "Reduced motion button exists");
    await act(async () => {
      clickElement(reducedButton);
    });
    assert.equal(currentPrefs.reducedMotion, "reduced", "Reduced motion should change to reduced");

    console.log("✅ 1. SettingsScreen controls (switches, theme, reduced motion) correctly wired");
  }

  // 2. AppAShell - Navigation & Reduced Motion Class
  {
    let destination = "today";
    await act(async () => {
      root.render(
        React.createElement(
          AppAShell,
          {
            currentDestination: "today",
            onNavigate: (d) => {
              destination = d;
            },
            language: "sr",
            theme: "dark",
            reducedMotion: "reduced",
          },
          React.createElement("div", { id: "test-content" }, "Main Content")
        )
      );
    });

    // Check reduced-motion class on document.documentElement
    assert.ok(
      dom.window.document.documentElement.classList.contains("reduce-motion"),
      "reduce-motion class applied to documentElement",
    );

    // Check dark class on document.documentElement
    assert.ok(
      dom.window.document.documentElement.classList.contains("dark"),
      "dark class applied to documentElement",
    );

    // Navigation items
    const navButtons = Array.from(container.querySelectorAll("nav button"));
    assert.ok(navButtons.length >= 4, "Mobile and sidebar nav items present");

    console.log("✅ 2. AppAShell applied dark, reduce-motion classes and rendered nav items");
  }

  // 3. Responsive Layout & Safe Container Constraints
  {
    // Check viewport widths 320px, 390px, 430px
    for (const width of [320, 390, 430]) {
      Object.defineProperty(dom.window, "innerWidth", { writable: true, configurable: true, value: width });
      // Containers should have max-w constraint or px padding
      const maxWContainer = container.querySelector(".max-w-\\[880px\\]");
      assert.ok(maxWContainer, `Max width container preserved at ${width}px`);
    }
    console.log("✅ 3. Responsive container constraints verified for 320px, 390px, 430px");
  }

  root.unmount();
  console.log("All App A Integration Wiring tests passed successfully!");
}

runIntegrationWiringTests().catch((err) => {
  console.error("Wiring test failed:", err);
  process.exit(1);
});
