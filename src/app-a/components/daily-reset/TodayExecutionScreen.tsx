import { useState } from "react";
import { Check, Clock3, Pencil, Sparkles, Timer, Wind } from "lucide-react";
import type { DailyPlanDraft, DailyPlanItem } from "../../domain/daily-reset/contracts";
import { APP_A_TRANSLATIONS, type AppALanguage } from "../../types";
import SafeInterventionCard from "./SafeInterventionCard";
import { normalizeCompletedItemIds } from "../../screens/todayExecution";
import FocusTimer from "../focus/FocusTimer";
import QuickAddTodayTask from "./QuickAddTodayTask";
import type { QuickAddInput, QuickAddResult } from "./QuickAddTodayTask";
import DailyLoadWarning from "./DailyLoadWarning";

interface Props {
  draft: DailyPlanDraft;
  language: AppALanguage;
  completedItemIds: string[];
  updatingItemId?: string | null;
  error?: string | null;
  onToggle: (itemId: string) => void;
  onEditPlan: () => void;
  defaultFocusMinutes: 15 | 25 | 45 | 60;
  onOpenReset: () => void;
  onQuickAddToday: (input: QuickAddInput) => Promise<QuickAddResult>;
  onQuickSaveLater: (title: string, minutes: number, capacityType: "flexible" | "fixed") => Promise<boolean>;
}

