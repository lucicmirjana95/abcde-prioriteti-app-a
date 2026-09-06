import { useState } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, TrendingUp } from "lucide-react";
import PlanHistoryState from "../components/PlanHistoryState";
import type { AppALanguage } from "../types";
import { formatHistoryDate, getProgressSummary } from "./planHistory";
import { useAppAPlanHistory } from "./useAppAPlanHistory";
import RoutineWeekOverview from "../components/routines/RoutineWeekOverview";

const COPY = {
  en: { eyebrow: "A factual view", title: "Progress", intro: "Completed tasks and consistency are shown separately—there is no overall score.", empty: "Confirm a daily plan and complete a task to start seeing progress.", completed: "Tasks completed", active: "Active days", planned: "planned days", recent: "Recent days", tasks: "tasks", completedOnDay: "Completed on this day", noneCompleted: "No tasks completed" },
  sr: { eyebrow: "Činjenični pregled", title: "Napredak", intro: "Završeni zadaci i doslednost prikazani su odvojeno — bez ukupne ocene.", empty: "Potvrdite dnevni plan i završite zadatak da biste videli napredak.", completed: "Završeni zadaci", active: "Aktivni dani", planned: "dana sa planom", recent: "Poslednji dani", tasks: "zadataka", completedOnDay: "Završeno ovog dana", noneCompleted: "Nema završenih zadataka" },
  tr: { eyebrow: "Gerçeklere dayalı görünüm", title: "İlerleme", intro: "Tamamlanan görevler ve tutarlılık ayrı gösterilir; genel puan yoktur.", empty: "İlerlemeyi görmek için günlük planı onaylayın ve bir görevi tamamlayın.", completed: "Tamamlanan görevler", active: "Aktif günler", planned: "planlı gün", recent: "Son günler", tasks: "görev", completedOnDay: "Bu gün tamamlananlar", noneCompleted: "Tamamlanan görev yok" },
} as const;

export default function ProgressScreen({ language }: { language: AppALanguage }) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const history = useAppAPlanHistory();
  const t = COPY[language];
  if (!history.authReady || history.loading) return <PlanHistoryState language={language} state="loading" />;
  if (history.error) return <PlanHistoryState language={language} state="error" onSignIn={history.user ? history.retry : () => void history.signIn()} />;
  if (!history.user) return <PlanHistoryState language={language} state="sign_in" onSignIn={() => void history.signIn()} />;
  const summary = getProgressSummary(history.plans);
  return <div className="mx-auto w-full max-w-[760px] px-5 pb-8 sm:px-6">
    <header className="mb-7"><p className="app-a-eyebrow">{t.eyebrow}</p><h1 className="app-a-page-title">{t.title}</h1><p className="app-a-page-intro">{t.intro}</p></header>
    {summary.plannedDays === 0 ? <div className="app-a-surface flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center"><TrendingUp className="h-6 w-6 text-[#34C759]" aria-hidden="true" /><p className="max-w-sm text-[15px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.empty}</p></div> : <>
      <section className="grid grid-cols-2 gap-3" aria-label={t.title}>
        <article className="app-a-surface p-4 sm:p-5"><CheckCircle2 className="mb-5 h-5 w-5 text-[#34C759]" aria-hidden="true" /><p className="text-[30px] font-semibold tracking-[-0.03em] text-black dark:text-white">{summary.completedTasks}</p><h2 className="mt-1 text-[13px] leading-snug text-[#6E6E73] dark:text-[#AEAEB2]">{t.completed}</h2></article>
        <article className="app-a-surface p-4 sm:p-5"><CalendarDays className="mb-5 h-5 w-5 text-[#0071E3] dark:text-[#0A84FF]" aria-hidden="true" /><p className="text-[30px] font-semibold tracking-[-0.03em] text-black dark:text-white">{summary.activeDays}</p><h2 className="mt-1 text-[13px] leading-snug text-[#6E6E73] dark:text-[#AEAEB2]">{t.active} · {summary.plannedDays} {t.planned}</h2></article>
      </section>
      <section className="mt-7" aria-labelledby="recent-progress"><h2 id="recent-progress" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#AEAEB2]">{t.recent}</h2><div className="app-a-surface divide-y divide-black/5 overflow-hidden dark:divide-white/10">{summary.days.slice(0, 14).map((day) => { const expanded = expandedDate === day.localDate; return <div key={day.localDate}><button type="button" aria-expanded={expanded} onClick={() => setExpandedDate(expanded ? null : day.localDate)} className="app-a-focus-ring flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"><time className="text-[15px] font-medium text-black dark:text-white" dateTime={day.localDate}>{formatHistoryDate(day.localDate, language)}</time><span className="flex items-center gap-2 text-[14px] tabular-nums text-[#6E6E73] dark:text-[#AEAEB2]">{day.completed}/{day.total} {t.tasks}<ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></span></button>{expanded ? <div className="border-t px-4 py-3 sm:px-5" style={{ borderColor: "var(--app-a-border)", backgroundColor: "var(--app-a-surface-secondary)" }}><h3 className="text-[13px] font-semibold">{t.completedOnDay}</h3>{day.completedItems.length ? <ul className="mt-2 space-y-2">{day.completedItems.map((item) => <li key={item.id} className="flex items-start gap-2 text-[14px]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34C759]" aria-hidden="true" /><span>{item.title}{item.estimatedMinutes ? <span className="ml-2 text-[12px]" style={{ color: "var(--app-a-text-secondary)" }}>{item.estimatedMinutes} min</span> : null}</span></li>)}</ul> : <p className="mt-2 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>{t.noneCompleted}</p>}</div> : null}</div>; })}</div></section>
    </>}
    <RoutineWeekOverview userId={history.user.uid} language={language} />
  </div>;
}
