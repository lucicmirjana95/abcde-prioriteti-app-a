import assert from "node:assert/strict";
import type { AppAPreferences } from "../types";
import {
  getDefaultAppAPreferences,
  loadAppAPreferences,
  normalizeAppAPreferences,
  saveAppAPreferences,
  resetAppAPreferencesToDefaults,
  APP_A_PREFERENCES_KEY,
} from "./preferences";
import { getDailyResetDemoConfig } from "../demo/dailyResetDemo";

console.log("Starting Settings Preferences & Feature Independence Tests...");

// Setup mock localStorage
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  },
  key: (i: number) => Object.keys(mockStorage)[i] ?? null,
  length: 0,
} as unknown as Storage;

// 1. Defaults include reducedMotion ('system'), soundEnabled (true), notificationsEnabled (false)
{
  const defaults = getDefaultAppAPreferences();
  assert.equal(defaults.reducedMotion, "system");
  assert.equal(defaults.soundEnabled, true);
  assert.equal(defaults.notificationsEnabled, false);
  assert.equal(defaults.theme, "system");
  assert.equal(defaults.timeZoneSetting.mode, "automatic");
  console.log("✅ 1. Default preferences match required defaults");
}

// 2. Language changes MUST NEVER alter theme
{
  // User selects Dark / Evening theme
  const initialPrefs: AppAPreferences = {
    ...getDefaultAppAPreferences(),
    theme: "dark",
    language: "en",
  };
  const saved = saveAppAPreferences(initialPrefs);
  assert.equal(saved.theme, "dark");

  // User changes language to Serbian
  const changedToSr: AppAPreferences = {
    ...saved,
    language: "sr",
  };
  const afterSr = saveAppAPreferences(changedToSr);
  assert.equal(afterSr.language, "sr");
  assert.equal(afterSr.theme, "dark", "Theme must remain dark when switching to Serbian");

  // User changes language to Turkish
  const changedToTr: AppAPreferences = {
    ...afterSr,
    language: "tr",
  };
  const afterTr = saveAppAPreferences(changedToTr);
  assert.equal(afterTr.language, "tr");
  assert.equal(afterTr.theme, "dark", "Theme must remain dark when switching to Turkish");

  // Reloading from storage verifies persistence
  const reloaded = loadAppAPreferences();
  assert.equal(reloaded.theme, "dark");
  assert.equal(reloaded.language, "tr");
  console.log("✅ 2. Language switching strictly preserves theme across reloads");
}

// 3. Manual Day/Evening theme switching
{
  const prefs = loadAppAPreferences();
  const dayPrefs = saveAppAPreferences({ ...prefs, theme: "light" });
  assert.equal(dayPrefs.theme, "light");

  const eveningPrefs = saveAppAPreferences({ ...dayPrefs, theme: "dark" });
  assert.equal(eveningPrefs.theme, "dark");

  const systemPrefs = saveAppAPreferences({ ...eveningPrefs, theme: "system" });
  assert.equal(systemPrefs.theme, "system");
  console.log("✅ 3. Manual Day/Evening/System theme switching verified");
}

// 4. Reduced Motion configuration
{
  const normalizedReduced = normalizeAppAPreferences({ reducedMotion: "reduced" });
  assert.equal(normalizedReduced.reducedMotion, "reduced");

  const normalizedStandard = normalizeAppAPreferences({ reducedMotion: "standard" });
  assert.equal(normalizedStandard.reducedMotion, "standard");

  const normalizedSystem = normalizeAppAPreferences({ reducedMotion: "system" });
  assert.equal(normalizedSystem.reducedMotion, "system");

  // Invalid value falls back to system
  const normalizedInvalid = normalizeAppAPreferences({ reducedMotion: "crazy_motion" });
  assert.equal(normalizedInvalid.reducedMotion, "system");
  console.log("✅ 4. Reduced motion normalizes and falls back safely");
}

// 5. Sound and Notifications switches
{
  const prefs = loadAppAPreferences();
  const toggledSound = saveAppAPreferences({ ...prefs, soundEnabled: false });
  assert.equal(toggledSound.soundEnabled, false);

  const toggledNotifs = saveAppAPreferences({ ...toggledSound, notificationsEnabled: true });
  assert.equal(toggledNotifs.notificationsEnabled, true);

  const reloaded = loadAppAPreferences();
  assert.equal(reloaded.soundEnabled, false);
  assert.equal(reloaded.notificationsEnabled, true);
  console.log("✅ 5. Sound and Notifications switches toggle and persist reliably");
}

// 6. Reset all data preserves language and returns clean defaults
{
  const reset = resetAppAPreferencesToDefaults();
  assert.equal(reset.theme, "system");
  assert.equal(reset.reducedMotion, "system");
  assert.equal(reset.soundEnabled, true);
  assert.equal(reset.notificationsEnabled, false);
  assert.equal(reset.timeZoneSetting.mode, "automatic");
  console.log("✅ 6. Reset to defaults cleans all preferences while respecting contract");
}

// 7. Preview mode is development-only and strictly blocked in production
{
  // Development mode works
  const devDemo = getDailyResetDemoConfig("?app=a&demo=daily-reset", false);
  assert.ok(devDemo !== null, "Demo should work in development mode");
  assert.equal(devDemo?.enabled, true);

  // In production builds, returns null unconditionally
  const prodDemo = getDailyResetDemoConfig("?app=a&demo=daily-reset", true);
  assert.equal(prodDemo, null, "Demo must return null in production mode");

  const previewParam = getDailyResetDemoConfig("?preview=true", true);
  assert.equal(previewParam, null, "Preview parameter must return null in production mode");

  const canonicalAppADemo = getDailyResetDemoConfig("?app=a&demo=daily-reset&scenario=plan", true);
  assert.equal(canonicalAppADemo, null, "Canonical scenario demo must return null in production");

  console.log("✅ 7. Preview and demo mode are strictly blocked in production builds");
}

console.log("All Settings Preferences & Feature Independence tests passed successfully!");