export default function TodayExecutionScreen({
  draft,
  language,
  completedItemIds,
  updatingItemId,
  error,
  onToggle,
  onEditPlan,
  defaultFocusMinutes,
  onOpenReset,
  onQuickAddToday,
  onQuickSaveLater,
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
        className={`app-a-focus-ring flex min-h-[64px] w-full items-start gap-3 rounded-[16px] border p-3.5 text-left transition-all sm:p-4 ${
          isComplete
            ? "border-black/[0.06] bg-black/[0.025] text-black/45 dark:border-white/[0.06] dark:bg-white/[0.035] dark:text-white/45"
            : emphasized
              ? "border-[#0A84FF]/30 bg-white text-black shadow-[0_10px_32px_rgba(0,113,227,0.10)] dark:bg-[#242426] dark:text-white"
              : "border-black/[0.07] bg-white/70 text-black dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white"
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
            {item.capacityType === "fixed" && (
              <span className="ml-1 text-[#6E6E73] dark:text-[#AEAEB2]">
                · {language === "sr" ? "fiksna obaveza" : language === "tr" ? "sabit yükümlülük" : "fixed commitment"}
              </span>
            )}
            {(item.deadlineText || item.deadlineIso) && (
              <span className="ml-1 text-amber-700 dark:text-amber-400">
                · {item.deadlineText || item.deadlineIso}
              </span>
            )}
          </span>
        </span>
        {!isComplete && <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">{item.capacityType !== "fixed" ? <button type="button" onClick={() => setFocusItem(item)} className={emphasized ? "app-a-primary-button app-a-focus-ring justify-center gap-1.5 px-3 text-[13px]" : "app-a-focus-ring rounded-xl border border-black/10 p-2.5 text-[#0071E3] dark:border-white/15 dark:text-[#0A84FF]"} aria-label={`Focus: ${item.title}`}><Timer className="h-4 w-4" />{emphasized ? <span>{language === "sr" ? "Pokreni fokus" : language === "tr" ? "Odağı başlat" : "Start focus"}</span> : null}</button> : null}<button type="button" onClick={onOpenReset} className="app-a-focus-ring rounded-xl border border-black/10 p-2.5 text-[#0071E3] dark:border-white/15 dark:text-[#0A84FF]" aria-label={language === "sr" ? `Predah pre: ${item.title}` : language === "tr" ? `${item.title} öncesi mola` : `Reset before: ${item.title}`}><Wind className="h-4 w-4" /></button></div>}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-16 sm:px-6">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0071E3] dark:text-[#0A84FF]">
              {t.today}
            </p>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.035em] text-black sm:text-[34px] dark:text-white">
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
        <div className="mt-3 flex items-center gap-3 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]" aria-label={summary}>
          <span className="shrink-0 font-medium">{summary}</span>
          <div className="h-1.5 min-w-16 max-w-40 flex-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.1]">
          <div
            className="h-full rounded-full bg-[#34C759] transition-[width]"
            style={{ width: `${todayItems.length ? (completed.length / todayItems.length) * 100 : 0}%` }}
          />
          </div>
          <span className="shrink-0">{draft.plannedRequiredMinutes} min</span>
        </div>
        {draft.plannedFixedMinutes ? <p className="mt-1.5 text-[12px] text-[#86868B]">{language === 'sr' ? `${draft.plannedFlexibleMinutes ?? 0} min fleksibilno · ${draft.plannedFixedMinutes} min fiksno` : language === 'tr' ? `${draft.plannedFlexibleMinutes ?? 0} dk esnek · ${draft.plannedFixedMinutes} dk sabit` : `${draft.plannedFlexibleMinutes ?? 0} min flexible · ${draft.plannedFixedMinutes} min fixed`}</p> : null}
      </header>

      <DailyLoadWarning draft={draft} language={language} completedItemIds={completed} onReview={onEditPlan} />

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
        <section className="mb-7" aria-labelledby="required-today-heading">
          <h2 id="required-today-heading" className="mb-3 text-[14px] font-semibold uppercase tracking-[0.07em] text-[#6E6E73] dark:text-[#AEAEB2]">
            {t.requiredTodayLabel}
          </h2>
          <div className="space-y-2.5">
            {requiredItems.map((item, index) => renderItem(item, index === 0 && !completed.includes(item.id)))}
          </div>
        </section>
      )}

      {optionalItems.length > 0 && (
        <details className="mb-6 rounded-2xl border border-black/[0.07] p-3 dark:border-white/[0.08]">
          <summary id="optional-today-heading" className="app-a-focus-ring cursor-pointer px-1 text-[14px] font-semibold uppercase tracking-[0.07em] text-[#86868B]">
            {t.optionalTodayLabel} ({optionalItems.length})
          </summary>
          <div className="mt-3 space-y-2">{optionalItems.map((item) => renderItem(item))}</div>
        </details>
      )}

      {draft.intervention && (
        <SafeInterventionCard intervention={draft.intervention} language={language} onOpenReset={onOpenReset} />
      )}

      <div className="mt-7 border-t border-black/[0.07] pt-5 dark:border-white/[0.08]">
        <QuickAddTodayTask language={language} availableMinutes={draft.availableMinutes} plannedRequiredMinutes={draft.plannedFlexibleMinutes ?? draft.plannedRequiredMinutes} onAddToday={onQuickAddToday} onSaveLater={onQuickSaveLater} onAdjustPlan={onEditPlan} />
      </div>

      {outsideCount > 0 && (
        <details className="mt-6 rounded-2xl border border-black/[0.07] bg-black/[0.025] p-4 text-[14px] dark:border-white/[0.08] dark:bg-white/[0.035]">
          <summary className="app-a-focus-ring cursor-pointer font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
            {t.outsideTodaySummary.replace("{count}", String(outsideCount))}
          </summary>
          <div className="mt-3 space-y-3 border-t border-black/[0.07] pt-3 dark:border-white/[0.08]">
            {draft.deferredItems.length ? <div><p className="text-[12px] font-semibold uppercase tracking-wide text-[#86868B]">{language === "sr" ? "Sačuvano u Inboksu za kasnije" : language === "tr" ? "Daha sonrası için Gelen Kutusuna kaydedildi" : "Saved in Inbox for later"}</p><ul className="mt-1.5 space-y-1">{draft.deferredItems.map((item) => <li key={item.id}>• {item.suggestedAction || item.originalText}</li>)}</ul></div> : null}
            {draft.longTermIdeas.length ? <div><p className="text-[12px] font-semibold uppercase tracking-wide text-[#86868B]">{language === "sr" ? "Dugoročne ideje — sačuvane u Vision" : language === "tr" ? "Uzun vadeli fikirler — Vision'da saklandı" : "Long-term ideas — saved in Vision"}</p><ul className="mt-1.5 space-y-1 text-[#6E6E73] dark:text-[#AEAEB2]">{draft.longTermIdeas.map((item) => <li key={item.id}>• {item.originalText}</li>)}</ul></div> : null}
            {draft.nonActionItems.length ? <div><p className="text-[12px] font-semibold uppercase tracking-wide text-[#86868B]">{language === "sr" ? "Beleške — Inboks › Za razjašnjenje" : language === "tr" ? "Notlar — Gelen Kutusu › Netleştirilecek" : "Notes — Inbox › To clarify"}</p><ul className="mt-1.5 space-y-1 text-[#6E6E73] dark:text-[#AEAEB2]">{draft.nonActionItems.map((item) => <li key={item.id}>• {item.originalText}</li>)}</ul></div> : null}
          </div>
        </details>
      )}
      {focusItem ? <FocusTimer item={focusItem} language={language} defaultMinutes={defaultFocusMinutes} onClose={() => setFocusItem(null)} /> : null}
    </div>
  );
}
