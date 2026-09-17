import React, { useState } from "react";
import {
  Compass,
  Inbox,
  X,
  ArrowRight,
  Archive,
  HelpCircle,
  Check,
  Link2,
} from "lucide-react";
import type { DailyResetVisionSuggestion } from "../../domain/daily-reset/contracts";
import type { RelatedVisionMatch } from "../../domain/daily-reset/visionSuggestion";
import { APP_A_TRANSLATIONS, type AppALanguage } from "../../types";

interface VisionSuggestionCardProps {
  suggestion: DailyResetVisionSuggestion;
  language: AppALanguage;
  relatedVisionMatch?: RelatedVisionMatch | null;
  onDevelopVision: (suggestion: DailyResetVisionSuggestion, clarification?: string) => void;
  onSaveToInbox: (suggestion: DailyResetVisionSuggestion) => Promise<void>;
  onDismiss: (suggestion: DailyResetVisionSuggestion) => void;
  onConnectExisting?: (visionId: string, reactivate: boolean, suggestion: DailyResetVisionSuggestion) => Promise<void>;
  onViewArchived?: (visionId: string) => void;
}

export default function VisionSuggestionCard({
  suggestion,
  language,
  relatedVisionMatch,
  onDevelopVision,
  onSaveToInbox,
  onDismiss,
  onConnectExisting,
  onViewArchived,
}: VisionSuggestionCardProps) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;
  
  const [clarificationText, setClarificationText] = useState("");
  const [showClarificationInput, setShowClarificationInput] = useState(
    suggestion.needsClarification
  );
  
  const [confirmingAction, setConfirmingAction] = useState<"connect" | "reactivate" | "create_anyway" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isArchived = relatedVisionMatch?.isArchived;
  const relatedVision = relatedVisionMatch?.vision;

  const handleActionClick = async (action: () => Promise<void> | void) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="vision-suggestion-card"
      className="mt-6 rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/60 via-slate-50/50 to-amber-50/30 p-4 sm:p-5 shadow-xs transition-all duration-200 dark:border-sky-900/60 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-sky-950/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-sky-700 dark:text-sky-300">
                {t.visionSuggestionBadge}
              </span>
              <span className="inline-flex app-a-focus-ring items-center rounded-full bg-sky-100/80 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                <Compass className="mr-1 h-2.5 w-2.5" />
                {suggestion.confidence === "high" ? "High" : "Suggested"}
              </span>
            </div>
            <h4
              id="vision-suggestion-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {suggestion.suggestedTitle}
            </h4>
          </div>
        </div>

        {/* Quick dismiss button */}
        <button
          id="btn-vision-suggestion-dismiss-top"
          onClick={() => onDismiss(suggestion)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title={t.visionSuggestionDismissBtn}
          aria-label={t.visionSuggestionDismissBtn}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Desired outcome & Reason */}
      <div className="mt-3 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        <div className="rounded-lg bg-white/70 p-2.5 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {suggestion.desiredOutcome}
          </p>
          {suggestion.reason && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {t.visionSuggestionReasonLabel}:
              </span>{" "}
              {suggestion.reason}
            </p>
          )}
        </div>

        {/* Related Vision Banner if found */}
        {relatedVision && (
          <div
            id="vision-suggestion-related-vision-box"
            className="rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <div className="flex items-center gap-1.5 font-medium">
              {isArchived ? (
                <Archive className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Link2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span>
                {isArchived
                  ? t.visionSuggestionRelatedArchivedTitle
                  : t.visionSuggestionRelatedActiveTitle}
                : &ldquo;{relatedVision.idea}&rdquo;
              </span>
            </div>
            {isArchived ? (
              <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                {t.visionSuggestionArchivedNotice}
              </p>
            ) : null}
          </div>
        )}

        {/* Clarification prompt if required */}
        {suggestion.needsClarification && (
          <div
            id="vision-suggestion-clarification-box"
            className="rounded-lg border border-sky-200 bg-sky-50/50 p-2.5 text-xs dark:border-sky-900/50 dark:bg-sky-950/30"
          >
            <div className="flex items-center gap-1.5 font-medium text-sky-900 dark:text-sky-200">
              <HelpCircle className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span>
                {suggestion.clarificationQuestion ||
                  t.visionSuggestionClarificationLabel}
              </span>
            </div>
            <input
              id="input-vision-suggestion-clarification"
              type="text"
              value={clarificationText}
              onChange={(e) => setClarificationText(e.target.value)}
              placeholder={t.visionSuggestionClarificationPlaceholder}
              className="mt-2 w-full rounded-md border border-sky-300 bg-white px-2.5 min-h-[44px] py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden dark:border-sky-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 border-t border-slate-200/60 pt-3 dark:border-slate-800/80">
        {confirmingAction ? (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {confirmingAction === "create_anyway"
                ? t.visionSuggestionCreateAnywayConfirmText
                : t.visionSuggestionConnectConfirm}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  handleActionClick(async () => {
                    if (confirmingAction === "create_anyway") {
                      onDevelopVision(suggestion, clarificationText.trim() || undefined);
                    } else if (relatedVision && onConnectExisting) {
                      await onConnectExisting(relatedVision.id, confirmingAction === "reactivate", suggestion);
                    }
                    setConfirmingAction(null);
                  })
                }
                className="inline-flex app-a-focus-ring items-center gap-1.5 rounded-lg bg-amber-600 px-3 min-h-[44px] py-1.5 text-xs font-medium text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
              >
                {confirmingAction === "create_anyway"
                  ? t.visionSuggestionCreateAnywayConfirmBtn
                  : confirmingAction === "reactivate"
                  ? t.visionSuggestionReactivateConfirm
                  : t.visionSuggestionConnectConfirm}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmingAction(null)}
                className="inline-flex app-a-focus-ring rounded-lg px-3 min-h-[44px] py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                {t.visionSuggestionCancelBtn}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* If there's an active related vision, offer connecting */}
              {relatedVision && !isArchived && onConnectExisting ? (
                <button
                  id="btn-vision-suggestion-connect"
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setConfirmingAction("connect")}
                  className="inline-flex app-a-focus-ring items-center gap-1.5 rounded-lg bg-amber-600 px-3 min-h-[44px] py-1.5 text-xs font-medium text-white shadow-xs hover:bg-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:opacity-50 dark:focus:ring-offset-slate-900"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {t.visionSuggestionConnectExistingBtn}
                </button>
              ) : null}

              {/* If there's an archived related vision, offer reactivating */}
              {relatedVision && isArchived && onConnectExisting ? (
                <>
                  <button
                    id="btn-vision-suggestion-view-archived"
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      if (onViewArchived) onViewArchived(relatedVision.id);
                    }}
                    className="inline-flex app-a-focus-ring items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 min-h-[44px] py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/40 dark:focus:ring-offset-slate-900"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    {t.visionSuggestionViewArchivedBtn}
                  </button>
                  <button
                    id="btn-vision-suggestion-reactivate"
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setConfirmingAction("reactivate")}
                    className="inline-flex app-a-focus-ring items-center gap-1.5 rounded-lg bg-amber-600 px-3 min-h-[44px] py-1.5 text-xs font-medium text-white shadow-xs hover:bg-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:opacity-50 dark:focus:ring-offset-slate-900"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {t.visionSuggestionReactivateConfirm}
                  </button>
                </>
              ) : null}

              {/* Primary action: Develop as vision */}
              <button
                id="btn-vision-suggestion-develop"
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  if (relatedVision) {
                    setConfirmingAction("create_anyway");
                  } else {
                    onDevelopVision(
                      suggestion,
                      clarificationText.trim() || undefined
                    );
                  }
                }}
                className="inline-flex app-a-focus-ring items-center gap-1.5 rounded-lg bg-sky-600 px-3 min-h-[44px] py-1.5 text-xs font-medium text-white shadow-xs hover:bg-sky-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 disabled:opacity-50 dark:focus:ring-offset-slate-900"
              >
                <Compass className="h-3.5 w-3.5" />
                {relatedVision
                  ? t.visionSuggestionCreateAnywayBtn
                  : t.visionSuggestionDevelopBtn}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              {/* Secondary action: Save to Inbox */}
              <button
                id="btn-vision-suggestion-save-inbox"
                type="button"
                disabled={isProcessing}
                onClick={() => handleActionClick(() => onSaveToInbox(suggestion))}
                className="inline-flex app-a-focus-ring items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 min-h-[44px] py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
              >
            <Inbox className="h-3.5 w-3.5" />
            {t.visionSuggestionSaveInboxBtn}
          </button>
        </div>

        {/* Tertiary action: Not a vision */}
        <button
          id="btn-vision-suggestion-dismiss"
          type="button"
          disabled={isProcessing}
          onClick={() => handleActionClick(() => onDismiss(suggestion))}
          className="app-a-focus-ring text-xs font-normal text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200 min-h-[44px]"
        >
          {t.visionSuggestionDismissBtn}
        </button>
        </div>
        )}
      </div>
    </div>
  );
}
