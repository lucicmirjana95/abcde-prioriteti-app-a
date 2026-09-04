import { useEffect, useState } from "react";
import { ArrowUp, CalendarPlus, Clock3, Compass, X } from "lucide-react";
import type { AppALanguage } from "../../types";
import type { TodayCandidate } from "../../../shared/domain/today-candidates";
import { dismissTodayCandidate, loadPendingTodayCandidates } from "../../../shared/persistence/today-candidates";

export type TodayPlanState = "none" | "draft" | "confirmed";

const COPY = {
  en: { title: "Actions from Vision", intro: "Next steps you chose in Vision. They stay here until you add or remove them.", add: "Add to today’s plan", createPlan: "Create today’s plan", reviewPlan: "Review and save today’s plan", noPlan: "Create today’s plan to add this step.", draftPlan: "Review and save today’s plan before adding another step.", dismiss: "Remove step", error: "Vision steps could not be loaded. Try again later.", duplicate: "This step is already in the plan.", capacity_unknown: "Set your available time before adding this step.", capacity_exceeded: "Today’s plan is full. Keep this step here for later or adjust the plan.", invalid_plan: "This step could not be added. Try again." },
  sr: { title: "Akcije iz Vizije", intro: "Sledeći koraci koje ste izabrali u Viziji. Ostaju ovde dok ih ne dodate ili uklonite.", add: "Dodaj u današnji plan", createPlan: "Napravi današnji plan", reviewPlan: "Pregledaj i sačuvaj današnji plan", noPlan: "Napravite današnji plan da biste dodali ovaj korak.", draftPlan: "Pregledajte i sačuvajte današnji plan pre dodavanja novog koraka.", dismiss: "Ukloni korak", error: "Koraci iz Vizije nisu učitani. Pokušajte ponovo kasnije.", duplicate: "Ovaj korak je već u planu.", capacity_unknown: "Unesite raspoloživo vreme pre dodavanja ovog koraka.", capacity_exceeded: "Današnji plan je popunjen. Sačuvajte ovaj korak za kasnije ili prilagodite plan.", invalid_plan: "Ovaj korak nije dodat. Pokušajte ponovo." },
  tr: { title: "Vizyondan eylemler", intro: "Vizyon bölümünde seçtiğiniz sonraki adımlar. Ekleyene veya kaldırana kadar burada kalırlar.", add: "Bugünün planına ekle", createPlan: "Bugünün planını oluştur", reviewPlan: "Bugünün planını gözden geçir ve kaydet", noPlan: "Bu adımı eklemek için bugünün planını oluşturun.", draftPlan: "Yeni bir adım eklemeden önce bugünün planını gözden geçirip kaydedin.", dismiss: "Adımı kaldır", error: "Vizyon adımları yüklenemedi. Daha sonra tekrar deneyin.", duplicate: "Bu adım zaten planda.", capacity_unknown: "Bu adımı eklemeden önce kullanılabilir sürenizi belirleyin.", capacity_exceeded: "Bugünün planı dolu. Bu adımı daha sonrası için burada tutun veya planı düzenleyin.", invalid_plan: "Bu adım eklenemedi. Tekrar deneyin." },
} as const;

interface Props {
  userId?: string | null;
  language: AppALanguage;
  planState: TodayPlanState;
  onPlanAction: () => void;
  onAddToPlan: (candidate: TodayCandidate) => Promise<string | null>;
}

export default function TodayCandidatesSection({ userId, language, planState, onPlanAction, onAddToPlan }: Props) {
  const [items, setItems] = useState<TodayCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const t = COPY[language];

  useEffect(() => {
    if (!userId) { setItems([]); return; }
    let active = true;
    setError(null);
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
  const errorText = error ? (t[error as keyof typeof t] || t.error) : null;
  const guidance = planState === "none" ? t.noPlan : planState === "draft" ? t.draftPlan : null;
  const planAction = planState === "none" ? t.createPlan : t.reviewPlan;

  return <section className="mx-auto mt-7 w-full max-w-[760px] px-5 pb-2 sm:px-6" aria-labelledby="today-vision-heading">
    <h2 id="today-vision-heading" className="text-[19px] font-semibold">{t.title}</h2>
    <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{t.intro}</p>
    {errorText ? <p role="alert" className="app-a-panel-danger mt-3 text-[13px]">{errorText}</p> : null}
    {guidance ? <div className="mt-3 rounded-[14px] border p-3.5" style={{ backgroundColor: "var(--app-a-surface-secondary)", borderColor: "var(--app-a-border)" }}><p className="text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>{guidance}</p><button type="button" onClick={onPlanAction} className="app-a-secondary-button app-a-focus-ring mt-3 gap-2 px-4 text-[14px]"><ArrowUp className="h-4 w-4" aria-hidden="true" />{planAction}</button></div> : null}
    <div className="mt-3 space-y-2">{items.map((item) => <article key={item.id} className="app-a-surface flex items-start gap-3 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#AF52DE]/10 text-[#AF52DE]"><Compass className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold">{item.title}</h3><p className="mt-1 flex items-center gap-1 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{item.estimatedMinutes} min</p>{planState === "confirmed" ? <button type="button" disabled={busyId === item.id} onClick={() => void add(item)} className="app-a-primary-button app-a-focus-ring mt-3 gap-2 px-3 text-[13px]"><CalendarPlus className="h-4 w-4" aria-hidden="true" />{t.add}</button> : null}</div><button type="button" disabled={busyId === item.id} onClick={() => void dismiss(item)} className="app-a-focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full" aria-label={t.dismiss}><X className="h-4 w-4" aria-hidden="true" /></button></article>)}</div>
  </section>;
}
