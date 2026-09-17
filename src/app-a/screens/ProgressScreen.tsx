import { useState } from "react";
import { Activity, CalendarDays, CheckCircle2, ChevronDown, Compass, TrendingUp, Zap } from "lucide-react";
import PlanHistoryState from "../components/PlanHistoryState";
import GrowthPathArt from "../components/GrowthPathArt";
import type { AppALanguage } from "../types";
import { formatHistoryDate, getProgressSummary } from "./planHistory";
import { useAppAPlanHistory } from "./useAppAPlanHistory";
import RoutineWeekOverview from "../components/routines/RoutineWeekOverview";

const COPY = {
  en: {
    eyebrow: "A factual view",
    title: "Progress",
    intro: "Completed focuses, consistency, and energy trends are shown without gamification or score pressure.",
    empty: "Confirm a daily plan and complete a task to start seeing progress.",
    whatChanged: "What changed",
    focuses: "Completed focuses",
    focusRatio: "{completed} of {total} focus goals",
    consistency: "Consistency",
    activeDays: "Active days",
    dayStreak: "{streak} day streak",
    plannedDays: "planned days",
    energy: "Average energy",
    energyOutOfFive: "out of 5",
    totalTasks: "Total completed tasks",
    recent: "Daily history",
    tasks: "tasks",
    completedOnDay: "Completed on this day",
    noneCompleted: "No tasks completed",
    focusCompletedBadge: "Focus completed",
  },
  sr: {
    eyebrow: "Činjenični pregled",
    title: "Napredak",
    intro: "Završeni fokusi, kontinuitet i energija prikazani su bez veštačke gejmifikacije i pritiska poena.",
    empty: "Potvrdite dnevni plan i završite zadatak da biste videli stvarni napredak.",
    whatChanged: "Šta se promenilo",
    focuses: "Završeni fokusi",
    focusRatio: "{completed} od {total} ciljeva fokusa",
    consistency: "Kontinuitet",
    activeDays: "Aktivni dani",
    dayStreak: "niz od {streak} dana",
    plannedDays: "dana sa planom",
    energy: "Prosečna energija",
    energyOutOfFive: "od 5",
    totalTasks: "Ukupno završenih zadataka",
    recent: "Istorija po danima",
    tasks: "zadataka",
    completedOnDay: "Završeno ovog dana",
    noneCompleted: "Nema završenih zadataka",
    focusCompletedBadge: "Fokus završen",
  },
  tr: {
    eyebrow: "Gerçeklere dayalı görünüm",
    title: "İlerleme",
    intro: "Tamamlanan odaklar, tutarlılık ve enerji eğilimleri puan baskısı veya oyunlaştırma olmadan gösterilir.",
    empty: "İlerlemeyi görmek için bir günlük planı onaylayın ve bir görevi tamamlayın.",
    whatChanged: "Neler değişti",
    focuses: "Tamamlanan odaklar",
    focusRatio: "{total} odak hedefinden {completed} tamamlandı",
    consistency: "Tutarlılık",
    activeDays: "Aktif günler",
    dayStreak: "{streak} günlük seri",
    plannedDays: "planlı gün",
    energy: "Ortalama enerji",
    energyOutOfFive: "üzerinden 5",
    totalTasks: "Toplam tamamlanan görev",
    recent: "Günlük geçmiş",
    tasks: "görev",
    completedOnDay: "Bu gün tamamlananlar",
    noneCompleted: "Tamamlanan görev yok",
    focusCompletedBadge: "Odak tamamlandı",
  },
} as const;

