import type { AppAPreferences, AppATimeZoneSetting } from "../types";

export const APP_A_PREFERENCES_KEY = "app_a_preferences_v1";

export const FALLBACK_TIME_ZONES: readonly string[] = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Halifax",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Istanbul",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Manila",
  "Asia/Riyadh",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Atlantic/Reykjavik",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Belgrade",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Budapest",
  "Europe/Copenhagen",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Kyiv",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Pacific/Auckland",
  "Pacific/Honolulu",
] as const;

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getDetectedDeviceTimeZone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isValidTimeZone(detected)) return detected;
  } catch {
    // Detection failure defaults safely to UTC
  }
  return "UTC";
}

export function getAvailableTimeZones(): string[] {
  try {
    if (typeof Intl !== "undefined" && typeof (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf === "function") {
      const values = (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone");
      if (Array.isArray(values) && values.length > 0) {
        const valid = values.filter(isValidTimeZone);
        if (valid.length > 0) return valid;
      }
    }
  } catch {
    // Fall back to deterministic catalog
  }
  return [...FALLBACK_TIME_ZONES];
}

export function getEffectiveTimeZone(preferencesOrSetting?: AppAPreferences | AppATimeZoneSetting | null): string {
  if (!preferencesOrSetting) return getDetectedDeviceTimeZone();
  const setting: AppATimeZoneSetting = "timeZoneSetting" in preferencesOrSetting
    ? preferencesOrSetting.timeZoneSetting
    : preferencesOrSetting;
  if (setting && setting.mode === "override" && isValidTimeZone(setting.timeZone)) {
    return setting.timeZone;
  }
  return getDetectedDeviceTimeZone();
}

export function getDefaultAppAPreferences(): AppAPreferences {
  let language: AppAPreferences["language"] = "en";
  try {
    const stored = localStorage.getItem("abcde_language");
    if (stored === "en" || stored === "sr" || stored === "tr") language = stored;
  } catch {
    // ignore storage access restrictions
  }
  return {
    language,
    theme: "system",
    timeZoneSetting: { mode: "automatic" },
    defaultFocusMinutes: 25,
    aiSuggestionsEnabled: true,
  };
}

export function normalizeTimeZoneSetting(value: unknown): AppATimeZoneSetting {
  if (!value || typeof value !== "object") return { mode: "automatic" };
  const item = value as Record<string, unknown>;
  if (item.mode === "override" && typeof item.timeZone === "string" && isValidTimeZone(item.timeZone)) {
    return { mode: "override", timeZone: item.timeZone };
  }
  return { mode: "automatic" };
}

export function normalizeAppAPreferences(value: unknown): AppAPreferences {
  const fallback = getDefaultAppAPreferences();
  if (!value || typeof value !== "object") {
    return {
      language: fallback.language,
      theme: fallback.theme,
      timeZoneSetting: { ...fallback.timeZoneSetting },
      defaultFocusMinutes: fallback.defaultFocusMinutes,
      aiSuggestionsEnabled: fallback.aiSuggestionsEnabled,
    };
  }
  const item = value as Record<string, unknown>;
  const language = item.language === "sr" || item.language === "tr" || item.language === "en" ? item.language : fallback.language;
  const theme = item.theme === "light" || item.theme === "dark" || item.theme === "system" ? item.theme : "system";
  const defaultFocusMinutes = item.defaultFocusMinutes === 15 || item.defaultFocusMinutes === 25 || item.defaultFocusMinutes === 45 || item.defaultFocusMinutes === 60 ? item.defaultFocusMinutes : 25;
  const aiSuggestionsEnabled = typeof item.aiSuggestionsEnabled === "boolean" ? item.aiSuggestionsEnabled : true;

  let timeZoneSetting: AppATimeZoneSetting = { mode: "automatic" };
  if (item.timeZoneSetting && typeof item.timeZoneSetting === "object") {
    timeZoneSetting = normalizeTimeZoneSetting(item.timeZoneSetting);
  } else if (typeof item.timeZone === "string") {
    // Legacy single string migration
    if (item.timeZone !== "automatic" && isValidTimeZone(item.timeZone)) {
      timeZoneSetting = { mode: "override", timeZone: item.timeZone };
    } else {
      timeZoneSetting = { mode: "automatic" };
    }
  }

  return {
    language,
    theme,
    timeZoneSetting,
    defaultFocusMinutes,
    aiSuggestionsEnabled,
  };
}

export function loadAppAPreferences(): AppAPreferences {
  try {
    const raw = localStorage.getItem(APP_A_PREFERENCES_KEY);
    return raw ? normalizeAppAPreferences(JSON.parse(raw)) : getDefaultAppAPreferences();
  } catch {
    return getDefaultAppAPreferences();
  }
}

export function saveAppAPreferences(value: AppAPreferences): AppAPreferences {
  const normalized = normalizeAppAPreferences(value);
  try {
    localStorage.setItem(APP_A_PREFERENCES_KEY, JSON.stringify(normalized));
    localStorage.setItem("abcde_language", normalized.language);
  } catch {
    // storage unavailable
  }
  return normalized;
}

/**
 * Resets App A preferences to fresh defaults:
 * - Removes ONLY app_a_preferences_v1 from localStorage
 * - Preserves abcde_language key (shared across applications)
 * - Sets timezone mode to automatic
 * - Preserves user authentication
 */
export function resetAppAPreferencesToDefaults(): AppAPreferences {
  try {
    localStorage.removeItem(APP_A_PREFERENCES_KEY);
  } catch {
    // storage error
  }
  const defaults = getDefaultAppAPreferences();
  defaults.timeZoneSetting = { mode: "automatic" };
  try {
    localStorage.setItem(APP_A_PREFERENCES_KEY, JSON.stringify(defaults));
  } catch {
    // storage error
  }
  return defaults;
}
