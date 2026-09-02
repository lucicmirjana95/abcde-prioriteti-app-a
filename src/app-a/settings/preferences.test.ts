import assert from "node:assert/strict";
import {
  FALLBACK_TIME_ZONES,
  getAvailableTimeZones,
  getDetectedDeviceTimeZone,
  getEffectiveTimeZone,
  isValidTimeZone,
  normalizeAppAPreferences,
} from "./preferences";
import { getLocalDateKeyInTimeZone } from "../persistence/dailyPlanDocument";
import type { AppAPreferences } from "../types";

// 1. Timezone validity
assert.equal(isValidTimeZone("Europe/Belgrade"), true);
assert.equal(isValidTimeZone("America/New_York"), true);
assert.equal(isValidTimeZone("Asia/Tokyo"), true);
assert.equal(isValidTimeZone("UTC"), true);
assert.equal(isValidTimeZone("not/a-zone"), false);
assert.equal(isValidTimeZone(""), false);
assert.equal(isValidTimeZone(null), false);
assert.equal(isValidTimeZone(123), false);

// 2. Automatic detection and resolution
const detected = getDetectedDeviceTimeZone();
assert.equal(typeof detected, "string");
assert.equal(isValidTimeZone(detected), true);

const autoPref: AppAPreferences = {
  language: "en",
  theme: "system",
  timeZoneSetting: { mode: "automatic" },
  defaultFocusMinutes: 25,
  aiSuggestionsEnabled: true,
};
assert.equal(getEffectiveTimeZone(autoPref), detected);
assert.equal(getEffectiveTimeZone(autoPref.timeZoneSetting), detected);
assert.equal(getEffectiveTimeZone(null), detected);

// 3. Explicit valid override
const overridePref: AppAPreferences = {
  language: "en",
  theme: "system",
  timeZoneSetting: { mode: "override", timeZone: "Asia/Tokyo" },
  defaultFocusMinutes: 25,
  aiSuggestionsEnabled: true,
};
assert.equal(getEffectiveTimeZone(overridePref), "Asia/Tokyo");
assert.equal(getEffectiveTimeZone(overridePref.timeZoneSetting), "Asia/Tokyo");

// 4. Invalid legacy and corrupt values fallback
const corruptOverride = normalizeAppAPreferences({
  language: "sr",
  theme: "dark",
  timeZoneSetting: { mode: "override", timeZone: "Invalid/Zone_Name" },
  defaultFocusMinutes: 45,
  aiSuggestionsEnabled: false,
});
assert.deepEqual(corruptOverride.timeZoneSetting, { mode: "automatic" });
assert.equal(getEffectiveTimeZone(corruptOverride), detected);

const legacyValid = normalizeAppAPreferences({
  language: "sr",
  theme: "dark",
  timeZone: "Europe/Belgrade",
  defaultFocusMinutes: 45,
  aiSuggestionsEnabled: false,
});
assert.deepEqual(legacyValid.timeZoneSetting, { mode: "override", timeZone: "Europe/Belgrade" });
assert.equal(getEffectiveTimeZone(legacyValid), "Europe/Belgrade");

const legacyInvalid = normalizeAppAPreferences({
  language: "xx",
  theme: "neon",
  timeZone: "invalid_time_zone_123",
  defaultFocusMinutes: 999,
  aiSuggestionsEnabled: "yes",
});
assert.equal(legacyInvalid.language, "en");
assert.equal(legacyInvalid.theme, "system");
assert.equal(legacyInvalid.defaultFocusMinutes, 25);
assert.equal(legacyInvalid.aiSuggestionsEnabled, true);
assert.deepEqual(legacyInvalid.timeZoneSetting, { mode: "automatic" });
assert.equal(getEffectiveTimeZone(legacyInvalid), detected);

