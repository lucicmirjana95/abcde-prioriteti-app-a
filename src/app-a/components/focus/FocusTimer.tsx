import { useEffect, useState } from "react";
import { auth } from "../../../lib/firebase";
import { readSessionDraft, writeSessionDraft } from "../../persistence/sessionDraft";
import { useDialogFocus } from "../useDialogFocus";
import { secondsUntil } from "./focusClock";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import type { DailyPlanItem } from "../../domain/daily-reset/contracts";
import type { AppALanguage } from "../../types";

export function getInitialFocusMinutes(estimatedMinutes: number, defaultMinutes: number): number {
  const fallback = Number.isFinite(defaultMinutes) && defaultMinutes > 0 ? Math.round(defaultMinutes) : 25;
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) return fallback;
  return Math.max(1, Math.min(1440, Math.round(estimatedMinutes)));
}

const COPY = {
  en: { title: "Focused work session", intro: "Work only on this task until the timer ends. The task is not marked complete automatically.", start: "Start", pause: "Pause", resume: "Resume", reset: "Reset", close: "Close timer", done: "Session complete. Decide whether the task is actually finished." },
  sr: { title: "Fokusirana radna sesija", intro: "Radite samo na ovom zadatku dok tajmer ne istekne. Zadatak se ne označava automatski kao završen.", start: "Pokreni", pause: "Pauziraj", resume: "Nastavi", reset: "Ponovo", close: "Zatvori tajmer", done: "Sesija je završena. Procenite da li je zadatak zaista gotov." },
  tr: { title: "Odaklı çalışma oturumu", intro: "Süre bitene kadar yalnızca bu görev üzerinde çalışın. Görev otomatik tamamlanmaz.", start: "Başlat", pause: "Duraklat", resume: "Devam", reset: "Sıfırla", close: "Zamanlayıcıyı kapat", done: "Oturum tamamlandı. Görevin gerçekten bitip bitmediğine karar verin." },
} as const;

export default function FocusTimer({ item, language, defaultMinutes, onClose }: { item: DailyPlanItem; language: AppALanguage; defaultMinutes: 15 | 25 | 45 | 60; onClose: () => void }) {
  const sanitizeMinutes = (val: number): number => getInitialFocusMinutes(val, defaultMinutes);

  const safeDefault = sanitizeMinutes(defaultMinutes);
  const taskMinutes = getInitialFocusMinutes(item.estimatedMinutes, safeDefault);
  const sessionKey = `${auth.currentUser?.uid || 'guest'}:focus:${item.id}`;
  const [initial] = useState(() => readSessionDraft(sessionKey, { minutes: taskMinutes, remaining: taskMinutes * 60, endsAt: null as number | null }, (value) => {
    const entry = value as { minutes?: number; remaining?: number; endsAt?: number | null };
    return !!entry && Number.isFinite(entry.minutes) && Number.isFinite(entry.remaining) && (entry.endsAt === null || Number.isFinite(entry.endsAt));
  }));
  const [minutes, setMinutes] = useState(initial.minutes);
  const [remaining, setRemaining] = useState(initial.endsAt ? secondsUntil(initial.endsAt, Date.now()) : initial.remaining);
  const [endsAt, setEndsAt] = useState<number | null>(initial.endsAt);
  const running = endsAt !== null;
  const dialogRef = useDialogFocus(onClose);
  const t = COPY[language];
  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const seconds = secondsUntil(endsAt, Date.now());
      setRemaining(seconds);
      if (seconds === 0) setEndsAt(null);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    window.addEventListener('focus', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [endsAt]);
  useEffect(() => { writeSessionDraft(sessionKey, { minutes, remaining, endsAt }); }, [sessionKey, minutes, remaining, endsAt]);
  const toggle = () => {
    if (endsAt !== null) { setRemaining(secondsUntil(endsAt, Date.now())); setEndsAt(null); }
    else if (remaining > 0) setEndsAt(Date.now() + remaining * 1000);
  };
  const choose = (value: number) => {
    const valid = sanitizeMinutes(value);
    setMinutes(valid);
    setRemaining(valid * 60);
    setEndsAt(null);
  };
  const display = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  return <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="focus-timer-title"><div className="app-a-surface w-full max-w-md p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 id="focus-timer-title" className="text-[20px] font-semibold text-black dark:text-white">{t.title}</h2><p className="mt-1 text-[15px] font-medium text-black dark:text-white">{item.title}</p></div><button type="button" onClick={onClose} aria-label={t.close} className="app-a-focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-full p-2"><X className="h-5 w-5" /></button></div><p className="mt-3 text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.intro}</p><div className="mt-4 flex flex-wrap gap-2">{Array.from(new Set([taskMinutes, safeDefault, 15, 25])).sort((a,b) => a-b).map((value) => <button key={value} type="button" onClick={() => choose(value)} className={`app-a-focus-ring min-h-10 min-w-[72px] flex-1 rounded-xl border text-[13px] font-semibold ${minutes === value ? "border-[#0071E3] bg-[#0071E3] text-white" : "border-black/10 dark:border-white/15"}`}>{value} min</button>)}</div><p className="mt-6 text-center text-[52px] font-semibold tabular-nums tracking-[-0.05em] text-black dark:text-white" role="timer" aria-live="off">{display}</p>{remaining === 0 ? <p className="mt-2 text-center text-[14px] text-[#34C759]" role="status">{t.done}</p> : null}<div className="mt-5 flex justify-center gap-2"><button type="button" onClick={toggle} disabled={remaining === 0} className="app-a-primary-button app-a-focus-ring gap-2 px-5">{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? t.pause : remaining < minutes * 60 ? t.resume : t.start}</button><button type="button" onClick={() => { setRemaining(minutes * 60); setEndsAt(null); }} className="app-a-secondary-button app-a-focus-ring gap-2 px-4"><RotateCcw className="h-4 w-4" />{t.reset}</button></div></div></div>;
}
