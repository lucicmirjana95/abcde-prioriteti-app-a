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
  saveDiagnostic?: string | null;
  onDirty?: () => void;
}

export default function DailyPlanReview({
  initialDraft,
  language,
  onBackToEdit,
  onConfirm,
  saveStatus = "idle",
  saveError,
  saveDiagnostic,
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
        <p className="app-a-eyebrow">{t.today}</p>
        <h1 className="app-a-page-title">
          {t.reviewTitle}
        </h1>
        <p className="app-a-page-intro">
          {t.reviewIntro}
        </p>
      </header>
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
            Draft modified
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

      {/* 1. Plan Rationale */}
      {draft.planRationale && (
        <div
          className="mb-4 rounded-2xl p-4 text-left border"
          style={{
            backgroundColor: "var(--app-a-disabled-bg)",
            borderColor: "var(--app-a-border)",
          }}
        >
          <h3
            className="mb-1 text-[13px] font-bold uppercase tracking-wide"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            {t.planRationaleTitle}
          </h3>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--app-a-text)" }}>
            {draft.planRationale}
          </p>
        </div>
      )}

      {/* 2. Planned Time Summary */}
      <div
        className="mb-7 flex min-h-[52px] items-center rounded-2xl border px-4 text-left"
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

      {/* Screen Actions */}
      <div
        className="sticky bottom-[calc(68px+env(safe-area-inset-bottom,0px))] z-20 -mx-2 mt-8 flex flex-col gap-3 rounded-2xl border p-3 backdrop-blur-xl sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none md:bottom-4"
        style={{
          backgroundColor: "var(--app-a-surface)",
          borderColor: "var(--app-a-border)",
          boxShadow: "var(--app-a-shadow-lg)",
        }}
      >
        <button
          type="button"
          onClick={() => void onConfirm(draft)}
          disabled={saveStatus === "saving"}
          className="app-a-primary-button app-a-focus-ring w-full px-8 transition-colors sm:order-2 sm:w-auto"
        >
          {saveStatus === "saving" ? t.savingPlan : t.reviewCompleteBtn}
        </button>

        <button
          type="button"
          onClick={onBackToEdit}
          className="app-a-secondary-button app-a-focus-ring w-full px-8 transition-colors sm:order-1 sm:w-auto"
        >
          {t.backToEdit}
        </button>
      </div>
    </div>
  );
}