export default function ProgressScreen({ language }: { language: AppALanguage }) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const history = useAppAPlanHistory();
  const t = COPY[language];

  if (!history.authReady || history.loading) {
    return <PlanHistoryState language={language} state="loading" />;
  }

  if (history.error) {
    return (
      <PlanHistoryState
        language={language}
        state="error"
        onSignIn={history.user ? history.retry : () => void history.signIn()}
      />
    );
  }

  if (!history.user && history.plans.length === 0) {
    return (
      <PlanHistoryState
        language={language}
        state="sign_in"
        onSignIn={() => void history.signIn()}
      />
    );
  }

  const summary = getProgressSummary(history.plans);

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 sm:px-6 md:px-0 pb-28 sm:pb-32">
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="app-a-eyebrow">{t.eyebrow}</p>
          <h1 className="app-a-page-title">{t.title}</h1>
          <p className="app-a-page-intro">{t.intro}</p>
        </div>
        <GrowthPathArt
          variant="medallion"
          medallionType="plant"
          size={52}
          className="mt-1 shrink-0 shadow-sm"
          aria-hidden={true}
        />
      </header>

      {summary.plannedDays === 0 ? (
        <div className="app-a-surface flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center">
          <TrendingUp className="h-6 w-6 text-[#34C759]" aria-hidden="true" />
          <p className="max-w-sm text-[15px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.empty}</p>
        </div>
      ) : (
        <>
          {/* Factual Change Summary ("Šta se promenilo") */}
          <section
            className="mb-6 rounded-2xl border border-black/5 bg-white/70 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#1C1C1E]/80"
            aria-labelledby="what-changed-heading"
          >
            <div className="flex items-center gap-2.5 text-[#0071E3] dark:text-[#2997ff]">
              <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
              <h2 id="what-changed-heading" className="text-[13px] font-semibold uppercase tracking-[0.06em]">
                {t.whatChanged}
              </h2>
            </div>
            <p className="mt-2 text-[15px] font-medium leading-relaxed text-black dark:text-white">
              {summary.factualChangeSummary[language]}
            </p>
          </section>

          {/* Factual Metrics 4-Card Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label={t.title}>
            {/* 1. Completed Focuses */}
            <article className="app-a-surface p-4 sm:p-5">
              <CheckCircle2 className="mb-3 h-5 w-5 text-[#34C759]" aria-hidden="true" />
              <p className="text-[28px] font-semibold tracking-[-0.03em] text-black dark:text-white">
                {summary.completedFocusCount}
              </p>
              <h3 className="mt-1 text-[13px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.focuses}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                {t.focusRatio.replace("{completed}", String(summary.completedFocusCount)).replace("{total}", String(summary.totalFocusCount))}
              </p>
            </article>

            {/* 2. Consistency & Active Days */}
            <article className="app-a-surface p-4 sm:p-5">
              <CalendarDays className="mb-3 h-5 w-5 text-[#0071E3] dark:text-[#0A84FF]" aria-hidden="true" />
              <p className="text-[28px] font-semibold tracking-[-0.03em] text-black dark:text-white">
                {summary.activeDays}
              </p>
              <h3 className="mt-1 text-[13px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.activeDays}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                {summary.consistencyStreak > 0
                  ? t.dayStreak.replace("{streak}", String(summary.consistencyStreak))
                  : `${summary.plannedDays} ${t.plannedDays}`}
              </p>
            </article>

            {/* 3. Energy Rating */}
            <article className="app-a-surface p-4 sm:p-5">
              <Zap className="mb-3 h-5 w-5 text-[#FF9500]" aria-hidden="true" />
              <p className="text-[28px] font-semibold tracking-[-0.03em] text-black dark:text-white">
                {summary.averageEnergy !== null ? summary.averageEnergy : "—"}
              </p>
              <h3 className="mt-1 text-[13px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.energy}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                {summary.averageEnergy !== null ? t.energyOutOfFive : "—"}
              </p>
            </article>

            {/* 4. Total Completed Tasks */}
            <article className="app-a-surface p-4 sm:p-5">
              <Activity className="mb-3 h-5 w-5 text-[#5856D6] dark:text-[#5E5CE6]" aria-hidden="true" />
              <p className="text-[28px] font-semibold tracking-[-0.03em] text-black dark:text-white">
                {summary.completedTasks}
              </p>
              <h3 className="mt-1 text-[13px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.totalTasks}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                {summary.plannedDays} {t.plannedDays}
              </p>
            </article>
          </section>

          {/* Daily History */}
          <section className="mt-8" aria-labelledby="recent-progress">
            <h2 id="recent-progress" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#AEAEB2]">
              {t.recent}
            </h2>
            <div className="app-a-surface divide-y divide-black/5 overflow-hidden dark:divide-white/10">
              {summary.days.slice(0, 14).map((day) => {
                const expanded = expandedDate === day.localDate;
                return (
                  <div key={day.localDate}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedDate(expanded ? null : day.localDate)}
                      className="app-a-focus-ring flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
                    >
                      <div className="flex items-center gap-2">
                        <time className="text-[15px] font-medium text-black dark:text-white" dateTime={day.localDate}>
                          {formatHistoryDate(day.localDate, language)}
                        </time>
                        {day.completedFocusCount > 0 && (
                          <span className="rounded-full bg-[#34C759]/10 px-2 py-0.5 text-[11px] font-medium text-[#34C759] dark:bg-[#30D158]/15 dark:text-[#30D158]">
                            {t.focusCompletedBadge}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-2 text-[14px] tabular-nums text-[#6E6E73] dark:text-[#AEAEB2]">
                        {day.completed}/{day.total} {t.tasks}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </span>
                    </button>

                    {expanded && (
                      <div
                        className="border-t px-4 py-3 sm:px-5"
                        style={{
                          borderColor: "var(--app-a-border)",
                          backgroundColor: "var(--app-a-surface-secondary)",
                        }}
                      >
                        <h3 className="text-[13px] font-semibold text-black dark:text-white">
                          {t.completedOnDay}
                        </h3>
                        {day.completedItems.length > 0 ? (
                          <ul className="mt-2 space-y-2">
                            {day.completedItems.map((item) => (
                              <li key={item.id} className="flex items-start gap-2 text-[14px]">
                                <CheckCircle2
                                  className="mt-0.5 h-4 w-4 shrink-0 text-[#34C759]"
                                  aria-hidden="true"
                                />
                                <span>
                                  {item.title}
                                  {item.estimatedMinutes ? (
                                    <span
                                      className="ml-2 text-[12px]"
                                      style={{ color: "var(--app-a-text-secondary)" }}
                                    >
                                      {item.estimatedMinutes} min
                                    </span>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>
                            {t.noneCompleted}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {history.user && <RoutineWeekOverview userId={history.user.uid} language={language} />}
    </div>
  );
}