// 5. Unsupported Intl.supportedValuesOf fallback
const originalSupportedValuesOf = (Intl as unknown as { supportedValuesOf?: unknown }).supportedValuesOf;
try {
  // Test with supportedValuesOf disabled
  (Intl as unknown as { supportedValuesOf?: unknown }).supportedValuesOf = undefined;
  const fallbackList = getAvailableTimeZones();
  assert.ok(Array.isArray(fallbackList));
  assert.ok(fallbackList.length >= FALLBACK_TIME_ZONES.length);
  assert.ok(fallbackList.includes("UTC"));
  assert.ok(fallbackList.includes("Europe/Belgrade"));
  assert.ok(fallbackList.includes("Asia/Tokyo"));
} finally {
  (Intl as unknown as { supportedValuesOf?: unknown }).supportedValuesOf = originalSupportedValuesOf;
}

// Test with supportedValuesOf active (when environment supports it)
const activeList = getAvailableTimeZones();
assert.ok(Array.isArray(activeList));
assert.ok(activeList.length > 0);
assert.ok(activeList.every(isValidTimeZone));

// 6. Local-date calculation around midnight and date boundaries
// Example instant: 2026-09-02T23:30:00.000Z
const midnightBoundaryTime = new Date("2026-09-02T23:30:00.000Z");
assert.equal(getLocalDateKeyInTimeZone("UTC", midnightBoundaryTime), "2026-09-02");
assert.equal(getLocalDateKeyInTimeZone("Europe/London", midnightBoundaryTime), "2026-09-03"); // BST is UTC+1 (00:30 on Sept 3)
assert.equal(getLocalDateKeyInTimeZone("Asia/Tokyo", midnightBoundaryTime), "2026-09-03"); // UTC+9 (08:30 on Sept 3)
assert.equal(getLocalDateKeyInTimeZone("America/New_York", midnightBoundaryTime), "2026-09-02"); // EDT is UTC-4 (19:30 on Sept 2)
assert.equal(getLocalDateKeyInTimeZone("Pacific/Honolulu", midnightBoundaryTime), "2026-09-02"); // HST is UTC-10 (13:30 on Sept 2)

// Example instant: 2026-09-02T01:30:00.000Z
const earlyBoundaryTime = new Date("2026-09-02T01:30:00.000Z");
assert.equal(getLocalDateKeyInTimeZone("UTC", earlyBoundaryTime), "2026-09-02");
assert.equal(getLocalDateKeyInTimeZone("Pacific/Honolulu", earlyBoundaryTime), "2026-09-01"); // HST is UTC-10 (15:30 on Sept 1)
assert.equal(getLocalDateKeyInTimeZone("America/Los_Angeles", earlyBoundaryTime), "2026-09-01"); // PDT is UTC-7 (18:30 on Sept 1)

// 7. Switching from automatic to explicit and back
let currentPrefs: AppAPreferences = {
  language: "en",
  theme: "system",
  timeZoneSetting: { mode: "automatic" },
  defaultFocusMinutes: 25,
  aiSuggestionsEnabled: true,
};
assert.equal(getEffectiveTimeZone(currentPrefs), detected);

// Switch to explicit override
currentPrefs = {
  ...currentPrefs,
  timeZoneSetting: { mode: "override", timeZone: "Europe/Istanbul" },
};
assert.equal(getEffectiveTimeZone(currentPrefs), "Europe/Istanbul");

// Switch back to automatic
currentPrefs = {
  ...currentPrefs,
  timeZoneSetting: { mode: "automatic" },
};
assert.equal(getEffectiveTimeZone(currentPrefs), detected);

// 8. No mutation of existing preference objects
const originalInput: AppAPreferences = Object.freeze({
  language: "en",
  theme: "light",
  timeZoneSetting: Object.freeze({ mode: "override", timeZone: "America/Chicago" }) as unknown as AppAPreferences["timeZoneSetting"],
  defaultFocusMinutes: 15,
  aiSuggestionsEnabled: true,
});

const normalizedOutput = normalizeAppAPreferences(originalInput);
assert.notEqual(normalizedOutput, originalInput);
assert.deepEqual(normalizedOutput, originalInput);
assert.deepEqual(originalInput.timeZoneSetting, { mode: "override", timeZone: "America/Chicago" });

console.log("All App A timezone and preference tests passed successfully.");
