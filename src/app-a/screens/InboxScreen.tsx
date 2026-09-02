import { useEffect, useMemo, useState } from "react";
import { Archive, CalendarPlus, Check, Clock3, Inbox, Loader2, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { useAppAAuth } from "../auth/useAppAAuth";
import PlanHistoryState from "../components/PlanHistoryState";
import type { AppAInboxItem, InboxItemStatus } from "../domain/inbox/contracts";
import { createManualInboxItemId, normalizeInboxTitle } from "../domain/inbox/contracts";
import { deleteInboxItem, loadInboxItems, saveInboxItem, savePlanAndCompleteInboxItemAtomic, updateInboxItemStatus } from "../persistence/inboxRepository";
import { getLocalDateKeyInTimeZone } from "../persistence/dailyPlanDocument";
import { loadConfirmedDailyPlan } from "../persistence/dailyPlanRepository";
import { getEffectiveTimeZone } from "../settings/preferences";
import type { AppALanguage, AppAPreferences } from "../types";
import { addInboxItemToPlan } from "./inboxCandidatePlan";

type Filter = "all" | "this_week" | "later" | "waiting" | "scheduled";
const COPY = {
  en: { eyebrow: "Not for today yet", title: "Inbox", intro: "Keep later tasks clear and decide what happens next.", add: "Add item", placeholder: "What do you want to remember?", search: "Search Inbox", all: "All", week: "This week", later: "Later", waiting: "Waiting", scheduled: "Scheduled", empty: "Nothing matches this view.", minutes: "min", duration: "Minutes", addToday: "Add to Today", schedule: "Schedule", wait: "Waiting", restore: "Move to Inbox", complete: "Complete", archive: "Archive", delete: "Delete", confirmDelete: "Delete permanently?", cancel: "Cancel", noPlan: "Create today's plan before adding this item.", durationNeeded: "Add an estimated duration first.", capacity: "This item does not fit in today's available time.", duplicate: "This item is already in today's plan.", error: "The action could not be completed. Try again." },
  sr: { eyebrow: "Još nije za danas", title: "Inboks", intro: "Sačuvajte obaveze za kasnije i odlučite koji je sledeći korak.", add: "Dodaj stavku", placeholder: "Šta želite da zapamtite?", search: "Pretraži Inboks", all: "Sve", week: "Ove nedelje", later: "Kasnije", waiting: "Čekam", scheduled: "Zakazano", empty: "Nema stavki u ovom prikazu.", minutes: "min", duration: "Minuta", addToday: "Dodaj u Danas", schedule: "Zakaži", wait: "Čekam", restore: "Vrati u Inboks", complete: "Završeno", archive: "Arhiviraj", delete: "Obriši", confirmDelete: "Trajno obrisati?", cancel: "Otkaži", noPlan: "Prvo napravite današnji plan.", durationNeeded: "Prvo dodajte procenjeno trajanje.", capacity: "Ova stavka ne staje u raspoloživo vreme za danas.", duplicate: "Ova stavka je već u današnjem planu.", error: "Radnja nije uspela. Pokušajte ponovo." },
  tr: { eyebrow: "Henüz bugün için değil", title: "Gelen kutusu", intro: "Daha sonraki işleri düzenleyin ve bir sonraki adımı seçin.", add: "Öğe ekle", placeholder: "Neyi hatırlamak istiyorsunuz?", search: "Gelen kutusunda ara", all: "Tümü", week: "Bu hafta", later: "Daha sonra", waiting: "Bekliyor", scheduled: "Planlandı", empty: "Bu görünümde öğe yok.", minutes: "dk", duration: "Dakika", addToday: "Bugüne ekle", schedule: "Planla", wait: "Bekliyor", restore: "Gelen kutusuna taşı", complete: "Tamamla", archive: "Arşivle", delete: "Sil", confirmDelete: "Kalıcı olarak silinsin mi?", cancel: "İptal", noPlan: "Bu öğeyi eklemeden önce bugünün planını oluşturun.", durationNeeded: "Önce tahmini süre ekleyin.", capacity: "Bu öğe bugünkü kullanılabilir süreye sığmıyor.", duplicate: "Bu öğe zaten bugünün planında.", error: "İşlem tamamlanamadı. Tekrar deneyin." },
} as const;

export default function InboxScreen({ language, preferences }: { language: AppALanguage; preferences: AppAPreferences }) {
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const t = COPY[language];
  const [items, setItems] = useState<AppAInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Record<string, string>>({});
  const effectiveTimeZone = getEffectiveTimeZone(preferences);

  useEffect(() => {
    if (!authReady) return;
    if (!user) { setItems([]); setLoading(false); return; }
    let active = true; setLoading(true); setError(null);
    void loadInboxItems(user.uid).then((next) => { if (active) setItems(next); }).catch(() => { if (active) setError(t.error); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authReady, t.error, user]);

  const visible = useMemo(() => items.filter((item) => {
    if (item.status === "archived" || item.status === "completed") return false;
    const matches = filter === "all" || (filter === "this_week" && item.horizon === "this_week" && item.status === "inbox") || (filter === "later" && item.horizon === "later" && item.status === "inbox") || item.status === filter;
    const needle = normalizeInboxTitle(search);
    return matches && (!needle || normalizeInboxTitle(`${item.title} ${item.details || ""}`).includes(needle));
  }), [filter, items, search]);

  if (!authReady || loading) return <PlanHistoryState language={language} state="loading" />;
  if (!user) return <PlanHistoryState language={language} state="sign_in" onSignIn={() => void signInWithGoogle()} />;

  const run = async (id: string, action: () => Promise<void>) => {
    if (processing) return;
    setProcessing(id); setError(null);
    try { await action(); } catch { setError(t.error); } finally { setProcessing(null); }
  };
  const addManual = async () => {
    const title = newTitle.trim(); if (!title || processing) return;
    const now = new Date().toISOString(); const minutes = Number(newMinutes);
    const item: AppAInboxItem = { id: createManualInboxItemId(), title, kind: "task", horizon: "later", status: "inbox", source: "manual", language, ...(Number.isInteger(minutes) && minutes > 0 && minutes <= 1440 ? { estimatedMinutes: minutes } : {}), createdAt: now, updatedAt: now };
    await run("new", async () => { await saveInboxItem(user.uid, item); setItems((all) => [item, ...all]); setNewTitle(""); setNewMinutes(""); });
  };
  const update = (item: AppAInboxItem, status: InboxItemStatus, extras: { scheduledLocalDate?: string; waitingOn?: string } = {}) => run(item.id, async () => {
    const next = await updateInboxItemStatus(user.uid, item, status, extras); setItems((all) => all.map((entry) => entry.id === item.id ? next : entry));
  });
  const addToday = (item: AppAInboxItem) => run(item.id, async () => {
    if (!item.estimatedMinutes) { setError(t.durationNeeded); return; }
    const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone); const document = await loadConfirmedDailyPlan(user.uid, localDate);
    if (!document) { setError(t.noPlan); return; }
    const result = addInboxItemToPlan(document.plan, item);
    if ("error" in result) { setError(result.error === "duplicate" ? t.duplicate : result.error === "duration_required" ? t.durationNeeded : result.error.includes("capacity") ? t.capacity : t.error); return; }
    const completed = await savePlanAndCompleteInboxItemAtomic(user.uid, { ...document, plan: result.draft }, item);
    setItems((all) => all.map((entry) => entry.id === item.id ? completed : entry));
  });
  const filters: Array<[Filter, string]> = [["all", t.all], ["this_week", t.week], ["later", t.later], ["waiting", t.waiting], ["scheduled", t.scheduled]];

  return <div className="mx-auto w-full max-w-[760px] px-5 pb-8 sm:px-6">
    <header className="mb-6"><p className="app-a-eyebrow">{t.eyebrow}</p><h1 className="app-a-page-title">{t.title}</h1><p className="app-a-page-intro">{t.intro}</p></header>
    <section className="app-a-surface mb-4 p-4 sm:p-5" aria-label={t.add}><div className="flex flex-col gap-2 sm:flex-row"><input className="app-a-field app-a-focus-ring min-w-0 flex-1 px-3 py-2.5" maxLength={500} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={t.placeholder} /><input className="app-a-field app-a-focus-ring w-full px-3 py-2.5 sm:w-28" type="number" min="1" max="1440" value={newMinutes} onChange={(event) => setNewMinutes(event.target.value)} placeholder={t.duration} /><button type="button" onClick={() => void addManual()} disabled={!newTitle.trim() || processing === "new"} className="app-a-primary-button app-a-focus-ring px-4"><Plus className="h-4 w-4" />{t.add}</button></div></section>
    <div className="mb-4 flex flex-col gap-3"><label className="app-a-field flex items-center gap-2 px-3"><Search className="h-4 w-4" aria-hidden="true" /><input className="min-h-11 min-w-0 flex-1 bg-transparent outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} /></label><div className="flex gap-2 overflow-x-auto pb-1" role="tablist">{filters.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={`app-a-focus-ring min-h-10 shrink-0 rounded-full px-4 text-[13px] font-semibold ${filter === id ? "app-a-primary-button" : "app-a-secondary-button"}`}>{label}</button>)}</div></div>
    {error ? <div role="alert" className="mb-3 rounded-xl p-3 text-[13px]" style={{ background: "var(--app-a-danger-soft)", color: "var(--app-a-danger)" }}>{error}</div> : null}
    {visible.length === 0 ? <div className="app-a-surface flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center"><Inbox className="h-6 w-6" style={{ color: "var(--app-a-accent)" }} /><p style={{ color: "var(--app-a-text-secondary)" }}>{t.empty}</p></div> : <div className="space-y-3">{visible.map((item) => <article key={item.id} className="app-a-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-[16px] font-semibold">{item.title}</h2><div className="mt-1 flex flex-wrap gap-2 text-[12px]" style={{ color: "var(--app-a-text-secondary)" }}>{item.estimatedMinutes ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{item.estimatedMinutes} {t.minutes}</span> : null}<span>{item.status === "waiting" ? t.waiting : item.status === "scheduled" ? `${t.scheduled}: ${item.scheduledLocalDate}` : item.horizon === "this_week" ? t.week : t.later}</span></div></div>{processing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}</div>
      <div className="mt-4 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: "var(--app-a-border)" }}><button type="button" onClick={() => void addToday(item)} disabled={!!processing} className="app-a-primary-button app-a-focus-ring px-3 text-[12px]"><CalendarPlus className="h-4 w-4" />{t.addToday}</button>
        {item.status === "inbox" ? <><div className="app-a-secondary-button flex min-h-11 items-center gap-1 px-2 text-[12px]"><input type="date" min={getLocalDateKeyInTimeZone(effectiveTimeZone)} value={scheduleFor[item.id] || ""} onChange={(event) => setScheduleFor((all) => ({ ...all, [item.id]: event.target.value }))} className="max-w-[125px] bg-transparent" aria-label={t.schedule} /><button type="button" disabled={!scheduleFor[item.id]} onClick={() => void update(item, "scheduled", { scheduledLocalDate: scheduleFor[item.id] })}>{t.schedule}</button></div><button type="button" onClick={() => void update(item, "waiting")} className="app-a-secondary-button app-a-focus-ring px-3 text-[12px]">{t.wait}</button></> : <button type="button" onClick={() => void update(item, "inbox")} className="app-a-secondary-button app-a-focus-ring px-3 text-[12px]"><Undo2 className="h-4 w-4" />{t.restore}</button>}
        <button type="button" onClick={() => void update(item, "completed")} className="app-a-secondary-button app-a-focus-ring px-3 text-[12px]"><Check className="h-4 w-4" />{t.complete}</button><button type="button" onClick={() => void update(item, "archived")} className="app-a-secondary-button app-a-focus-ring px-3 text-[12px]"><Archive className="h-4 w-4" />{t.archive}</button>
        {deleteConfirm === item.id ? <><button type="button" onClick={() => void run(item.id, async () => { await deleteInboxItem(user.uid, item.id); setItems((all) => all.filter((entry) => entry.id !== item.id)); setDeleteConfirm(null); })} className="app-a-focus-ring min-h-11 rounded-xl px-3 text-[12px]" style={{ color: "var(--app-a-danger)" }}><Trash2 className="inline h-4 w-4" /> {t.confirmDelete}</button><button type="button" onClick={() => setDeleteConfirm(null)} className="app-a-secondary-button app-a-focus-ring px-3 text-[12px]">{t.cancel}</button></> : <button type="button" onClick={() => setDeleteConfirm(item.id)} className="app-a-focus-ring min-h-11 rounded-xl px-3 text-[12px]" style={{ color: "var(--app-a-danger)" }}><Trash2 className="inline h-4 w-4" /> {t.delete}</button>}
      </div></article>)}</div>}
  </div>;
}
