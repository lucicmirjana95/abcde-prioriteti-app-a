import { useEffect, useState } from "react";
import { Clock3, Compass, X } from "lucide-react";
import type { AppALanguage } from "../../types";
import type { TodayCandidate } from "../../../shared/domain/today-candidates";
import { dismissTodayCandidate, loadPendingTodayCandidates } from "../../../shared/persistence/today-candidates";

const COPY = {
  en: { title: "From your Vision", intro: "Unscheduled candidates you explicitly sent here. They do not change your confirmed plan or available capacity.", dismiss: "Dismiss candidate", error: "Vision candidates could not be loaded." },
  sr: { title: "Iz vaše Vizije", intro: "Neraspoređeni kandidati koje ste izričito poslali ovde. Ne menjaju potvrđeni plan niti raspoloživi kapacitet.", dismiss: "Ukloni kandidata", error: "Kandidati iz Vizije nisu učitani." },
  tr: { title: "Vizyonunuzdan", intro: "Buraya açıkça gönderdiğiniz plansız adaylar. Onaylı planınızı veya kapasitenizi değiştirmezler.", dismiss: "Adayı kaldır", error: "Vizyon adayları yüklenemedi." },
} as const;

export default function TodayCandidatesSection({ userId, language }: { userId?: string | null; language: AppALanguage }) {
  const [items, setItems] = useState<TodayCandidate[]>([]);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const t = COPY[language];
  useEffect(() => {
    if (!userId) { setItems([]); return; }
    let active = true;
    setError(false);
    void loadPendingTodayCandidates(userId).then((value) => { if (active) setItems(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [userId]);
  if (!userId || (!error && items.length === 0)) return null;
  return <section className="mx-auto mt-7 w-full max-w-[760px] px-5 pb-2 sm:px-6" aria-labelledby="today-candidates-heading"><h2 id="today-candidates-heading" className="text-[19px] font-semibold">{t.title}</h2><p className="mt-1 text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.intro}</p>{error ? <p role="alert" className="app-a-panel-danger mt-3 text-[13px]">{t.error}</p> : null}<div className="mt-3 space-y-2">{items.map((item) => <article key={item.id} className="app-a-surface flex items-start gap-3 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#AF52DE]/10 text-[#AF52DE]"><Compass className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold">{item.title}</h3><p className="mt-1 flex items-center gap-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]"><Clock3 className="h-3.5 w-3.5" />{item.estimatedMinutes} min</p></div><button type="button" disabled={busyId === item.id} onClick={() => { if (!userId) return; setBusyId(item.id); void dismissTodayCandidate(userId, item).then(() => setItems((current) => current.filter((entry) => entry.id !== item.id))).catch(() => setError(true)).finally(() => setBusyId(null)); }} className="app-a-focus-ring rounded-full p-2" aria-label={t.dismiss}><X className="h-4 w-4" /></button></article>)}</div></section>;
}
