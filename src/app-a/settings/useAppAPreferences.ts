import { useState } from "react";
import type { AppAPreferences } from "../types";
import { loadAppAPreferences, saveAppAPreferences } from "./preferences";

export function useAppAPreferences() {
  const [preferences, setPreferencesState] = useState<AppAPreferences>(loadAppAPreferences);
  const setPreferences = (next: AppAPreferences) => setPreferencesState(saveAppAPreferences(next));
  return { preferences, setPreferences };
}
