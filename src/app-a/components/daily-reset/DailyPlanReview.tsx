import { ReevaluationDialog } from "./ReevaluationDialog";
import React, { useEffect, useState, useRef } from "react";
import { DailyPlanDraft, DailyPlanItem, PlanBlock, DailyResetVisionSuggestion } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";
import { loadAppAPreferences, getEffectiveTimeZone } from "../../settings/preferences";
import { getLocalDateKeyInTimeZone } from "../../persistence/dailyPlanDocument";
import {
  movePlanItem,
  movePlanItemOutside,
  promoteClassifiedItem,
  moveClassifiedItemHorizon,
  editPlanItem,
  createUndoSnapshot,
  restoreUndoSnapshot,
  groupOutsideTodayItems,
  ReviewState,
} from "../../screens/planReview";
import DailyPlanBlock from "./DailyPlanBlock";
import DeferredItemsSection from "./DeferredItemsSection";
import SafeInterventionCard from "./SafeInterventionCard";
import DailyLoadWarning from "./DailyLoadWarning";
import VisionSuggestionCard from "./VisionSuggestionCard";
import FlowHeader from "./FlowHeader";
import {
  computeVisionSuggestionFingerprint,
  isVisionSuggestionDismissed,
  dismissVisionSuggestion,
  findRelatedVision,
  type RelatedVisionMatch,
} from "../../domain/daily-reset/visionSuggestion";
import { useVisionReviewAdapter } from "../../adapters/useVisionReviewAdapter";

interface Props {
  initialDraft: DailyPlanDraft;
  language: AppALanguage;
  onBackToEdit: () => void;
  onConfirm: (draft: DailyPlanDraft) => Promise<void>;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  saveError?: string | null;
  saveDiagnostic?: string | null;
  onDirty?: () => void;
  onDraftChange?: (draft: DailyPlanDraft) => void;
  userId?: string;
  onOpenVision?: (visionId?: string) => void;
}

import { useDailyRoutines } from "../../routines/useDailyRoutines";

