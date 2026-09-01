import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import type { DailyPlanItem } from "../../domain/daily-reset/contracts";
import type { AppALanguage } from "../../types";

const COPY = {
  en: { title: "Focused work session", intro: "Work only on this task until the timer ends. The task is not marked complete automatically.", start: "Start", pause: "Pause", resume: "Resume", reset: "Reset", close: "Close timer", done: "Session complete. Decide whether the task is actually finished." },
  sr: { title: "Fokusirana radna sesija", intro: "Radite samo na ovom zadatku dok tajmer ne istekne. Zadatak se ne označava automatski kao završen.", start: "Pokreni", pause: "Pauziraj", resume: "Nastavi", reset: "Ponovo", close: "Zatvori tajmer", done: "Sesija je završena. Procenite da li je zadatak zaista gotov." },
  tr: { title: "Odaklı çalışma oturumu", intro: "Süre bitene kadar yalnızca bu görev üzerinde çalışın. Görev otomatik tamamlanmaz.", start: "Başlat", pause: "Duraklat", resume: "Devam", reset: "Sıfırla", close: "Zamanlayıcıyı kapat", done: "Oturum tamamlandı. Görevin gerçekten bitip bitmediğine karar verin." },
} as const;

export default function FocusTimer({ item, language, defaultMinutes, onClose }: { item: DailyPlanItem; language: AppALanguage; defaultMinutes: 15 | 25 | 45 | 60; onClose: () => void }) {
  const suggested = Math.max(5, Math.min(90, item.estimatedMinutes));
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [remaining, setRemaining] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const t = COPY[language];
  useEffect(() => { if (!running || remaining <= 0) return; const timer = window.setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000); return () => window.clearTimeout(timer); }, [remaining, running]);
  useEffect(() => { if (remaining === 0) setRunning(false); }, [remaining]);
  const choose = (value: number) => { setMinutes(value); setRemaining(value * 60); setRunning(false); };
  const display = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="focus-timer-title"><div className="app-a-surface w-full max-w-md p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 id="focus-timer-title" className="text-[20px] font-semibold text-black dark:text-white">{t.title}</h2><p className="mt-1 text-[15px] font-medium text-black dark:text-white">{item.title}</p></div><button type="button" onClick={onClose} aria-label={t.close} className="app-a-focus-ring rounded-full p-2"><X className="h-5 w-5" /></button></div><p className="mt-3 text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.intro}</p><div className="mt-4 flex gap-2">{Array.from(new Set([defaultMinutes, 15, 25, suggested])).sort((a,b) => a-b).map((value) => <button key={value} type="button" onClick={() => choose(value)} className={`app-a-focus-ring min-h-10 flex-1 rounded-xl border text-[13px] font-semibold ${minutes === value ? "border-[#0071E3] bg-[#0071E3] text-white" : "border-black/10 dark:border-white/15"}`}>{value} min</button>)}</div><p className="mt-6 text-center text-[52px] font-semibold tabular-nums tracking-[-0.05em] text-black dark:text-white" role="timer" aria-live="polite">{display}</p>{remaining === 0 ? <p className="mt-2 text-center text-[14px] text-[#34C759]">{t.done}</p> : null}<div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => setRunning((value) => !value)} disabled={remaining === 0} className="app-a-primary-button app-a-focus-ring gap-2 px-5">{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? t.pause : remaining < minutes * 60 ? t.resume : t.start}</button><button type="button" onClick={() => { setRemaining(minutes * 60); setRunning(false); }} className="app-a-secondary-button app-a-focus-ring gap-2 px-4"><RotateCcw className="h-4 w-4" />{t.reset}</button></div></div></div>;
}
