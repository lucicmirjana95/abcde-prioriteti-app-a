import { useEffect, useState } from "react";
import { CalendarPlus, Clock3, Compass, X } from "lucide-react";
import type { AppALanguage } from "../../types";
import type { TodayCandidate } from "../../../shared/domain/today-candidates";
import { dismissTodayCandidate, loadPendingTodayCandidates } from "../../../shared/persistence/today-candidates";

const COPY = {
  en: { title: "Actions from Vision", intro: "Steps you explicitly sent here. Adding one checks the confirmed plan's remaining capacity.", add: "Add to today’s plan", dismiss: "Remove step", error: "Vision steps could not be loaded.", noPlan: "Create and save today’s plan before adding a Vision step.", duplicate: "This step is already in the plan.", capacity_unknown: "Today’s saved plan has no available time. Adjust the plan and set it before adding this step.", capacity_exceeded: "This step does not fit in the remaining required-plan capacity.", invalid_plan: "This step could not be added safely." },
  sr: { title: "Akcije iz Vizije", intro: "Koraci koje ste izričito poslali ovde. Dodavanje proverava preostali kapacitet potvrđenog plana.", add: "Dodaj u današnji plan", dismiss: "Ukloni korak", error: "Koraci iz Vizije nisu učitani.", noPlan: "Napravite i sačuvajte današnji plan pre dodavanja koraka iz Vizije.", duplicate: "Ovaj korak je već u planu.", capacity_unknown: "Sačuvani plan nema raspoloživo vreme. Prvo prilagodite plan i unesite vreme.", capacity_exceeded: "Ovaj korak ne staje u preostali kapacitet obaveznog plana.", invalid_plan: "Ovaj korak nije mogao bezbedno da se doda." },
  tr: { title: "Vizyondan eylemler", intro: "Buraya açıkça gönderdiğiniz adımlar. Ekleme, onaylı planın kalan kapasitesini kontrol eder.", add: "Bugünün planına ekle", dismiss: "Adımı kaldır", error: "Vizyon adımları yüklenemedi.", noPlan: "Bir Vizyon adımı eklemeden önce bugünün planını oluşturup kaydedin.", duplicate: "Bu adım zaten planda.", capacity_unknown: "Kayıtlı bugünkü planda kullanılabilir süre yok. Önce planı düzenleyip süreyi ayarlayın.", capacity_exceeded: "Bu adım zorunlu planın kalan kapasitesine sığmıyor.", invalid_plan: "Bu adım güvenli şekilde eklenemedi." },
} as const;

export default function TodayCandidatesSection({ userId, language, canAddToPlan, onAddToPlan }: { userId?: string | null; language: AppALanguage; canAddToPlan: boolean; onAddToPlan: (candidate: TodayCandidate) => Promise<string | null> }) {
  const [items, setItems] = useState<TodayCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const t = COPY[language];
  useEffect(() => {
    if (!userId) { setItems([]); return; }
    let active = true; setError(null);
    void loadPendingTodayCandidates(userId).then((value) => { if (active) setItems(value); }).catch(() => { if (active) setError("error"); });
    return () => { active = false; };
  }, [userId]);
  async function dismiss(item: TodayCandidate) {
    if (!userId) return;
    setBusyId(item.id); setError(null);
    try { await dismissTodayCandidate(userId, item); setItems((current) => current.filter((entry) => entry.id !== item.id)); }
    catch { setError("error"); }
    finally { setBusyId(null); }
  }
  async function add(item: TodayCandidate) {
    setBusyId(item.id); setError(null);
    try {
      const result = await onAddToPlan(item);
      if (result) { setError(result); return; }
      await dismiss(item);
    } finally { setBusyId(null); }
  }
  if (!userId || (!error && items.length === 0)) return null;
  const errorText = error ? (t[error as keyof typeof t] || t.error) : (!canAddToPlan && items.length ? t.noPlan : null);
  return <section className="mx-auto mt-7 w-full max-w-[760px] px-5 pb-2 sm:px-6" aria-labelledby="today-candidates-heading"><h2 id="today-candidates-heading" className="text-[19px] font-semibold">{t.title}</h2><p className="mt-1 text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.intro}</p>{errorText ? <p role="alert" className="app-a-panel-danger mt-3 text-[13px]">{errorText}</p> : null}<div className="mt-3 space-y-2">{items.map((item) => <article key={item.id} className="app-a-surface flex items-start gap-3 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#AF52DE]/10 text-[#AF52DE]"><Compass className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold">{item.title}</h3><p className="mt-1 flex items-center gap-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]"><Clock3 className="h-3.5 w-3.5" />{item.estimatedMinutes} min</p><button type="button" disabled={!canAddToPlan || busyId === item.id} onClick={() => void add(item)} className="app-a-primary-button app-a-focus-ring mt-3 gap-2 px-3 text-[13px]"><CalendarPlus className="h-4 w-4" />{t.add}</button></div><button type="button" disabled={busyId === item.id} onClick={() => void dismiss(item)} className="app-a-focus-ring rounded-full p-2" aria-label={t.dismiss}><X className="h-4 w-4" /></button></article>)}</div></section>;
}
