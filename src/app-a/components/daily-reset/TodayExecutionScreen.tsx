import { useState } from "react";
import { Check, CheckCircle2, ChevronRight, Clock3, Pencil, Sparkles, Timer, Wind } from "lucide-react";
import type { DailyPlanDraft, DailyPlanItem } from "../../domain/daily-reset/contracts";
import { APP_A_TRANSLATIONS, type AppALanguage } from "../../types";
import SafeInterventionCard from "./SafeInterventionCard";
import { normalizeCompletedItemIds } from "../../screens/todayExecution";
import FocusTimer from "../focus/FocusTimer";
import QuickAddTodayTask from "./QuickAddTodayTask";
import type { QuickAddInput, QuickAddResult } from "./QuickAddTodayTask";
import DailyLoadWarning from "./DailyLoadWarning";

const LABELS = {
  en: {
    nextTask: "Next task",
    firstFocusBadge: "First Focus · Priority",
    laterTaskBadge: "Next task",
    optionalTaskBadge: "Optional task",
    startFocus: "Start focus",
    quickReset: "Quick reset",
    upNext: "Up next",
    optionalHeading: "Optional — if time remains",
    completedHeading: "Completed tasks",
    allRequiredDone: "All primary priorities completed!",
    allRequiredDoneSub: "Take a break or continue with optional tasks if you have remaining energy.",
    allDone: "Everything planned for today is done!",
    allDoneSub: "Great work! Enjoy your accomplishment and the rest of your day.",
    fixedTag: "fixed commitment",
    deadlinePrefix: "Due",
    editPlan: "Edit plan",
    flexibleFixedSplit: (flex: number, fixed: number) => `${flex} min flexible · ${fixed} min fixed`,
    minutes: "min",
    completedOf: (done: number, total: number) => `${done} of ${total} completed`,
    uncheck: "Mark incomplete",
    check: "Mark complete",
  },
  sr: {
    nextTask: "Sledeći zadatak",
    firstFocusBadge: "Prvi fokus · Trenutni prioritet",
    laterTaskBadge: "Sledeći zadatak",
    optionalTaskBadge: "Opcioni zadatak",
    startFocus: "Pokreni fokus",
    quickReset: "Kratki predah",
    upNext: "Dolazi posle",
    optionalHeading: "Opciono — ako ostane vremena",
    completedHeading: "Završeni zadaci",
    allRequiredDone: "Svi glavni prioriteti su završeni!",
    allRequiredDoneSub: "Napravite predah ili pređite na opcione zadatke ako imate slobodnog vremena i energije.",
    allDone: "Sve planirano za danas je završeno!",
    allDoneSub: "Odličan posao! Uživajte u zasluženom odmoru.",
    fixedTag: "fiksna obaveza",
    deadlinePrefix: "Rok",
    editPlan: "Uredi plan",
    flexibleFixedSplit: (flex: number, fixed: number) => `${flex} min fleksibilno · ${fixed} min fiksno`,
    minutes: "min",
    completedOf: (done: number, total: number) => `${done} od ${total} završeno`,
    uncheck: "Vrati u nezavršene",
    check: "Označi kao završeno",
  },
  tr: {
    nextTask: "Sıradaki görev",
    firstFocusBadge: "İlk Odak · Öncelik",
    laterTaskBadge: "Sıradaki görev",
    optionalTaskBadge: "İsteğe bağlı görev",
    startFocus: "Odağı başlat",
    quickReset: "Kısa mola",
    upNext: "Sırada ne var",
    optionalHeading: "İsteğe bağlı — zaman kalırsa",
    completedHeading: "Tamamlanan görevler",
    allRequiredDone: "Tüm ana öncelikler tamamlandı!",
    allRequiredDoneSub: "Mola verin veya enerjiniz varsa isteğe bağlı görevlerle devam edin.",
    allDone: "Bugün için planlanan her şey tamamlandı!",
    allDoneSub: "Harika iş! Başarınızın ve günün geri kalanının tadını çıkarın.",
    fixedTag: "sabit yükümlülük",
    deadlinePrefix: "Son tarih",
    editPlan: "Planı düzenle",
    flexibleFixedSplit: (flex: number, fixed: number) => `${flex} dk esnek · ${fixed} dk sabit`,
    minutes: "dk",
    completedOf: (done: number, total: number) => `${done} / ${total} tamamlandı`,
    uncheck: "Geri al",
    check: "Tamamlandı olarak işaretle",
  },
} as const;

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
  const loc = LABELS[language] || LABELS.en;
  const [focusItem, setFocusItem] = useState<DailyPlanItem | null>(null);

  const completed = normalizeCompletedItemIds(draft, completedItemIds);
  const isComplete = (id: string) => completed.includes(id);

  const firstFocusItems = draft.firstFocus;
  const laterTodayItems = draft.laterToday;
  const optionalItems = draft.ifCapacityRemains;

  const requiredItems = [...firstFocusItems, ...laterTodayItems];
  const allTodayItems = [...requiredItems, ...optionalItems];

  const unfinishedFirstFocus = firstFocusItems.filter((i) => !isComplete(i.id));
  const unfinishedLater = laterTodayItems.filter((i) => !isComplete(i.id));
  const unfinishedOptional = optionalItems.filter((i) => !isComplete(i.id));
  const completedItems = allTodayItems.filter((i) => isComplete(i.id));

  // Determine the dominant Next item
  let nextItem: DailyPlanItem | null = null;
  let nextItemSource: "firstFocus" | "laterToday" | "optional" | null = null;

  if (unfinishedFirstFocus.length > 0) {
    nextItem = unfinishedFirstFocus[0];
    nextItemSource = "firstFocus";
  } else if (unfinishedLater.length > 0) {
    nextItem = unfinishedLater[0];
    nextItemSource = "laterToday";
  } else if (unfinishedOptional.length > 0) {
    nextItem = unfinishedOptional[0];
    nextItemSource = "optional";
  }

  // Determine upcoming items that are NOT the next item
  const upNextRequired = [
    ...unfinishedFirstFocus.filter((i) => i.id !== nextItem?.id),
    ...unfinishedLater.filter((i) => i.id !== nextItem?.id),
  ];

  const totalTasks = allTodayItems.length;
  const completedCount = completedItems.length;
  const allDone = totalTasks > 0 && completedCount === totalTasks;
  const allRequiredDone =
    requiredItems.length > 0 &&
    unfinishedFirstFocus.length === 0 &&
    unfinishedLater.length === 0;

  const outsideCount =
    draft.deferredItems.length + draft.longTermIdeas.length + draft.nonActionItems.length;

  const renderCompactItem = (item: DailyPlanItem) => {
    return (
      <div
        key={item.id}
        className="app-a-focus-ring flex min-h-[56px] w-full items-start gap-3 rounded-xl border p-3 sm:p-3.5 transition-colors"
        style={{
          backgroundColor: "var(--app-a-surface)",
          borderColor: "var(--app-a-border)",
        }}
      >
        <button
          type="button"
          aria-label={`${loc.check}: ${item.title}`}
          disabled={Boolean(updatingItemId)}
          onClick={() => onToggle(item.id)}
          className="app-a-focus-ring mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors hover:border-[var(--app-a-accent)]"
          style={{
            borderColor: "var(--app-a-border-strong)",
            backgroundColor: "transparent",
          }}
        >
          <span className="sr-only">{loc.check}</span>
        </button>

        <div className="min-w-0 flex-1">
          <p
            className="text-[15px] sm:text-[16px] font-semibold leading-snug break-words"
            style={{ color: "var(--app-a-text)" }}
          >
            {item.title}
          </p>
          {item.description && (
            <p
              className="mt-0.5 text-[13px] leading-relaxed line-clamp-2 break-words"
              style={{ color: "var(--app-a-text-secondary)" }}
            >
              {item.description}
            </p>
          )}
          <div
            className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {item.estimatedMinutes} {loc.minutes}
            </span>
            {item.capacityType === "fixed" && (
              <span>· {loc.fixedTag}</span>
            )}
            {(item.deadlineText || item.deadlineIso) && (
              <span style={{ color: "var(--app-a-warning-text)" }}>
                · {loc.deadlinePrefix}: {item.deadlineText || item.deadlineIso}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setFocusItem(item)}
            className="app-a-focus-ring flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--app-a-accent-soft)]"
            style={{
              borderColor: "var(--app-a-border)",
              color: "var(--app-a-accent)",
            }}
            aria-label={`${loc.startFocus}: ${item.title}`}
          >
            <Timer className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenReset}
            className="app-a-focus-ring flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--app-a-disabled-bg)]"
            style={{
              borderColor: "var(--app-a-border)",
              color: "var(--app-a-text-secondary)",
            }}
            aria-label={`${loc.quickReset}`}
          >
            <Wind className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderCompletedItem = (item: DailyPlanItem) => {
    return (
      <div
        key={item.id}
        className="flex min-h-[50px] w-full items-start gap-3 rounded-xl border p-2.5 sm:p-3 opacity-70 transition-opacity hover:opacity-95"
        style={{
          backgroundColor: "var(--app-a-surface-secondary)",
          borderColor: "var(--app-a-border)",
        }}
      >
        <button
          type="button"
          aria-label={`${loc.uncheck}: ${item.title}`}
          disabled={Boolean(updatingItemId)}
          onClick={() => onToggle(item.id)}
          className="app-a-focus-ring mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: "var(--app-a-success)",
            color: "#ffffff",
          }}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className="text-[14px] sm:text-[15px] line-through break-words font-medium"
            style={{ color: "var(--app-a-text-tertiary)" }}
          >
            {item.title}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px]" style={{ color: "var(--app-a-text-tertiary)" }}>
            <Clock3 className="h-3 w-3" />
            <span>{item.estimatedMinutes} {loc.minutes}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-3.5 pb-16 sm:px-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="mb-1 text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--app-a-accent)" }}
            >
              {t.today}
            </p>
            <h1
              className="text-[26px] sm:text-[32px] font-bold leading-tight tracking-[-0.035em] break-words"
              style={{ color: "var(--app-a-text)" }}
            >
              {t.todayPlanTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={onEditPlan}
            className="app-a-secondary-button app-a-focus-ring flex shrink-0 items-center gap-1.5 px-3 sm:px-3.5 py-2 text-[13px] sm:text-[14px] font-medium"
            aria-label={t.editTodayPlan}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.editTodayPlan}</span>
          </button>
        </div>

        {/* Compact Calm Progress Indicator */}
        <div
          className="mt-4 rounded-xl border p-3 sm:p-3.5"
          style={{ backgroundColor: "var(--app-a-surface)", borderColor: "var(--app-a-border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span className="font-semibold" style={{ color: "var(--app-a-text)" }}>
              {loc.completedOf(completedCount, totalTasks)}
            </span>
            <span className="font-medium" style={{ color: "var(--app-a-text-secondary)" }}>
              {draft.plannedFixedMinutes
                ? loc.flexibleFixedSplit(
                    draft.plannedFlexibleMinutes ?? draft.plannedRequiredMinutes,
                    draft.plannedFixedMinutes
                  )
                : `${draft.plannedRequiredMinutes} ${loc.minutes}`}
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--app-a-disabled-bg)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}%`,
                backgroundColor: "#34C759",
              }}
            />
          </div>
        </div>
      </header>

      {/* Daily load warning if day is overloaded */}
      <DailyLoadWarning draft={draft} language={language} completedItemIds={completed} onReview={onEditPlan} />

      {error && (
        <div role="alert" className="app-a-panel-danger mb-5 text-[14px]">
          {error}
        </div>
      )}

      {/* 1. DOMINANT NEXT CARD */}
      {nextItem && !allDone && (
        <section
          aria-labelledby="dominant-next-heading"
          className="mb-6 rounded-2xl border-2 p-4 sm:p-6 transition-all"
          style={{
            backgroundColor: "var(--app-a-surface)",
            borderColor:
              nextItemSource === "firstFocus"
                ? "var(--app-a-accent)"
                : "var(--app-a-border-strong)",
            boxShadow: "var(--app-a-shadow)",
          }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor:
                  nextItemSource === "firstFocus"
                    ? "var(--app-a-accent-soft)"
                    : "var(--app-a-disabled-bg)",
                color:
                  nextItemSource === "firstFocus"
                    ? "var(--app-a-accent)"
                    : "var(--app-a-text-secondary)",
              }}
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {nextItemSource === "firstFocus"
                ? loc.firstFocusBadge
                : nextItemSource === "optional"
                ? loc.optionalTaskBadge
                : loc.laterTaskBadge}
            </span>

            <div
              className="flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: "var(--app-a-text-secondary)" }}
            >
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{nextItem.estimatedMinutes} {loc.minutes}</span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <button
              type="button"
              aria-label={`${loc.check}: ${nextItem.title}`}
              disabled={Boolean(updatingItemId)}
              onClick={() => onToggle(nextItem.id)}
              className="app-a-focus-ring mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all hover:scale-105 active:scale-95"
              style={{
                borderColor: "var(--app-a-accent)",
                backgroundColor: "transparent",
              }}
            >
              <span className="sr-only">{loc.check}</span>
            </button>

            <div className="min-w-0 flex-1">
              <h2
                id="dominant-next-heading"
                className="text-[19px] sm:text-[22px] font-bold leading-snug tracking-[-0.02em] break-words"
                style={{ color: "var(--app-a-text)" }}
              >
                {nextItem.title}
              </h2>

              {nextItem.description && (
                <p
                  className="mt-1.5 text-[14px] sm:text-[15px] leading-relaxed break-words"
                  style={{ color: "var(--app-a-text-secondary)" }}
                >
                  {nextItem.description}
                </p>
              )}

              {/* Tags */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
                {nextItem.capacityType === "fixed" && (
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 font-medium"
                    style={{
                      backgroundColor: "var(--app-a-disabled-bg)",
                      color: "var(--app-a-text-secondary)",
                    }}
                  >
                    {loc.fixedTag}
                  </span>
                )}
                {(nextItem.deadlineText || nextItem.deadlineIso) && (
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 font-semibold"
                    style={{
                      backgroundColor: "var(--app-a-warning-soft)",
                      color: "var(--app-a-warning-text)",
                    }}
                  >
                    {loc.deadlinePrefix}: {nextItem.deadlineText || nextItem.deadlineIso}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setFocusItem(nextItem)}
                  className="app-a-primary-button app-a-focus-ring flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-semibold"
                  aria-label={`${loc.startFocus}: ${nextItem.title}`}
                >
                  <Timer className="h-4 w-4" aria-hidden="true" />
                  <span>{loc.startFocus}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenReset}
                  className="app-a-secondary-button app-a-focus-ring flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 px-3.5 py-2.5 text-[14px] font-semibold"
                  aria-label={`${loc.quickReset}`}
                >
                  <Wind className="h-4 w-4" aria-hidden="true" />
                  <span>{loc.quickReset}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. UPCOMING REQUIRED TASKS ("Dolazi posle") */}
      {upNextRequired.length > 0 && (
        <section className="mb-6" aria-labelledby="up-next-heading">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2
              id="up-next-heading"
              className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wider"
              style={{ color: "var(--app-a-text-tertiary)" }}
            >
              {loc.upNext} ({upNextRequired.length})
            </h2>
          </div>

          <div className="space-y-2">
            {upNextRequired.map((item) => renderCompactItem(item))}
          </div>
        </section>
      )}

      {/* Notice when all required tasks are done, but optional tasks exist */}
      {allRequiredDone && !allDone && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3.5 rounded-2xl border p-4 sm:p-5"
          style={{
            backgroundColor: "var(--app-a-success-soft)",
            borderColor: "var(--app-a-success)",
            color: "var(--app-a-success-text)",
          }}
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[15px] font-bold">{loc.allRequiredDone}</p>
            <p className="mt-1 text-[13px] leading-relaxed opacity-90">{loc.allRequiredDoneSub}</p>
          </div>
        </div>
      )}

      {/* 3. OPTIONAL TASKS (Collapsed by default) */}
      {optionalItems.length > 0 && (
        <details
          className="group mb-6 rounded-2xl border p-3.5 sm:p-4 transition-all"
          style={{ backgroundColor: "var(--app-a-surface)", borderColor: "var(--app-a-border)" }}
        >
          <summary
            className="app-a-focus-ring flex cursor-pointer list-none items-center justify-between text-[13px] sm:text-[14px] font-semibold"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            <span className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 transition-transform duration-200 group-open:rotate-90" />
              <span>{loc.optionalHeading} ({unfinishedOptional.length})</span>
            </span>
            <span className="text-[12px] font-normal" style={{ color: "var(--app-a-text-tertiary)" }}>
              {unfinishedOptional.reduce((acc, i) => acc + i.estimatedMinutes, 0)} {loc.minutes}
            </span>
          </summary>
          <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--app-a-border)" }}>
            {unfinishedOptional.length > 0 ? (
              unfinishedOptional.map((item) => renderCompactItem(item))
            ) : (
              <p className="py-2 text-[13px]" style={{ color: "var(--app-a-text-tertiary)" }}>
                {language === "sr"
                  ? "Svi opcioni zadaci su završeni."
                  : language === "tr"
                  ? "Tüm isteğe bağlı görevler tamamlandı."
                  : "All optional tasks are completed."}
              </p>
            )}
          </div>
        </details>
      )}

      {/* 4. COMPLETED TASKS (Collapsed) */}
      {completedItems.length > 0 && !allDone && (
        <details
          className="group mb-6 rounded-2xl border p-3 sm:p-3.5 transition-all"
          style={{ backgroundColor: "var(--app-a-surface-secondary)", borderColor: "var(--app-a-border)" }}
        >
          <summary
            className="app-a-focus-ring flex cursor-pointer list-none items-center justify-between text-[13px] font-medium"
            style={{ color: "var(--app-a-text-tertiary)" }}
          >
            <span className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-90" />
              <span>{loc.completedHeading} ({completedItems.length})</span>
            </span>
            <span className="text-[12px]">
              {completedItems.reduce((acc, i) => acc + i.estimatedMinutes, 0)} {loc.minutes}
            </span>
          </summary>
          <div className="mt-3 space-y-2 border-t pt-2.5" style={{ borderColor: "var(--app-a-border)" }}>
            {completedItems.map((item) => renderCompletedItem(item))}
          </div>
        </details>
      )}

      {/* 5. ALL DONE STATE */}
      {allDone && (
        <div
          role="status"
          className="mb-6 flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 sm:p-8 text-center"
          style={{
            backgroundColor: "var(--app-a-success-soft)",
            borderColor: "var(--app-a-success)",
            color: "var(--app-a-success-text)",
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#34C759] text-white shadow-sm">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight">
            {loc.allDone}
          </h2>
          <p className="max-w-[440px] text-[14px] leading-relaxed opacity-90">
            {loc.allDoneSub}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenReset}
              className="app-a-secondary-button app-a-focus-ring flex items-center gap-2 px-4 py-2 text-[14px] font-semibold"
            >
              <Wind className="h-4 w-4" />
              <span>{loc.quickReset}</span>
            </button>
          </div>
        </div>
      )}

      {/* Safe Intervention Card if present */}
      {draft.intervention && (
        <SafeInterventionCard
          intervention={draft.intervention}
          language={language}
          onOpenReset={onOpenReset}
        />
      )}

      {/* 6. QUICK ADD (Secondary & unburdensome) */}
      <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--app-a-border)" }}>
        <QuickAddTodayTask
          language={language}
          availableMinutes={draft.availableMinutes}
          plannedRequiredMinutes={draft.plannedFlexibleMinutes ?? draft.plannedRequiredMinutes}
          onAddToday={onQuickAddToday}
          onSaveLater={onQuickSaveLater}
          onAdjustPlan={onEditPlan}
        />
      </div>

      {/* Outside Today summary */}
      {outsideCount > 0 && (
        <details
          className="mt-6 rounded-2xl border p-4 text-[14px]"
          style={{
            backgroundColor: "var(--app-a-disabled-bg)",
            borderColor: "var(--app-a-border)",
          }}
        >
          <summary
            className="app-a-focus-ring cursor-pointer font-medium"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            {t.outsideTodaySummary.replace("{count}", String(outsideCount))}
          </summary>
          <div
            className="mt-3 space-y-3 border-t pt-3"
            style={{ borderColor: "var(--app-a-border)" }}
          >
            {draft.deferredItems.length > 0 && (
              <div>
                <p
                  className="text-[12px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--app-a-text-tertiary)" }}
                >
                  {language === "sr"
                    ? "Sačuvano u Inboksu za kasnije"
                    : language === "tr"
                    ? "Daha sonrası için Gelen Kutusuna kaydedildi"
                    : "Saved in Inbox for later"}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {draft.deferredItems.map((item) => (
                    <li key={item.id}>• {item.suggestedAction || item.originalText}</li>
                  ))}
                </ul>
              </div>
            )}
            {draft.longTermIdeas.length > 0 && (
              <div>
                <p
                  className="text-[12px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--app-a-text-tertiary)" }}
                >
                  {language === "sr"
                    ? "Dugoročne ideje — sačuvane u Vision"
                    : language === "tr"
                    ? "Uzun vadeli fikirler — Vision'da saklandı"
                    : "Long-term ideas — saved in Vision"}
                </p>
                <ul
                  className="mt-1.5 space-y-1"
                  style={{ color: "var(--app-a-text-secondary)" }}
                >
                  {draft.longTermIdeas.map((item) => (
                    <li key={item.id}>• {item.originalText}</li>
                  ))}
                </ul>
              </div>
            )}
            {draft.nonActionItems.length > 0 && (
              <div>
                <p
                  className="text-[12px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--app-a-text-tertiary)" }}
                >
                  {language === "sr"
                    ? "Beleške — Inboks › Za razjašnjenje"
                    : language === "tr"
                    ? "Notlar — Gelen Kutusu › Netleştirilecek"
                    : "Notes — Inbox › To clarify"}
                </p>
                <ul
                  className="mt-1.5 space-y-1"
                  style={{ color: "var(--app-a-text-secondary)" }}
                >
                  {draft.nonActionItems.map((item) => (
                    <li key={item.id}>• {item.originalText}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Focus Timer Modal */}
      {focusItem && (
        <FocusTimer
          item={focusItem}
          language={language}
          defaultMinutes={defaultFocusMinutes}
          onClose={() => setFocusItem(null)}
        />
      )}
    </div>
  );
}

