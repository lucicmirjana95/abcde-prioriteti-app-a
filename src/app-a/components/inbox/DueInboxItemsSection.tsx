import { useEffect, useState } from "react";
import { CalendarCheck2, CalendarPlus, Clock3, Loader2 } from "lucide-react";
import type { AppAInboxItem } from "../../domain/inbox/contracts";
import { loadDueScheduledInboxItems } from "../../persistence/inboxRepository";
import type { AppALanguage } from "../../types";

const COPY = {
  en: { title: "Scheduled for today", intro: "Inbox items whose scheduled date has arrived.", add: "Add to plan", error: "Scheduled Inbox items could not be loaded.", noPlan: "Create today's plan before adding this item.", duration_required: "Add an estimated duration in Inbox first.", duplicate: "This item is already in today's plan.", capacity_unknown: "Set today's available time first.", capacity_exceeded: "This item does not fit in today's remaining time.", invalid_plan: "This item could not be added safely." },
  sr: { title: "Zakazano za danas", intro: "Stavke iz Inboksa čiji je zakazani datum stigao.", add: "Dodaj u plan", error: "Zakazane stavke iz Inboksa nisu učitane.", noPlan: "Prvo napravite današnji plan.", duration_required: "Prvo unesite procenjeno trajanje u Inboksu.", duplicate: "Ova stavka je već u današnjem planu.", capacity_unknown: "Prvo postavite raspoloživo vreme za danas.", capacity_exceeded: "Ova stavka ne staje u preostalo vreme.", invalid_plan: "Stavka nije mogla bezbedno da se doda." },
  tr: { title: "Bugün için planlananlar", intro: "Planlanan tarihi gelen Gelen Kutusu öğeleri.", add: "Plana ekle", error: "Planlanan Gelen Kutusu öğeleri yüklenemedi.", noPlan: "Bu öğeyi eklemeden önce bugünün planını oluşturun.", duration_required: "Önce Gelen Kutusunda tahmini süre ekleyin.", duplicate: "Bu öğe zaten bugünün planında.", capacity_unknown: "Önce bugünkü kullanılabilir süreyi ayarlayın.", capacity_exceeded: "Bu öğe bugünkü kalan süreye sığmıyor.", invalid_plan: "Bu öğe güvenli biçimde eklenemedi." },
} as const;

export default function DueInboxItemsSection({ userId, localDate, language, canAddToPlan, onAddToPlan }: { userId?: string | null; localDate: string; language: AppALanguage; canAddToPlan: boolean; onAddToPlan: (item: AppAInboxItem) => Promise<string | null> }) {
  const [items, setItems] = useState<AppAInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = COPY[language];

  useEffect(() => {
    if (!userId) { setItems([]); return; }
    let active = true;
    setLoading(true);
    setError(null);
    void loadDueScheduledInboxItems(userId, localDate)
      .then((next) => { if (active) setItems(next); })
      .catch(() => { if (active) setError("error"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [localDate, userId]);

  async function add(item: AppAInboxItem) {
    setBusyId(item.id);
    setError(null);
    try {
      const result = await onAddToPlan(item);
      if (result) { setError(result); return; }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } finally {
      setBusyId(null);
    }
  }

  if (!userId || (!loading && !error && items.length === 0)) return null;
  const errorText = error ? (t[error as keyof typeof t] || t.error) : null;
  return <section className="mx-auto mt-7 w-full max-w-[760px] px-5 pb-2 sm:px-6" aria-labelledby="due-inbox-heading"><h2 id="due-inbox-heading" className="flex items-center gap-2 text-[19px] font-semibold"><CalendarCheck2 className="h-5 w-5" style={{ color: "var(--app-a-accent)" }} />{t.title}</h2><p className="mt-1 text-[14px]" style={{ color: "var(--app-a-text-secondary)" }}>{t.intro}</p>{loading ? <p role="status" className="mt-3 flex items-center gap-2 text-[13px]"><Loader2 className="h-4 w-4 animate-spin" />{t.title}</p> : null}{errorText ? <p role="alert" className="app-a-panel-danger mt-3 text-[13px]">{errorText}</p> : null}<div className="mt-3 space-y-2">{items.map((item) => <article key={item.id} className="app-a-surface flex items-start gap-3 p-4"><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold">{item.title}</h3>{item.estimatedMinutes ? <p className="mt-1 flex items-center gap-1 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}><Clock3 className="h-3.5 w-3.5" />{item.estimatedMinutes} min</p> : null}<button type="button" disabled={!canAddToPlan || busyId === item.id} onClick={() => void add(item)} className="app-a-primary-button app-a-focus-ring mt-3 gap-2 px-3 text-[13px]"><CalendarPlus className="h-4 w-4" />{t.add}</button></div></article>)}</div></section>;
}