export default function DailyPlanReview({
  initialDraft,
  language,
  onBackToEdit,
  onConfirm,
  saveStatus = "idle",
  saveError,
  saveDiagnostic,
  onDirty,
  onDraftChange,
  userId,
  onOpenVision,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  const [reviewState, setReviewState] = useState<ReviewState>({
    currentDraft: initialDraft,
    undoDraft: null,
    error: null,
  });

  const [relatedVisionMatch, setRelatedVisionMatch] = useState<RelatedVisionMatch | null>(null);
  const [visionSuggestionNotice, setVisionSuggestionNotice] = useState<string | null>(null);

  const { controller: visionController, isMounted } = useVisionReviewAdapter(userId, onOpenVision);

  const { routines, completions, localDate, plannedRoutineIds } = useDailyRoutines(userId);

  const draft = reviewState.currentDraft;

  // Single-flight synchronous ref lock and request tokens for confirm action
  const isConfirmingRef = useRef(false);
  const confirmRequestIdRef = useRef(0);
  const draftRevisionRef = useRef(0);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      confirmRequestIdRef.current += 1;
      isConfirmingRef.current = false;
    };
  }, []);

  useEffect(() => {
    draftRevisionRef.current += 1;
    confirmRequestIdRef.current += 1;
    isConfirmingRef.current = false;
    setIsLocalSaving(false);
  }, [draft]);

  useEffect(() => {
    if (initialDraft !== reviewState.currentDraft) setReviewState({ currentDraft: initialDraft, undoDraft: null, error: null });
  }, [initialDraft]);

  useEffect(() => {
    if (draft !== initialDraft) onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  // Check for related existing vision if visionSuggestion is present
  useEffect(() => {
    if (!draft.visionSuggestion) {
      setRelatedVisionMatch(null);
      return;
    }
    const currentUserId = userId || "guest";
    const fingerprint = computeVisionSuggestionFingerprint(
      draft.visionSuggestion.sourceItemIds,
      draft.visionSuggestion.suggestedTitle
    );
    if (isVisionSuggestionDismissed(currentUserId, fingerprint)) {
      setRelatedVisionMatch(null);
      return;
    }
    let isMountedLocal = true;
    import("../../../shared/persistence/vision/visionStrategyRepository")
      .then(({ loadVisionLibrary }) => loadVisionLibrary(currentUserId))
      .then((lib) => {
        if (isMountedLocal && draft.visionSuggestion) {
          const match = findRelatedVision(draft.visionSuggestion, lib);
          setRelatedVisionMatch(match);
        }
      })
      .catch(() => {
        // Safe fallback
      });
    return () => {
      isMountedLocal = false;
    };
  }, [draft.visionSuggestion, userId]);

  const markDirty = () => onDirty?.();

  const handleDevelopVision = (
    suggestion: DailyResetVisionSuggestion,
    clarification?: string
  ) => {
    const currentUserId = userId || "guest";
    const key = `${currentUserId}:vision:screen`;
    const effectiveTz = getEffectiveTimeZone(loadAppAPreferences());
    const localDate = draft.localDate || getLocalDateKeyInTimeZone(effectiveTz);
    
    visionController.handleDevelopVision(suggestion, clarification, localDate, key);
  };

  const handleSaveVisionToInbox = async (suggestion: DailyResetVisionSuggestion) => {
    const currentUserId = userId || "guest";
    const effectiveTz = getEffectiveTimeZone(loadAppAPreferences());
    const localDate = draft.localDate || getLocalDateKeyInTimeZone(effectiveTz);
    
    const result = await visionController.handleSaveToInbox({
      userId: currentUserId,
      suggestion,
      draft,
      localDate,
      language,
      nowIso: new Date().toISOString(),
      translations: t
    });

    if (!isMounted.current) return;

    if (result.status === "error") {
      console.error("Failed to save to inbox:", result.error);
      throw result.error;
    }
    
    if (result.status === "success") {
      window.dispatchEvent(new Event("app-a-inbox-changed"));
      markDirty();
      setReviewState({ ...reviewState, currentDraft: result.nextDraft! });
      setVisionSuggestionNotice(t.visionSuggestionSavedToInboxToast);
      setTimeout(() => { if (isMounted.current) setVisionSuggestionNotice(null); }, 4000);
    }
  };

  const handleDismissVisionSuggestion = (suggestion: DailyResetVisionSuggestion) => {
    const currentUserId = userId || "guest";
    const fingerprint = computeVisionSuggestionFingerprint(
      suggestion.sourceItemIds,
      suggestion.suggestedTitle
    );
    dismissVisionSuggestion(currentUserId, fingerprint);

    const nextDraft: DailyPlanDraft = {
      ...draft,
      visionSuggestion: undefined,
    };
    markDirty();
    setReviewState({
      ...reviewState,
      currentDraft: nextDraft,
    });
    setVisionSuggestionNotice(t.visionSuggestionDismissedToast);
    setTimeout(() => setVisionSuggestionNotice(null), 3000);
  };

  const handleConnectExistingVision = async (visionId: string, reactivate: boolean, suggestion: DailyResetVisionSuggestion) => {
    if (!userId) return;
    
    const result = await visionController.handleConnectExisting({
      userId, visionId, reactivate, suggestion, draft
    });
    
    if (!isMounted.current) return;
    if (result.status === "error") throw result.error;
    if (result.status === "success") {
      markDirty();
      setReviewState({ ...reviewState, currentDraft: result.nextDraft! });
      setVisionSuggestionNotice(
        reactivate ? "Arhivirana vizija je ponovo aktivirana." : "Povezano sa postojećom vizijom."
      );
      setTimeout(() => { if (isMounted.current) setVisionSuggestionNotice(null); }, 4000);
    }
  };

  // Planned time calculations
  const plannedRequired = draft.plannedRequiredMinutes ?? 0;
  const plannedFlexible = draft.plannedFlexibleMinutes ?? plannedRequired;

  const summaryText = draft.plannedFixedMinutes
    ? (language === 'sr'
        ? `${plannedFlexible} min fleksibilnih zadataka od ${draft.availableMinutes ?? '—'} min; ${draft.plannedFixedMinutes} min fiksnih obaveza.`
        : language === 'tr'
          ? `${draft.availableMinutes ?? '—'} dk içinde ${plannedFlexible} dk esnek görev; ayrıca ${draft.plannedFixedMinutes} dk sabit yükümlülük.`
          : `${plannedFlexible} min of flexible tasks within ${draft.availableMinutes ?? '—'} min; plus ${draft.plannedFixedMinutes} min of fixed commitments.`)
    : draft.availableMinutes
    ? t.plannedWithAvailableText
        .replace("{planned}", String(plannedRequired))
        .replace("{available}", String(draft.availableMinutes))
    : t.plannedSummaryText.replace("{planned}", String(plannedRequired));

  // Handlers with Undo snapshot creation
  const handleMoveItemToBlock = (itemId: string, targetBlock: PlanBlock) => {
    const snapshot = createUndoSnapshot(reviewState);
    const res = movePlanItem(snapshot.currentDraft, itemId, targetBlock);

    if (res.error) {
      setReviewState({
        ...reviewState,
        error: res.error === "first_focus_limit_exceeded" ? t.firstFocusLimitError : res.error,
      });
      return;
    }

    markDirty();
    setReviewState({
      currentDraft: res.draft,
      undoDraft: snapshot.undoDraft,
      error: null,
    });
  };

  const handleReorderItem = (itemId: string, direction: "up" | "down") => {
    const snapshot = createUndoSnapshot(reviewState);
    const res = import("../../screens/planReview").then(({ reorderPlanItem }) => {
      const result = reorderPlanItem(snapshot.currentDraft, itemId, direction);
      if (result.error) return;
      markDirty();
      setReviewState({
        currentDraft: result.draft,
        undoDraft: snapshot.undoDraft,
        error: null,
      });
    });
  };

  const handleMoveItemOutside = (
    itemId: string,
    targetHorizon: "this_week" | "later" | "long_term_idea" | "no_action"
  ) => {
    const snapshot = createUndoSnapshot(reviewState);
    const res = movePlanItemOutside(snapshot.currentDraft, itemId, targetHorizon);

    if (res.error) {
      setReviewState({
        ...reviewState,
        error: res.error,
      });
      return;
    }

    markDirty();
    setReviewState({
      currentDraft: res.draft,
      undoDraft: snapshot.undoDraft,
      error: null,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    const snapshot = createUndoSnapshot(reviewState);
    const filterBlock = (items: DailyPlanItem[]) => items.filter((it) => it.id !== itemId);
    const newDraft: DailyPlanDraft = {
      ...snapshot.currentDraft,
      firstFocus: filterBlock(snapshot.currentDraft.firstFocus),
      laterToday: filterBlock(snapshot.currentDraft.laterToday),
      ifCapacityRemains: filterBlock(snapshot.currentDraft.ifCapacityRemains),
    };
    const allItems = [...newDraft.firstFocus, ...newDraft.laterToday, ...newDraft.ifCapacityRemains];
    const plannedRequired = allItems
      .filter((i) => i.block !== "if_capacity_remains")
      .reduce((acc, curr) => acc + (curr.estimatedMinutes || 0), 0);
    const plannedFlexible = allItems
      .reduce((acc, curr) => acc + (curr.estimatedMinutes || 0), 0);
    newDraft.plannedRequiredMinutes = plannedRequired;
    newDraft.plannedFlexibleMinutes = plannedFlexible;

    markDirty();
    setReviewState({
      currentDraft: newDraft,
      undoDraft: snapshot.undoDraft,
      error: null,
    });
  };

  const handlePromoteClassifiedItem = (itemId: string, targetBlock: PlanBlock) => {
    const snapshot = createUndoSnapshot(reviewState);
    const res = promoteClassifiedItem(snapshot.currentDraft, itemId, targetBlock);

    if (res.error) {
      return { success: false, error: res.error };
    }

    markDirty();
    setReviewState({
      currentDraft: res.draft,
      undoDraft: snapshot.undoDraft,
      error: null,
    });

    return { success: true };
  };

  const handleMoveClassifiedHorizon = (
    itemId: string,
    targetHorizon: "this_week" | "later" | "long_term_idea" | "no_action"
  ) => {
    const snapshot = createUndoSnapshot(reviewState);
    const res = moveClassifiedItemHorizon(snapshot.currentDraft, itemId, targetHorizon);

    markDirty();
    setReviewState({
      currentDraft: res.draft,
      undoDraft: snapshot.undoDraft,
      error: null,
    });
  };

  const handleEditSave = (
    itemId: string,
    updates: { title: string; description?: string; estimatedMinutes: number }
  ) => {
    const snapshot = createUndoSnapshot(reviewState);
    const res = editPlanItem(snapshot.currentDraft, itemId, updates);

    if (res.error) {
      return { success: false, error: res.error };
    }

    markDirty();
    setReviewState({
      currentDraft: res.draft,
      undoDraft: snapshot.undoDraft,
      error: null,
    });

    return { success: true };
  };

  const handleUndo = () => {
    markDirty();
    const restored = restoreUndoSnapshot(reviewState);
    setReviewState(restored);
  };

  const groupedOutside = groupOutsideTodayItems(draft);

  const [showReevalDialog, setShowReevalDialog] = useState(false);

  const handlePreviewSort = () => {
    setShowReevalDialog(true);
  };

  const handleConfirmReeval = async (
    proposal: import("../../screens/planReview").StructuredReevaluationProposal,
    modifications: {
      approvedDelegationIds: string[];
      approvedEliminationIds: string[];
      approvedManualOverrideIds: string[];
    }
  ) => {
    const { applyReevaluationProposal } = await import("../../screens/planReview");
    const snapshot = createUndoSnapshot(reviewState);
    const finalDraft = applyReevaluationProposal(draft, proposal, modifications);
    if ((finalDraft as any).error) {
      alert((finalDraft as any).error);
      return; // Do not close modal or persist
    }

    markDirty();
    setReviewState({
      currentDraft: finalDraft,
      undoDraft: snapshot.undoDraft,
      error: null,
    });
    setShowReevalDialog(false);
  };

  const handleConfirmClick = async () => {
    // Synchronous ref lock: ignore second click in same event loop tick
    if (isConfirmingRef.current) return;
    if (saveStatus === "saving" || isLocalSaving) return;
    if (draft.availableMinutes !== undefined && plannedFlexible > draft.availableMinutes) return;

    isConfirmingRef.current = true;
    setIsLocalSaving(true);
    const token = ++confirmRequestIdRef.current;
    const revision = draftRevisionRef.current;
    const currentDraft = draft;

    try {
      await onConfirm(currentDraft);
    } catch (err) {
      console.error("onConfirm error in DailyPlanReview:", err);
    } finally {
      if (isMountedRef.current && confirmRequestIdRef.current === token && draftRevisionRef.current === revision) {
        isConfirmingRef.current = false;
        setIsLocalSaving(false);
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 pb-36 sm:pb-20">
      {showReevalDialog && (
        <ReevaluationDialog
          draft={draft}
          language={language}
          localDate={(draft as any).localDate || getLocalDateKeyInTimeZone(getEffectiveTimeZone(loadAppAPreferences()))}
          onClose={() => setShowReevalDialog(false)}
          onConfirm={handleConfirmReeval}
        />
      )}
      <FlowHeader
        eyebrow={language === "sr" ? "PREDLOG PLANA" : language === "tr" ? "PLAN ÖNERİSİ" : "PROPOSED PLAN"}
        title={t.reviewTitle}
        intro={t.reviewIntro}
        className="mb-7"
      />

      {/* Main Grid: 2-column on desktop (lg+), single-column on mobile */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] lg:gap-8 lg:items-start">
        {/* Left / Main Tasks Column */}
        <div className="min-w-0">
          {draft.manualPriorityOverride && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#0A84FF]/20 bg-[#0A84FF]/5 p-4 dark:border-[#0A84FF]/30 dark:bg-[#0A84FF]/10">
              <p className="text-[14px] text-[#0071E3] dark:text-[#0A84FF]">
                {language === "sr" ? "Redosled je ručno izmenjen." : language === "tr" ? "Sıralama manuel olarak değiştirildi." : "Order manually modified."}
              </p>
              <button
                type="button"
                onClick={handlePreviewSort}
                className="app-a-primary-button app-a-focus-ring whitespace-nowrap min-h-[40px] px-4 text-[13px]"
              >
                {language === "sr" ? "Preispitaj prioritete uz AI" : language === "tr" ? "Yapay zeka ile öncelikleri yeniden değerlendir" : "Re-evaluate via AI"}
              </button>
            </div>
          )}

          {draft.availableMinutes !== undefined && plannedFlexible > draft.availableMinutes ? <p role="status" className="app-a-panel-danger mb-4">{language === 'sr' ? 'Fleksibilni zadaci prelaze izabrano vreme. Pomeri neki za kasnije ili povećaj vreme.' : language === 'tr' ? 'Esnek görevler seçilen süreyi aşıyor. Bazılarını sonraya taşı veya süreyi artır.' : 'Flexible tasks exceed your selected time. Move one to later or increase the time.'}</p> : null}
          <DailyLoadWarning
            draft={draft}
            language={language}
            routines={routines}
            routineCompletions={completions}
            plannedRoutineIds={plannedRoutineIds}
            localDate={localDate}
          />

          {/* Undo Header Banner */}
          {reviewState.undoDraft && (
            <div
              className="mb-5 flex items-center justify-between rounded-xl border p-3"
              style={{
                backgroundColor: "var(--app-a-warning-soft)",
                borderColor: "var(--app-a-warning)",
                color: "var(--app-a-warning-text)",
              }}
            >
              <span className="text-[13px] font-medium">
                {language === 'sr' ? 'Plan je izmenjen' : language === 'tr' ? 'Plan değiştirildi' : 'Draft modified'}
              </span>
              <button
                type="button"
                onClick={handleUndo}
                className="app-a-focus-ring min-h-[44px] rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors"
                style={{ backgroundColor: "var(--app-a-warning)" }}
              >
                {t.undoBtn}
              </button>
            </div>
          )}

          {/* Global Error Notice */}
          {reviewState.error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border p-3 text-[14px] font-medium text-left"
              style={{
                backgroundColor: "var(--app-a-danger-soft)",
                borderColor: "var(--app-a-danger)",
                color: "var(--app-a-danger-text)",
              }}
            >
              {reviewState.error}
            </div>
          )}

          {/* Mobile-only Rationale & Time summary (stacked above tasks on small screens) */}
          <div className="lg:hidden mb-6 flex flex-col gap-4">
            {draft.planRationale && (
              <div className="app-a-block-rationale rounded-[20px] p-4 sm:p-5 text-left">
                <h3
                  className="mb-1 text-[13px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--app-a-wash-lavender-text)" }}
                >
                  {t.planRationaleTitle}
                </h3>
                <p className="text-[15px] leading-relaxed">
                  {draft.planRationale}
                </p>
              </div>
            )}

            <div
              className="flex min-h-[52px] items-center rounded-2xl border px-4 text-left"
              style={{
                backgroundColor: "var(--app-a-surface)",
                borderColor: "var(--app-a-border)",
                color: "var(--app-a-text)",
                boxShadow: "var(--app-a-shadow)",
              }}
            >
              <span className="text-[15px] font-semibold">
                {summaryText}
              </span>
            </div>
          </div>

          {/* Task Blocks */}
          <DailyPlanBlock
            block="first_focus"
            items={draft.firstFocus}
            language={language}
            onMoveToBlock={handleMoveItemToBlock}
            onMoveOutside={handleMoveItemOutside}
            onReorder={handleReorderItem}
            onEditSave={handleEditSave}
            onDeleteItem={handleDeleteItem}
          />

          <DailyPlanBlock
            block="later_today"
            items={draft.laterToday}
            language={language}
            onMoveToBlock={handleMoveItemToBlock}
            onMoveOutside={handleMoveItemOutside}
            onReorder={handleReorderItem}
            onEditSave={handleEditSave}
            onDeleteItem={handleDeleteItem}
          />

          <DailyPlanBlock
            block="if_capacity_remains"
            items={draft.ifCapacityRemains}
            language={language}
            onMoveToBlock={handleMoveItemToBlock}
            onMoveOutside={handleMoveItemOutside}
            onReorder={handleReorderItem}
            onEditSave={handleEditSave}
            onDeleteItem={handleDeleteItem}
          />

          {/* Mobile-only intervention and vision cards */}
          <div className="lg:hidden">
            {draft.intervention && (
              <div className="mb-5">
                <SafeInterventionCard intervention={draft.intervention} language={language} />
              </div>
            )}

            {draft.visionSuggestion &&
              !isVisionSuggestionDismissed(
                userId || "guest",
                computeVisionSuggestionFingerprint(
                  draft.visionSuggestion.sourceItemIds,
                  draft.visionSuggestion.suggestedTitle
                )
              ) && (
                <div className="mb-5">
                  <VisionSuggestionCard
                    suggestion={draft.visionSuggestion}
                    language={language}
                    relatedVisionMatch={relatedVisionMatch}
                    onDevelopVision={handleDevelopVision}
                    onSaveToInbox={handleSaveVisionToInbox}
                    onDismiss={handleDismissVisionSuggestion}
                    onConnectExisting={handleConnectExistingVision}
                    onViewArchived={(vid) => visionController.viewArchived(vid)}
                  />
                </div>
              )}
          </div>

          {/* Items Outside Today */}
          <DeferredItemsSection
            grouped={groupedOutside}
            language={language}
            onPromote={handlePromoteClassifiedItem}
            onMoveHorizon={handleMoveClassifiedHorizon}
          />

          {/* Vision Suggestion Notice Toast */}
          {visionSuggestionNotice && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-center text-xs font-medium text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200"
            >
              {visionSuggestionNotice}
            </div>
          )}

          {saveStatus === "saved" && (
            <div
              className="mt-6 rounded-2xl border p-4 text-center text-[15px] font-medium"
              style={{
                backgroundColor: "var(--app-a-success-soft)",
                borderColor: "var(--app-a-success)",
                color: "var(--app-a-success-text)",
              }}
            >
              {t.planSavedConfirmation}
            </div>
          )}

          {saveStatus === "error" && saveError && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border p-4 text-center text-[15px] font-medium"
              style={{
                backgroundColor: "var(--app-a-danger-soft)",
                borderColor: "var(--app-a-danger)",
                color: "var(--app-a-danger-text)",
              }}
            >
              <div>{saveError}</div>
              {saveDiagnostic && (
                <div
                  data-testid="save-diagnostic-reference"
                  className="mt-2 text-[12px] font-mono opacity-80"
                >
                  Save diagnostic: {saveDiagnostic}
                </div>
              )}
            </div>
          )}

          {/* Mobile Screen Actions Bar (Bottom sticky) */}
          <div
            className="sticky bottom-[calc(68px+env(safe-area-inset-bottom,0px))] z-20 -mx-1 mt-6 flex flex-row items-center gap-2.5 rounded-2xl border p-2.5 backdrop-blur-xl sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none md:bottom-4 lg:hidden"
            style={{
              backgroundColor: "var(--app-a-surface)",
              borderColor: "var(--app-a-border)",
              boxShadow: "var(--app-a-shadow-lg)",
            }}
          >
            <button
              type="button"
              onClick={onBackToEdit}
              className="app-a-secondary-button app-a-focus-ring flex-1 min-h-[46px] justify-center px-3 text-[14px] transition-colors sm:order-1 sm:w-auto"
            >
              {t.backToEdit}
            </button>

            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={saveStatus === "saving" || isLocalSaving || (draft.availableMinutes !== undefined && plannedFlexible > draft.availableMinutes)}
              className="app-a-primary-button app-a-focus-ring flex-[1.4] min-h-[46px] justify-center px-4 text-[14px] font-semibold transition-colors sm:order-2 sm:w-auto"
            >
              {saveStatus === "saving" || isLocalSaving ? t.savingPlan : t.reviewCompleteBtn}
            </button>
          </div>
        </div>

        {/* Right / Desktop Companion Sidebar (Sticky on lg+) */}
        <aside className="hidden lg:flex lg:sticky lg:top-6 flex-col gap-5">
          {/* 1. Desktop Actions Panel */}
          <div
            className="rounded-2xl border p-5 text-left"
            style={{
              backgroundColor: "var(--app-a-surface)",
              borderColor: "var(--app-a-border)",
              boxShadow: "var(--app-a-shadow)",
            }}
          >
            <h4
              className="text-[11px] font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--app-a-text-tertiary)" }}
            >
              {language === "sr" ? "Potvrda plana" : language === "tr" ? "Plan onayı" : "Plan Confirmation"}
            </h4>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleConfirmClick}
                disabled={saveStatus === "saving" || isLocalSaving || (draft.availableMinutes !== undefined && plannedFlexible > draft.availableMinutes)}
                className="app-a-primary-button app-a-focus-ring w-full min-h-[46px] justify-center text-[15px] font-semibold"
              >
                {saveStatus === "saving" || isLocalSaving ? t.savingPlan : t.reviewCompleteBtn}
              </button>

              <button
                type="button"
                onClick={onBackToEdit}
                className="app-a-secondary-button app-a-focus-ring w-full min-h-[42px] justify-center text-[14px]"
              >
                {t.backToEdit}
              </button>
            </div>
            {draft.manualPriorityOverride && (
              <button
                type="button"
                onClick={handlePreviewSort}
                className="mt-3 w-full rounded-xl border border-[#0A84FF]/30 bg-[#0A84FF]/10 py-2 text-[12px] font-medium text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0A84FF]/15 transition-colors"
              >
                {language === "sr" ? "Preispitaj prioritete uz AI" : language === "tr" ? "Yapay zeka ile yeniden değerlendir" : "Re-evaluate via AI"}
              </button>
            )}
          </div>

          {/* 2. Desktop Time & Capacity Summary */}
          <div
            className="rounded-2xl border p-5 text-left"
            style={{
              backgroundColor: "var(--app-a-surface)",
              borderColor: "var(--app-a-border)",
              boxShadow: "var(--app-a-shadow)",
            }}
          >
            <h4
              className="text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--app-a-text-tertiary)" }}
            >
              {language === "sr" ? "Ukupno vreme za danas" : language === "tr" ? "Bugünkü toplam süre" : "Today's Total Time"}
            </h4>
            <div className="text-[26px] font-bold tracking-tight" style={{ color: "var(--app-a-text)" }}>
              {draft.plannedRequiredMinutes} min
            </div>
            <p className="mt-1 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>
              {summaryText}
            </p>
            {Boolean(draft.plannedFixedMinutes) && (
              <p className="mt-1.5 text-[12px]" style={{ color: "var(--app-a-text-tertiary)" }}>
                {language === "sr"
                  ? `${draft.plannedFlexibleMinutes ?? 0} min fleksibilno · ${draft.plannedFixedMinutes} min fiksno`
                  : language === "tr"
                  ? `${draft.plannedFlexibleMinutes ?? 0} dk esnek · ${draft.plannedFixedMinutes} dk sabit`
                  : `${draft.plannedFlexibleMinutes ?? 0} min flexible · ${draft.plannedFixedMinutes} min fixed`}
              </p>
            )}
          </div>

          {/* 3. Desktop Plan Rationale */}
          {draft.planRationale && (
            <div className="app-a-block-rationale rounded-2xl p-5 text-left">
              <h4
                className="mb-1.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--app-a-wash-lavender-text)" }}
              >
                {t.planRationaleTitle}
              </h4>
              <p className="text-[14px] leading-relaxed">
                {draft.planRationale}
              </p>
            </div>
          )}

          {/* 4. Desktop Safe Intervention Card */}
          {draft.intervention && (
            <SafeInterventionCard intervention={draft.intervention} language={language} />
          )}

          {/* 5. Desktop Vision Suggestion */}
          {draft.visionSuggestion &&
            !isVisionSuggestionDismissed(
              userId || "guest",
              computeVisionSuggestionFingerprint(
                draft.visionSuggestion.sourceItemIds,
                draft.visionSuggestion.suggestedTitle
              )
            ) && (
              <VisionSuggestionCard
                suggestion={draft.visionSuggestion}
                language={language}
                relatedVisionMatch={relatedVisionMatch}
                onDevelopVision={handleDevelopVision}
                onSaveToInbox={handleSaveVisionToInbox}
                onDismiss={handleDismissVisionSuggestion}
                onConnectExisting={handleConnectExistingVision}
                onViewArchived={(vid) => visionController.viewArchived(vid)}
              />
            )}
        </aside>
      </div>
    </div>
  );
}
