import React, { useEffect, useState } from "react";
import { DailyPlanDraft, PlanBlock } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";
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

interface Props {
  initialDraft: DailyPlanDraft;
  language: AppALanguage;
  onBackToEdit: () => void;
  onConfirm: (draft: DailyPlanDraft) => Promise<void>;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  saveError?: string | null;
  onDirty?: () => void;
}

export default function DailyPlanReview({
  initialDraft,
  language,
  onBackToEdit,
  onConfirm,
  saveStatus = "idle",
  saveError,
  onDirty,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  const [reviewState, setReviewState] = useState<ReviewState>({
    currentDraft: initialDraft,
    undoDraft: null,
    error: null,
  });

  const draft = reviewState.currentDraft;

  useEffect(() => {
    setReviewState({ currentDraft: initialDraft, undoDraft: null, error: null });
  }, [initialDraft]);

  const markDirty = () => onDirty?.();

  // Planned time calculations
  const plannedRequired = draft.plannedRequiredMinutes ?? 0;

  const summaryText = draft.availableMinutes
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

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-16 sm:px-6">
      <header className="mb-7">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0071E3] dark:text-[#0A84FF]">{t.today}</p>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em] text-black sm:text-[36px] dark:text-white">
          {t.reviewTitle}
        </h1>
        <p className="mt-3 max-w-[620px] text-[16px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
          {t.reviewIntro}
        </p>
      </header>
      {/* Undo Header Banner */}
      {reviewState.undoDraft && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
          <span className="text-[13px] text-amber-800 dark:text-amber-200 font-medium">
            Draft modified
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="min-h-[44px] px-4 py-2 bg-amber-600 text-white rounded-lg text-[13px] font-semibold hover:bg-amber-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {t.undoBtn}
          </button>
        </div>
      )}

      {/* Global Error Notice */}
      {reviewState.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-[14px] font-medium text-left">
          {reviewState.error}
        </div>
      )}

      {/* 1. Plan Rationale */}
      {draft.planRationale && (
        <div className="mb-4 rounded-2xl bg-black/[0.035] p-4 text-left dark:bg-white/[0.06]">
          <h3 className="text-[14px] font-bold text-[#8E8E93] dark:text-[#8E8E93] uppercase tracking-wide mb-1">
            {t.planRationaleTitle}
          </h3>
          <p className="text-[15px] text-[#3C3C43] dark:text-[#EBEBF5]/90 leading-relaxed">
            {draft.planRationale}
          </p>
        </div>
      )}

      {/* 2. Planned Time Summary */}
      <div className="mb-7 flex min-h-[52px] items-center rounded-2xl border border-black/10 bg-white px-4 text-left dark:border-white/10 dark:bg-[#1C1C1E]">
        <span className="text-[15px] font-semibold text-black dark:text-white">
          {summaryText}
        </span>
      </div>

      {/* 3. First Focus */}
      <DailyPlanBlock
        block="first_focus"
        items={draft.firstFocus}
        language={language}
        onMoveToBlock={handleMoveItemToBlock}
        onMoveOutside={handleMoveItemOutside}
        onEditSave={handleEditSave}
      />

      {/* 4. Later Today */}
      <DailyPlanBlock
        block="later_today"
        items={draft.laterToday}
        language={language}
        onMoveToBlock={handleMoveItemToBlock}
        onMoveOutside={handleMoveItemOutside}
        onEditSave={handleEditSave}
      />

      {/* 5. If Capacity Remains */}
      <DailyPlanBlock
        block="if_capacity_remains"
        items={draft.ifCapacityRemains}
        language={language}
        onMoveToBlock={handleMoveItemToBlock}
        onMoveOutside={handleMoveItemOutside}
        onEditSave={handleEditSave}
      />

      {/* 6. Safe Intervention Card */}
      {draft.intervention && (
        <SafeInterventionCard intervention={draft.intervention} language={language} />
      )}

      {/* 7. Items Outside Today */}
      <DeferredItemsSection
        grouped={groupedOutside}
        language={language}
        onPromote={handlePromoteClassifiedItem}
        onMoveHorizon={handleMoveClassifiedHorizon}
      />

      {saveStatus === "saved" && (
        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-[15px] font-medium text-center">
          {t.planSavedConfirmation}
        </div>
      )}

      {saveStatus === "error" && saveError && (
        <div role="alert" className="mt-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-[15px] font-medium text-center">
          {saveError}
        </div>
      )}

      {/* Screen Actions */}
      <div className="sticky bottom-[calc(68px+env(safe-area-inset-bottom,0px))] z-20 -mx-2 mt-8 flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/90 p-3 shadow-[0_10px_35px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none dark:border-white/10 dark:bg-[#1C1C1E]/90 sm:dark:bg-transparent md:bottom-4">
        <button
          type="button"
          onClick={() => void onConfirm(draft)}
          disabled={saveStatus === "saving"}
          className="app-a-primary-button app-a-focus-ring w-full px-8 transition-colors hover:bg-[#0077ED] sm:order-2 sm:w-auto"
        >
          {saveStatus === "saving" ? t.savingPlan : t.reviewCompleteBtn}
        </button>

        <button
          type="button"
          onClick={onBackToEdit}
          className="app-a-secondary-button app-a-focus-ring w-full px-8 transition-colors hover:bg-black/10 sm:order-1 sm:w-auto dark:hover:bg-white/15"
        >
          {t.backToEdit}
        </button>
      </div>
    </div>
  );
}
