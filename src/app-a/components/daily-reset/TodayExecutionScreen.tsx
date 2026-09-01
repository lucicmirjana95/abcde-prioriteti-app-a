import { useState } from "react";
import { Check, Clock3, Pencil, Sparkles, Timer } from "lucide-react";
import type { DailyPlanDraft, DailyPlanItem } from "../../domain/daily-reset/contracts";
import { APP_A_TRANSLATIONS, type AppALanguage } from "../../types";
import SafeInterventionCard from "./SafeInterventionCard";
import { normalizeCompletedItemIds } from "../../screens/todayExecution";
import FocusTimer from "../focus/FocusTimer";

interface Props {
  draft: DailyPlanDraft;
  language: AppALanguage;
  completedItemIds: string[];
  updatingItemId?: string | null;
  error?: string | null;
  onToggle: (itemId: string) => void;
  onEditPlan: () => void;
}

export default function TodayExecutionScreen({
  draft,
  language,
  completedItemIds,
  updatingItemId,
  error,
  onToggle,
  onEditPlan,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;
  const [focusItem, setFocusItem] = useState<DailyPlanItem | null>(null);
  const requiredItems = [...draft.firstFocus, ...draft.laterToday];
  const optionalItems = draft.ifCapacityRemains;
  const todayItems = [...requiredItems, ...optionalItems];
  const completed = normalizeCompletedItemIds(draft, completedItemIds);
  const outsideCount =
    draft.deferredItems.length + draft.longTermIdeas.length + draft.nonActionItems.length;
  const summary = t.completedSummary
    .replace("{completed}", String(completed.length))
    .replace("{total}", String(todayItems.length));

  const renderItem = (item: DailyPlanItem, emphasized = false) => {
    const isComplete = completed.includes(item.id);
    return (
      <div
        key={item.id}
        className={`app-a-focus-ring flex min-h-[64px] w-full items-start gap-3 rounded-[14px] border p-3.5 text-left transition-colors sm:p-4 ${
          isComplete
            ? "border-black/[0.06] bg-black/[0.025] text-black/45 dark:border-white/[0.06] dark:bg-white/[0.035] dark:text-white/45"
            : emphasized
              ? "border-[#0A84FF]/25 bg-[#0A84FF]/[0.055] text-black dark:text-white"
              : "border-black/[0.08] bg-white text-black dark:border-white/10 dark:bg-[#242426] dark:text-white"
        }`}
      >
        <button
          type="button"
          aria-label={item.title}
          aria-pressed={isComplete}
          disabled={Boolean(updatingItemId)}
          onClick={() => onToggle(item.id)}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            isComplete
              ? "border-[#34C759] bg-[#34C759] text-white"
              : "border-black/20 bg-transparent dark:border-white/25"
          }`}
        >
          {isComplete && <Check className="h-4 w-4" strokeWidth={3} />}
        </button>
        <span className="min-w-0 flex-1">
          <span className={`block text-[16px] font-semibold leading-snug ${isComplete ? "line-through" : ""}`}>
            {item.title}
          </span>
          {item.description && (
            <span className="mt-1 block text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
              {item.description}
            </span>
          )}
          <span className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {item.estimatedMinutes} min
            {(item.deadlineText || item.deadlineIso) && (
              <span className="ml-1 text-amber-700 dark:text-amber-400">
                · {item.deadlineText || item.deadlineIso}
              </span>
            )}
          </span>
        </span>
        {!isComplete && <button type="button" onClick={() => setFocusItem(item)} className="app-a-focus-ring shrink-0 rounded-xl border border-black/10 p-2.5 text-[#0071E3] dark:border-white/15 dark:text-[#0A84FF]" aria-label={`Focus: ${item.title}`}><Timer className="h-4 w-4" /></button>}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-16 sm:px-6">
      <header className="mb-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0071E3] dark:text-[#0A84FF]">
              {t.today}
            </p>
            <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em] text-black sm:text-[36px] dark:text-white">
              {t.todayPlanTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={onEditPlan}
            className="app-a-secondary-button app-a-focus-ring flex shrink-0 items-center gap-2 px-3.5 text-[14px]"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.editTodayPlan}</span>
          </button>
        </div>
        <p className="mt-3 max-w-[620px] text-[16px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
          {t.todayPlanIntro}
        </p>
      </header>

      <section className="app-a-surface mb-5 p-4 sm:p-5" aria-label={summary}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[15px] font-semibold text-black dark:text-white">{summary}</span>
          <span className="text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
            {draft.plannedRequiredMinutes} min
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.1]">
          <div
            className="h-full rounded-full bg-[#34C759] transition-[width]"
            style={{ width: `${todayItems.length ? (completed.length / todayItems.length) * 100 : 0}%` }}
          />
        </div>
      </section>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[14px] font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {todayItems.length > 0 && completed.length === todayItems.length && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="text-[15px] font-medium">{t.allTodayComplete}</span>
        </div>
      )}

      {requiredItems.length > 0 && (
        <section className="mb-6" aria-labelledby="required-today-heading">
          <h2 id="required-today-heading" className="mb-3 text-[19px] font-semibold tracking-[-0.015em] text-black dark:text-white">
            {t.requiredTodayLabel}
          </h2>
          <div className="space-y-2">
            {requiredItems.map((item, index) => renderItem(item, index === 0 && !completed.includes(item.id)))}
          </div>
        </section>
      )}

      {optionalItems.length > 0 && (
        <section className="mb-6" aria-labelledby="optional-today-heading">
          <h2 id="optional-today-heading" className="mb-3 text-[17px] font-semibold text-[#6E6E73] dark:text-[#AEAEB2]">
            {t.optionalTodayLabel}
          </h2>
          <div className="space-y-2">{optionalItems.map((item) => renderItem(item))}</div>
        </section>
      )}

      {draft.intervention && (
        <SafeInterventionCard intervention={draft.intervention} language={language} />
      )}

      {outsideCount > 0 && (
        <p className="mt-6 rounded-2xl bg-black/[0.035] p-4 text-[14px] leading-relaxed text-[#6E6E73] dark:bg-white/[0.06] dark:text-[#AEAEB2]">
          {t.outsideTodaySummary.replace("{count}", String(outsideCount))}
        </p>
      )}
      {focusItem ? <FocusTimer item={focusItem} language={language} onClose={() => setFocusItem(null)} /> : null}
    </div>
  );
}
