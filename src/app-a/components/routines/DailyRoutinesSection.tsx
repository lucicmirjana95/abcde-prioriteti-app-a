import { Check, ChevronDown, Leaf, Minus, SkipForward } from "lucide-react";
import type { AppALanguage } from "../../types";
import { useDailyRoutines } from "../../routines/useDailyRoutines";
import { getLocalDateInTimeZone } from "../../routines/date";

const COPY = {
  en: { title: "Daily routines", intro: "Small actions that repeat each day, separate from your priority tasks.", full: "Full", minimum: "Minimum", skipped: "Skip today", clear: "Clear", error: "Routine status could not be saved." },
  sr: { title: "Dnevne rutine", intro: "Male radnje koje se ponavljaju svakog dana, odvojeno od prioritetnih zadataka.", full: "Puna verzija", minimum: "Minimalna", skipped: "Preskoči danas", clear: "Obriši unos", error: "Status rutine nije sačuvan." },
  tr: { title: "Günlük rutinler", intro: "Öncelikli görevlerden ayrı, her gün tekrarlanan küçük eylemler.", full: "Tam", minimum: "Minimum", skipped: "Bugün atla", clear: "Kaydı temizle", error: "Rutin durumu kaydedilemedi." },
} as const;

export default function DailyRoutinesSection({ userId, language }: { userId?: string | null; language: AppALanguage }) {
  const state = useDailyRoutines(userId);
  const t = COPY[language];
  if (!userId || state.loading || state.todayRoutines.length === 0) return null;

  return (
    <section className="mx-auto mt-7 w-full max-w-[760px] px-5 pb-2 sm:px-6" aria-labelledby="daily-routines-heading">
      <div className="mb-3">
        <h2 id="daily-routines-heading" className="text-[19px] font-semibold tracking-[-0.015em] text-black dark:text-white">{t.title}</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.intro}</p>
      </div>
      {state.error && <p role="alert" className="app-a-panel-danger mb-3 text-[13px]">{t.error}</p>}
      <div className="app-a-surface divide-y divide-black/[0.06] overflow-hidden dark:divide-white/10">
        {state.todayRoutines.map((routine) => {
          const routineLocalDate = getLocalDateInTimeZone(new Date(), routine.timeZone);
          const completion = state.completions.find((item) => item.routineId === routine.id && item.localDate === routineLocalDate);
          const busy = state.updatingRoutineId === routine.id;
          return (
            <article key={routine.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Leaf className="h-5 w-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><h3 className="text-[16px] font-semibold text-black dark:text-white">{routine.title}</h3><p className="mt-1 text-[14px] text-[#6E6E73] dark:text-[#AEAEB2]">{completion?.status === "minimum" ? routine.minimumAction : routine.fullAction}</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
                <button type="button" disabled={busy} onClick={() => void state.record(routine.id, "full")} className={`app-a-focus-ring min-h-11 rounded-xl border px-3 text-[13px] font-semibold ${completion?.status === "full" ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/10 bg-transparent text-black dark:border-white/15 dark:text-white"}`}><Check className="mr-1 inline h-4 w-4" />{t.full}</button>
                <button type="button" disabled={busy} onClick={() => void state.record(routine.id, "minimum")} className={`app-a-focus-ring min-h-11 rounded-xl border px-3 text-[13px] font-semibold ${completion?.status === "minimum" ? "border-blue-500 bg-blue-500 text-white" : "border-black/10 bg-transparent text-black dark:border-white/15 dark:text-white"}`}><Minus className="mr-1 inline h-4 w-4" />{t.minimum}</button>
                <button type="button" disabled={busy} onClick={() => void state.record(routine.id, "skipped")} className={`app-a-focus-ring min-h-11 rounded-xl border px-3 text-[13px] font-semibold ${completion?.status === "skipped" ? "border-slate-500 bg-slate-500 text-white" : "border-black/10 bg-transparent text-black dark:border-white/15 dark:text-white"}`}><SkipForward className="mr-1 inline h-4 w-4" />{t.skipped}</button>
                {completion && <button type="button" disabled={busy} onClick={() => void state.record(routine.id, "not_recorded")} className="app-a-focus-ring min-h-11 rounded-xl px-3 text-[13px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]"><ChevronDown className="mr-1 inline h-4 w-4" />{t.clear}</button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
