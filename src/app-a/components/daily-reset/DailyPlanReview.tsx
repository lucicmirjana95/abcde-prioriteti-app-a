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
  onDraftChange?: (draft: DailyPlanDraft) => void;
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
  onDraftChange,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  const [reviewState, setReviewState] = useState<ReviewState>({
    currentDraft: initialDraft,
    undoDraft: null,
    error: null,
  });

  const draft = reviewState.currentDraft;

  useEffect(() => {
    if (initialDraft !== reviewState.currentDraft) setReviewState({ currentDraft: initialDraft, undoDraft: null, error: null });
  }, [initialDraft]);

  useEffect(() => {
    if (draft !== initialDraft) onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const markDirty = () => onDirty?.();

  // Planned time calculations
  const plannedRequired = draft.plannedRequiredMinutes ?? 0;
  const plannedFlexible = draft.plannedFlexibleMinutes ?? plannedRequired;
  const needsCapacity = draft.availableMinutes === undefined && draft.firstFocus.length + draft.laterToday.length > 1;

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
      <label className="app-a-surface mb-5 flex flex-wrap items-center justify-between gap-3 p-4 text-[15px]">
        <span>{language === 'sr' ? 'Vreme za ceo današnji plan (min)' : language === 'tr' ? 'Bugünkü planın tamamı için süre (dk)' : 'Time for your whole plan today (min)'}</span>
        <input type="number" min="1" max="1440" value={draft.availableMinutes ?? ''} placeholder="—" className="app-a-field min-h-11 w-28 px-3 text-[16px]" onChange={(event) => {
          const minutes = event.target.value === '' ? undefined : Number(event.target.value);
          if (minutes !== undefined && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)) return;
          setReviewState((current) => ({ ...current, undoDraft: current.currentDraft, currentDraft: { ...current.currentDraft, availableMinutes: minutes } }));
          markDirty();
        }} />
      </label>
      {needsCapacity ? <div className="mb-4 rounded-xl border p-4" style={{ borderColor: 'var(--app-a-border)', background: 'var(--app-a-surface-secondary)' }}>
        <p className="text-[15px]">{language === 'sr' ? 'Za više zadataka izaberi raspoloživo vreme iznad. Ako još ne znaš, možeš da počneš jednim korakom; ostali ostaju sačuvani za kasnije.' : language === 'tr' ? 'Birden fazla görev için yukarıdan süre seç. Henüz bilmiyorsan tek adımla başlayabilirsin; diğerleri daha sonrası için saklanır.' : 'For several tasks, choose your available time above. If you are unsure, start with one step; the others stay saved for later.'}</p>
        <button type="button" className="app-a-secondary-button app-a-focus-ring mt-3 px-4" onClick={() => {
          let next = draft;
          for (const item of [...draft.firstFocus, ...draft.laterToday].slice(1)) next = movePlanItemOutside(next, item.id, 'later').draft;
          markDirty();
          setReviewState({ currentDraft: next, undoDraft: draft, error: null });
        }}>{language === 'sr' ? 'Za sada samo prvi korak' : language === 'tr' ? 'Şimdilik yalnızca ilk adım' : 'Start with the first step'}</button>
      </div> : null}
      {draft.availableMinutes !== undefined && plannedFlexible > draft.availableMinutes ? <p role="status" className="app-a-panel-danger mb-4">{language === 'sr' ? 'Fleksibilni zadaci prelaze izabrano vreme. Pomeri neki za kasnije ili povećaj vreme.' : language === 'tr' ? 'Esnek görevler seçilen süreyi aşıyor. Bazılarını sonraya taşı veya süreyi artır.' : 'Flexible tasks exceed your selected time. Move one to later or increase the time.'}</p> : null}
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
          disabled={saveStatus === "saving" || needsCapacity || (draft.availableMinutes !== undefined && plannedFlexible > draft.availableMinutes)}
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
