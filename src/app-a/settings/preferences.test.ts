import assert from "node:assert/strict";
import { isValidTimeZone, normalizeAppAPreferences } from "./preferences";

assert.equal(isValidTimeZone("Europe/Belgrade"), true);
assert.equal(isValidTimeZone("not/a-zone"), false);

const normalized = normalizeAppAPreferences({
  language: "sr",
  theme: "dark",
  timeZone: "Europe/Belgrade",
  defaultFocusMinutes: 45,
  aiSuggestionsEnabled: false,
});
assert.deepEqual(normalized, {
  language: "sr",
  theme: "dark",
  timeZone: "Europe/Belgrade",
  defaultFocusMinutes: 45,
  aiSuggestionsEnabled: false,
});

const invalid = normalizeAppAPreferences({
  language: "xx",
  theme: "neon",
  timeZone: "not/a-zone",
  defaultFocusMinutes: 999,
  aiSuggestionsEnabled: "yes",
});
assert.equal(invalid.theme, "system");
assert.equal(invalid.defaultFocusMinutes, 25);
assert.equal(invalid.aiSuggestionsEnabled, true);
assert.equal(isValidTimeZone(invalid.timeZone), true);

console.log("App A preference tests passed.");
