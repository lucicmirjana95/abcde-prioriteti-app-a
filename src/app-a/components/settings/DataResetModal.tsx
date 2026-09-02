import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import type { AppALanguage, AppAPreferences } from "../../types";
import {
  DATA_RESET_LOCALIZATION,
  type DataResetCopy,
} from "../../settings/dataResetLocalization";
import {
  DEFAULT_SCOPE_SELECTION,
  ALL_SCOPES_SELECTION,
  executeDataReset,
  type DataResetResult,
  type DataResetScopeKey,
  type DataResetScopeSelection,
  type ResetProgressEvent,
} from "../../persistence/dataResetRepository";
import { resetAppAPreferencesToDefaults } from "../../settings/preferences";

export interface DataResetEventDetail {
  completedScopes: DataResetScopeKey[];
  timestamp: number;
}

interface DataResetModalProps {
  isOpen: boolean;
  userId: string;
  language: AppALanguage;
  onClose: () => void;
  onPreferencesReset?: (newPrefs: AppAPreferences) => void;
}

type ModalStep = "scope_selection" | "final_confirmation" | "executing" | "result";

export default function DataResetModal({
  isOpen,
  userId,
  language,
  onClose,
  onPreferencesReset,
}: DataResetModalProps) {
  const t: DataResetCopy = DATA_RESET_LOCALIZATION[language] || DATA_RESET_LOCALIZATION.en;
  const titleId = useId();
  const descId = useId();

  const [step, setStep] = useState<ModalStep>("scope_selection");
  const [scopes, setScopes] = useState<DataResetScopeSelection>({ ...DEFAULT_SCOPE_SELECTION });
  const [confirmInput, setConfirmInput] = useState("");
  const [progress, setProgress] = useState<ResetProgressEvent | null>(null);
  const [resetResult, setResetResult] = useState<DataResetResult | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const isExecutingRef = useRef(false);

  // Store trigger button to restore focus when closed
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      setStep("scope_selection");
      setScopes({ ...DEFAULT_SCOPE_SELECTION });
      setConfirmInput("");
      setProgress(null);
      setResetResult(null);
      setInputError(null);
      isExecutingRef.current = false;
    } else {
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    }
  }, [isOpen]);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (step !== "executing") {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, onClose]);

  const hasAnyScopeSelected = useMemo(() => {
    return (
      scopes.appADailyData ||
      scopes.appAPreferences ||
      scopes.sharedVisionData ||
      scopes.sharedRoutinesData
    );
  }, [scopes]);

  const allSelected = useMemo(() => {
    return (
      scopes.appADailyData &&
      scopes.appAPreferences &&
      scopes.sharedVisionData &&
      scopes.sharedRoutinesData
    );
  }, [scopes]);

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setScopes({
        appADailyData: false,
        appAPreferences: false,
        sharedVisionData: false,
        sharedRoutinesData: false,
      });
    } else {
      setScopes({ ...ALL_SCOPES_SELECTION });
    }
  };

  const isConfirmationPhraseMatched = useMemo(() => {
    return confirmInput.trim() === t.requiredPhrase;
  }, [confirmInput, t.requiredPhrase]);

  const handleProceedToFinalConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyScopeSelected) {
      setInputError(t.selectAtLeastOneScopeError);
      return;
    }
    if (!isConfirmationPhraseMatched) {
      return;
    }
    setInputError(null);
    setStep("final_confirmation");
  };

  const handleStartExecution = async () => {
    if (isExecutingRef.current) return;
    if (!hasAnyScopeSelected) return;

    isExecutingRef.current = true;
    setStep("executing");
    setProgress({
      scopeCategory: "app_a_daily",
      stage: "validating",
      processedCount: 0,
    });

    try {
      const result = await executeDataReset(userId, scopes, {
        onProgress: (evt) => {
          setProgress(evt);
        },
        onResetPreferences: () => {
          if (scopes.appAPreferences) {
            const freshPrefs = resetAppAPreferencesToDefaults();
            if (onPreferencesReset) {
              onPreferencesReset(freshPrefs);
            }
          }
        },
      });

      setResetResult(result);
      setStep("result");

      // Broadcast App A cache/in-memory reset event with non-sensitive completed scopes
      if (result.completedScopes.length > 0) {
        try {
          window.dispatchEvent(
            new CustomEvent<DataResetEventDetail>("app-a-data-reset", {
              detail: {
                completedScopes: [...result.completedScopes],
                timestamp: Date.now(),
              },
            })
          );
        } catch {
          // ignore custom event errors
        }
      }
    } catch (err: any) {
      setResetResult({
        success: false,
        isPartial: false,
        completedScopes: [],
        failedScopes: [
          scopes.appADailyData ? "app_a_daily" : "vision_shared",
        ],
        scopeStatuses: {
          app_a_daily: {
            scope: "app_a_daily",
            status: "failed",
            processedDocuments: 0,
            error: {
              stage: "execution",
              firebaseCode: err?.message || "unknown_error",
              category: "unknown",
            },
          },
          app_a_preferences: {
            scope: "app_a_preferences",
            status: "skipped",
            processedDocuments: 0,
          },
          vision_shared: {
            scope: "vision_shared",
            status: "skipped",
            processedDocuments: 0,
          },
          routines_shared: {
            scope: "routines_shared",
            status: "skipped",
            processedDocuments: 0,
          },
        },
        totalDeletedDocuments: 0,
      });
      setStep("result");
    } finally {
      isExecutingRef.current = false;
    }
  };

  const handleRetryFailedScopes = () => {
    if (!resetResult) return;
    // Keep only failed scopes selected for retry
    const retryScopes: DataResetScopeSelection = {
      appADailyData: resetResult.failedScopes.includes("app_a_daily"),
      appAPreferences: resetResult.failedScopes.includes("app_a_preferences"),
      sharedVisionData: resetResult.failedScopes.includes("vision_shared"),
      sharedRoutinesData: resetResult.failedScopes.includes("routines_shared"),
    };
    setScopes(retryScopes);
    setConfirmInput(t.requiredPhrase);
    setStep("final_confirmation");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      id="app-a-danger-zone-modal"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-black/10 dark:bg-[#1C1C1E] dark:border-white/15 dark:text-[#F5F5F7] overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 p-4 sm:p-5 dark:border-white/10">
          <div className="flex items-center gap-2 text-[#FF3B30] dark:text-[#FF453A]">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h2 id={titleId} className="text-[17px] font-bold text-black dark:text-white">
              {step === "final_confirmation"
                ? t.finalConfirmationTitle
                : step === "executing"
                ? t.progressTitle
                : step === "result"
                ? resetResult?.success
                  ? t.successTitle
                  : t.partialFailureTitle
                : t.modalTitle}
            </h2>
          </div>
          {step !== "executing" && (
            <button
              type="button"
              onClick={onClose}
              className="app-a-focus-ring rounded-lg p-1.5 text-[#8E8E93] hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white transition-colors"
              aria-label={t.cancel}
              id="danger-zone-close-btn"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 text-[14px]">
          {/* STEP 1: Scope selection & phrase verification */}
          {step === "scope_selection" && (
            <form onSubmit={handleProceedToFinalConfirm} className="space-y-4">
              <p id={descId} className="text-[#6E6E73] dark:text-[#AEAEB2] leading-relaxed">
                {t.modalIntro}
              </p>

              {/* Warning Callout */}
              <div
                role="alert"
                className="rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/5 p-3.5 text-[13px] text-[#D70015] dark:border-[#FF453A]/30 dark:bg-[#FF453A]/10 dark:text-[#FF453A] flex items-start gap-2.5"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-semibold">{t.cannotBeUndone}</p>
                  <p className="text-[12px] opacity-90">{t.accountSafeNotice}</p>
                </div>
              </div>

              {/* Select all toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] font-semibold text-black dark:text-white">
                  {t.modalTitle}
                </span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="app-a-focus-ring text-[12px] font-semibold text-[#0071E3] hover:underline dark:text-[#2997FF]"
                  id="danger-zone-select-all-btn"
                >
                  {allSelected ? t.deselectAll : t.selectAll}
                </button>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2.5">
                {/* 1. Daily data (Default) */}
                <label className="flex items-start gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3.5 hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={scopes.appADailyData}
                    onChange={(e) =>
                      setScopes((s) => ({ ...s, appADailyData: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF3B30] focus:ring-[#FF3B30]"
                    id="danger-scope-daily"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-black dark:text-white block">
                      {t.scopeDailyTitle}
                    </span>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#AEAEB2] block leading-snug">
                      {t.scopeDailyDescription}
                    </span>
                  </div>
                </label>

                {/* 2. Preferences (Optional) */}
                <label className="flex items-start gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3.5 hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={scopes.appAPreferences}
                    onChange={(e) =>
                      setScopes((s) => ({ ...s, appAPreferences: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF3B30] focus:ring-[#FF3B30]"
                    id="danger-scope-preferences"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-black dark:text-white block">
                      {t.scopePreferencesTitle}
                    </span>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#AEAEB2] block leading-snug">
                      {t.scopePreferencesDescription}
                    </span>
                  </div>
                </label>

                {/* 3. Vision (Shared - Not preselected) */}
                <label className="flex items-start gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3.5 hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={scopes.sharedVisionData}
                    onChange={(e) =>
                      setScopes((s) => ({ ...s, sharedVisionData: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF3B30] focus:ring-[#FF3B30]"
                    id="danger-scope-vision"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-black dark:text-white block">
                      {t.scopeVisionTitle}
                    </span>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#AEAEB2] block leading-snug">
                      {t.scopeVisionDescription}
                    </span>
                    <span className="text-[11px] font-medium text-[#D70015] dark:text-[#FF453A] block pt-1">
                      {t.scopeVisionWarning}
                    </span>
                  </div>
                </label>

                {/* 4. Routines (Shared - Not preselected) */}
                <label className="flex items-start gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3.5 hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={scopes.sharedRoutinesData}
                    onChange={(e) =>
                      setScopes((s) => ({ ...s, sharedRoutinesData: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF3B30] focus:ring-[#FF3B30]"
                    id="danger-scope-routines"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-black dark:text-white block">
                      {t.scopeRoutinesTitle}
                    </span>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#AEAEB2] block leading-snug">
                      {t.scopeRoutinesDescription}
                    </span>
                    <span className="text-[11px] font-medium text-[#D70015] dark:text-[#FF453A] block pt-1">
                      {t.scopeRoutinesWarning}
                    </span>
                  </div>
                </label>
              </div>

              {/* Confirmation Phrase Input */}
              <div className="pt-2">
                <label
                  htmlFor="danger-phrase-input"
                  className="block text-[13px] font-semibold text-black dark:text-white mb-1.5"
                >
                  {t.confirmationPrompt(t.requiredPhrase)}
                </label>
                <input
                  id="danger-phrase-input"
                  type="text"
                  value={confirmInput}
                  onChange={(e) => {
                    setConfirmInput(e.target.value);
                    setInputError(null);
                  }}
                  placeholder={t.confirmationPlaceholder}
                  autoComplete="off"
                  spellCheck="false"
                  className="app-a-field app-a-focus-ring w-full p-3 font-mono text-[14px] uppercase tracking-wider"
                />
                {inputError && (
                  <p className="mt-1 text-[12px] text-[#FF3B30] dark:text-[#FF453A]" role="alert">
                    {inputError}
                  </p>
                )}
              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="app-a-secondary-button app-a-focus-ring px-4 py-2.5 text-[13px] font-semibold"
                  id="danger-cancel-btn"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!hasAnyScopeSelected || !isConfirmationPhraseMatched}
                  className="app-a-focus-ring rounded-xl bg-[#FF3B30] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#D70015] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  id="danger-continue-btn"
                >
                  {t.continueToConfirm}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Final Confirmation Summary */}
          {step === "final_confirmation" && (
            <div className="space-y-4">
              <div
                role="alert"
                className="rounded-xl border border-[#FF3B30]/30 bg-[#FF3B30]/10 p-4 text-[#D70015] dark:text-[#FF453A] space-y-2"
              >
                <div className="flex items-center gap-2 font-bold text-[14px]">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>{t.cannotBeUndone}</span>
                </div>
                <p className="text-[13px] opacity-95">{t.finalSummaryIntro}</p>
                <ul className="text-[13px] space-y-1 font-medium pl-1">
                  {scopes.appADailyData && <li>{t.summaryItemDaily}</li>}
                  {scopes.appAPreferences && <li>{t.summaryItemPreferences}</li>}
                  {scopes.sharedVisionData && <li>{t.summaryItemVision}</li>}
                  {scopes.sharedRoutinesData && <li>{t.summaryItemRoutines}</li>}
                </ul>
              </div>

              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 text-[12px] text-[#6E6E73] dark:border-white/10 dark:bg-white/[0.02] dark:text-[#AEAEB2] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" />
                <span>{t.accountSafeNotice}</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep("scope_selection")}
                  className="app-a-secondary-button app-a-focus-ring px-4 py-2.5 text-[13px] font-semibold"
                  id="danger-final-back-btn"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={handleStartExecution}
                  className="app-a-focus-ring rounded-xl bg-[#FF3B30] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#D70015] active:scale-98 transition-all"
                  id="danger-final-execute-btn"
                >
                  {t.finalDestructiveAction}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Executing in progress */}
          {step === "executing" && (
            <div
              role="status"
              className="py-8 flex flex-col items-center justify-center text-center space-y-3"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[#FF3B30] dark:text-[#FF453A]" />
              <p className="font-semibold text-black dark:text-white">{t.progressDeleting}</p>
              {progress && (
                <p className="text-[12px] text-[#6E6E73] dark:text-[#AEAEB2]">
                  {progress.collectionName ? `[${progress.collectionName}] ` : ""}
                  {progress.totalBatches
                    ? `Batch ${progress.batchIndex} of ${progress.totalBatches} (${progress.processedCount} deleted)`
                    : `${progress.processedCount} items processed`}
                </p>
              )}
            </div>
          )}

          {/* STEP 4: Result (Success or Partial Failure) */}
          {step === "result" && resetResult && (
            <div className="space-y-4">
              {resetResult.success ? (
                <div
                  role="status"
                  className="rounded-xl border border-[#34C759]/30 bg-[#34C759]/10 p-4 text-[#248A3D] dark:text-[#30D158] flex items-start gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-[15px]">{t.successTitle}</p>
                    <p className="text-[13px] opacity-95">{t.successMessage}</p>
                  </div>
                </div>
              ) : (
                <div role="alert" className="space-y-3">
                  <div className="rounded-xl border border-[#FF9500]/30 bg-[#FF9500]/10 p-4 text-[#B26B00] dark:text-[#FF9F0A] flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-[15px]">{t.partialFailureTitle}</p>
                      <p className="text-[13px] opacity-95">{t.partialFailureMessage}</p>
                    </div>
                  </div>

                  {resetResult.completedScopes.length > 0 && (
                    <div className="rounded-xl border border-black/10 p-3 text-[13px] dark:border-white/10 space-y-1">
                      <p className="font-semibold text-[#248A3D] dark:text-[#30D158]">
                        {t.completedScopesLabel}
                      </p>
                      <p className="text-[#6E6E73] dark:text-[#AEAEB2]">
                        {resetResult.completedScopes.join(", ")}
                      </p>
                    </div>
                  )}

                  {resetResult.failedScopes.length > 0 && (
                    <div className="rounded-xl border border-[#FF3B30]/20 p-3 text-[13px] dark:border-[#FF453A]/30 space-y-1">
                      <p className="font-semibold text-[#FF3B30] dark:text-[#FF453A]">
                        {t.failedScopesLabel}
                      </p>
                      <p className="text-[#6E6E73] dark:text-[#AEAEB2]">
                        {resetResult.failedScopes.join(", ")}
                      </p>
                      <p className="text-[12px] text-[#8E8E93] pt-1">{t.retryNotice}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                {!resetResult.success && resetResult.failedScopes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRetryFailedScopes}
                    className="app-a-focus-ring rounded-xl bg-[#0071E3] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0077ED] flex items-center gap-1.5 transition-all"
                    id="danger-retry-btn"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t.retryAction}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="app-a-primary-button app-a-focus-ring px-5 py-2.5 text-[13px] font-semibold"
                  id="danger-done-btn"
                >
                  {t.doneAction}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
