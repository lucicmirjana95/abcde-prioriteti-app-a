import { Leaf } from "lucide-react";
import type { AppALanguage } from "../../types";
import { useDailyRoutines } from "../../routines/useDailyRoutines";

const COPY = {
  en: { title: "Routine consistency", intro: "Full and minimum versions are shown separately. Empty means not recorded, not failed.", full: "Full", minimum: "Minimum", skipped: "Skipped", paused: "Paused", empty: "Not recorded" },
  sr: { title: "Doslednost rutina", intro: "Puna i minimalna verzija prikazane su odvojeno. Prazno znači da nije evidentirano, ne neuspeh.", full: "Puna", minimum: "Minimalna", skipped: "Preskočeno", paused: "Pauzirano", empty: "Nije evidentirano" },
  tr: { title: "Rutin tutarlılığı", intro: "Tam ve minimum sürümler ayrı gösterilir. Boş, başarısız değil kaydedilmemiş demektir.", full: "Tam", minimum: "Minimum", skipped: "Atlandı", paused: "Duraklatıldı", empty: "Kaydedilmedi" },
} as const;

const STATUS_STYLE = {
  full: "bg-emerald-500 text-white",
  minimum: "bg-blue-500 text-white",
  skipped: "bg-slate-400 text-white",
  paused: "border border-slate-400 bg-transparent text-slate-500 dark:text-slate-300",
} as const;

export default function RoutineWeekOverview({ userId, language }: { userId: string; language: AppALanguage }) {
  const state = useDailyRoutines(userId);
  const t = COPY[language];
  if (state.loading || state.routines.length === 0) return null;
  const locale = language === "sr" ? "sr-RS" : language === "tr" ? "tr-TR" : "en-US";
  return (
    <section className="mt-8" aria-labelledby="routine-week-heading">
      <div className="mb-3"><h2 id="routine-week-heading" className="text-[19px] font-semibold text-black dark:text-white">{t.title}</h2><p className="mt-1 text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.intro}</p></div>
      <div className="app-a-surface overflow-x-auto p-4 sm:p-5">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[minmax(150px,1fr)_repeat(7,36px)] gap-2 border-b border-black/[0.06] pb-3 dark:border-white/10">
            <span />
            {state.dates.map((date) => <time key={date} dateTime={date} className="text-center text-[11px] font-semibold uppercase text-[#6E6E73] dark:text-[#AEAEB2]">{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(`${date}T12:00:00`)).slice(0, 2)}</time>)}
          </div>
          <div className="divide-y divide-black/[0.06] dark:divide-white/10">
            {state.routines.map((routine) => <div key={routine.id} className="grid grid-cols-[minmax(150px,1fr)_repeat(7,36px)] items-center gap-2 py-3"><div className="flex min-w-0 items-center gap-2"><Leaf className="h-4 w-4 shrink-0 text-emerald-500" /><span className="truncate text-[14px] font-medium text-black dark:text-white">{routine.title}</span></div>{state.dates.map((date) => { const completion = state.completions.find((item) => item.routineId === routine.id && item.localDate === date); const label = completion ? t[completion.status] : t.empty; return <span key={date} role="img" aria-label={`${date}: ${label}`} title={label} className={`mx-auto h-7 w-7 rounded-full ${completion ? STATUS_STYLE[completion.status] : "border border-black/10 bg-transparent dark:border-white/15"}`} />; })}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

