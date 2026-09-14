import { useMemo, useEffect, useRef } from "react";
import { VisionReviewController } from "../domain/daily-reset/VisionReviewController";
import { saveInboxItem } from "../persistence/inboxRepository";
import { dismissVisionSuggestion } from "../domain/daily-reset/visionSuggestion";
import { writeSessionDraft } from "../persistence/sessionDraft";
import { DailyResetVisionSuggestion, DailyPlanDraft } from "../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../types";

export function useVisionReviewAdapter(
  userId: string | undefined, 
  onOpenVision?: (targetVisionId?: string) => void
) {
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const controller = useMemo(() => new VisionReviewController({
    saveInboxItem: async (u, i) => saveInboxItem(u, i),
    dismissVisionSuggestion: (u, f) => dismissVisionSuggestion(u, f),
    loadVisionLibrary: async (u) => {
      const { loadVisionLibrary } = await import("../../shared/persistence/vision");
      return loadVisionLibrary(u);
    },
    saveVisionStrategy: async (u, s) => {
      const { saveVisionStrategy } = await import("../../shared/persistence/vision");
      return saveVisionStrategy(u, s);
    },
    onOpenVision: onOpenVision,
    writeSessionDraft: (k, d) => writeSessionDraft(k, d)
  }), [onOpenVision]);

  return { controller, isMounted };
}
