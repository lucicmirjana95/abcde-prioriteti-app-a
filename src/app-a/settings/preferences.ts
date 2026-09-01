import type { AppAPreferences } from "../types";

export const APP_A_PREFERENCES_KEY = "app_a_preferences_v1";

export function getDefaultAppAPreferences(): AppAPreferences {
  let timeZone = "UTC";
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { /* use UTC */ }
  let language: AppAPreferences["language"] = "en";
  try { const stored = localStorage.getItem("abcde_language"); if (stored === "en" || stored === "sr" || stored === "tr") language = stored; } catch { /* ignore */ }
  return { language, theme: "system", timeZone, defaultFocusMinutes: 25, aiSuggestionsEnabled: true };
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 100) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
}

export function normalizeAppAPreferences(value: unknown): AppAPreferences {
  const fallback = getDefaultAppAPreferences();
  if (!value || typeof value !== "object") return fallback;
  const item = value as Partial<AppAPreferences>;
  return {
    language: item.language === "sr" || item.language === "tr" || item.language === "en" ? item.language : fallback.language,
    theme: item.theme === "light" || item.theme === "dark" || item.theme === "system" ? item.theme : "system",
    timeZone: isValidTimeZone(item.timeZone) ? item.timeZone : fallback.timeZone,
    defaultFocusMinutes: item.defaultFocusMinutes === 15 || item.defaultFocusMinutes === 25 || item.defaultFocusMinutes === 45 || item.defaultFocusMinutes === 60 ? item.defaultFocusMinutes : 25,
    aiSuggestionsEnabled: typeof item.aiSuggestionsEnabled === "boolean" ? item.aiSuggestionsEnabled : true,
  };
}

export function loadAppAPreferences(): AppAPreferences {
  try { const raw = localStorage.getItem(APP_A_PREFERENCES_KEY); return raw ? normalizeAppAPreferences(JSON.parse(raw)) : getDefaultAppAPreferences(); } catch { return getDefaultAppAPreferences(); }
}

export function saveAppAPreferences(value: AppAPreferences): AppAPreferences {
  const normalized = normalizeAppAPreferences(value);
  localStorage.setItem(APP_A_PREFERENCES_KEY, JSON.stringify(normalized));
  localStorage.setItem("abcde_language", normalized.language);
  return normalized;
}
