import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, CalendarPlus, Check, Clock3, Ellipsis, FileText, Inbox, Loader2, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { useAppAAuth } from "../auth/useAppAAuth";
import PlanHistoryState from "../components/PlanHistoryState";
import type { AppAInboxItem, InboxItemStatus } from "../domain/inbox/contracts";
import { createManualInboxItemId, normalizeInboxTitle } from "../domain/inbox/contracts";
import { convertInboxNoteToTask, deleteInboxItem, importDailyPlanItemsToInbox, loadInboxItems, saveInboxItem, savePlanAndScheduleInboxItemAtomic, updateInboxItemStatus } from "../persistence/inboxRepository";
import { getLocalDateKeyInTimeZone } from "../persistence/dailyPlanDocument";
import { loadConfirmedDailyPlan, loadRecentDailyPlans } from "../persistence/dailyPlanRepository";
import { getEffectiveTimeZone } from "../settings/preferences";
import type { AppALanguage, AppAPreferences } from "../types";
import { addInboxItemToPlan } from "./inboxCandidatePlan";
import { addMissingInboxDuration } from '../persistence/inboxRepository';
import { useDataRefresh } from '../persistence/useDataRefresh';

type Filter = "all" | "notes" | "this_week" | "later" | "waiting" | "scheduled" | "completed" | "archived";
const COPY = {
  en: { eyebrow: "Not for today yet", title: "Inbox", intro: "Keep later tasks clear and decide what happens next.", add: "Add", placeholder: "What do you want to remember?", search: "Search Inbox", all: "Tasks", notes: "To clarify", filters: "Filter", active: "All active", more: "More actions", note: "Note — no action assumed", makeTask: "Turn into task", week: "This week", later: "Later", waiting: "Waiting", scheduled: "Scheduled", completed: "Completed", archived: "Archived", empty: "Nothing matches this view.", minutes: "min", duration: "How many minutes?", saveAndAdd: "Save and add", addToday: "Add to Today", schedule: "Schedule", wait: "Waiting", restore: "Move to Inbox", complete: "Complete", archive: "Archive", delete: "Delete", confirmDelete: "Delete permanently?", cancel: "Cancel", noPlan: "Create today's plan before adding this item.", durationNeeded: "Add an estimated duration first.", capacity: "This item does not fit in today's available time.", duplicate: "This item is already in today's plan.", error: "The action could not be completed. Try again.", signInError: "Sign-in was not completed. Your data has not changed.", retrySignIn: "Try sign-in again" },
  sr: { eyebrow: "Još nije za danas", title: "Inboks", intro: "Sačuvajte obaveze za kasnije i razjasnite beleške bez izmišljanja zadataka.", add: "Dodaj", placeholder: "Šta želite da zapamtite?", search: "Pretraži Inboks", all: "Zadaci", notes: "Za razjašnjenje", filters: "Filter", active: "Svi aktivni", more: "Više radnji", note: "Beleška — radnja nije pretpostavljena", makeTask: "Pretvori u zadatak", week: "Ove nedelje", later: "Kasnije", waiting: "Čekam", scheduled: "Zakazano", completed: "Završeno", archived: "Arhivirano", empty: "Nema stavki u ovom prikazu.", minutes: "min", duration: "Koliko minuta?", saveAndAdd: "Sačuvaj i dodaj", addToday: "Dodaj u Danas", schedule: "Zakaži", wait: "Čekam", restore: "Vrati u Inboks", complete: "Završi", archive: "Arhiviraj", delete: "Obriši", confirmDelete: "Trajno obrisati?", cancel: "Otkaži", noPlan: "Prvo napravite današnji plan.", durationNeeded: "Prvo dodajte procenjeno trajanje.", capacity: "Ova stavka ne staje u raspoloživo vreme za danas.", duplicate: "Ova stavka je već u današnjem planu.", error: "Radnja nije uspela. Pokušajte ponovo.", signInError: "Prijava nije završena. Vaši podaci nisu promenjeni.", retrySignIn: "Pokušaj prijavu ponovo" },
  tr: { eyebrow: "Henüz bugün için değil", title: "Gelen kutusu", intro: "Sonraki görevleri saklayın ve görev uydurmadan notları netleştirin.", add: "Ekle", placeholder: "Neyi hatırlamak istiyorsunuz?", search: "Gelen kutusunda ara", all: "Görevler", notes: "Netleştirilecek", filters: "Filtre", active: "Tüm etkinler", more: "Diğer işlemler", note: "Not — eylem varsayılmadı", makeTask: "Göreve dönüştür", week: "Bu hafta", later: "Daha sonra", waiting: "Bekliyor", scheduled: "Planlandı", completed: "Tamamlandı", archived: "Arşivlenmiş", empty: "Bu görünümde öğe yok.", minutes: "dk", duration: "Kaç dakika?", saveAndAdd: "Kaydet ve ekle", addToday: "Bugüne ekle", schedule: "Planla", wait: "Bekliyor", restore: "Gelen kutusuna taşı", complete: "Tamamla", archive: "Arşivle", delete: "Sil", confirmDelete: "Kalıcı olarak silinsin mi?", cancel: "İptal", noPlan: "Bu öğeyi eklemeden önce bugünün planını oluşturun.", durationNeeded: "Önce tahmini süre ekleyin.", capacity: "Bu öğe bugünkü kullanılabilir süreye sığmıyor.", duplicate: "Bu öğe zaten bugünün planında.", error: "İşlem tamamlanamadı. Tekrar deneyin.", signInError: "Giriş tamamlanmadı. Verileriniz değişmedi.", retrySignIn: "Girişi tekrar dene" },
} as const;

export default function InboxScreen({ language, preferences }: { language: AppALanguage; preferences: AppAPreferences }) {
  const refreshVersion = useDataRefresh();
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const t = COPY[language];
  const [items, setItems] = useState<AppAInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signInFailed, setSignInFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [durationForToday, setDurationForToday] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Record<string, string>>({});
  const [missingMinutes, setMissingMinutes] = useState<Record<string, string>>({});
  const migratedUsers = useRef(new Set<string>());
  const effectiveTimeZone = getEffectiveTimeZone(preferences);

  useEffect(() => {
    if (!authReady) return;
    if (!user) { setItems([]); setLoading(false); return; }
    let active = true; setLoading(true); setError(null);
    void (async () => {
      // Bounded, idempotent migration: make deferred items from plans created before
      // the Inbox feature available without scanning unbounded history.
      if (!migratedUsers.current.has(user.uid)) {
        migratedUsers.current.add(user.uid);
        try {
          const recentPlans = await loadRecentDailyPlans(user.uid, 30);
          for (const plan of recentPlans) await importDailyPlanItemsToInbox(user.uid, plan);
        } catch (migrationError) {
          migratedUsers.current.delete(user.uid);
          throw migrationError;
        }
      }
      return loadInboxItems(user.uid);
    })().then((next) => { if (active) setItems(next); }).catch(() => { if (active) setError(t.error); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authReady, t.error, user, refreshVersion]);

  const visible = useMemo(() => items.filter((item) => {
    const isTerminal = item.status === "archived" || item.status === "completed";
    const matches = filter === "all" ? !isTerminal && item.kind !== "note" : filter === "notes" ? item.kind === "note" && !isTerminal : item.kind !== "note" && ((filter === "this_week" && item.horizon === "this_week" && item.status === "inbox") || (filter === "later" && item.horizon === "later" && item.status === "inbox") || item.status === filter);
    const needle = normalizeInboxTitle(search);
    return matches && (!needle || normalizeInboxTitle(`${item.title} ${item.details || ""}`).includes(needle));
  }), [filter, items, search]);

  if (!authReady || loading) return <PlanHistoryState language={language} state="loading" />;
  const startSignIn = async () => {
    setSignInFailed(false);
    try { await signInWithGoogle(); }
    catch { setSignInFailed(true); }
  };
  if (!user) return signInFailed
    ? <PlanHistoryState language={language} state="error" errorText={t.signInError} retryLabel={t.retrySignIn} onSignIn={() => void startSignIn()} />
    : <PlanHistoryState language={language} state="sign_in" onSignIn={() => void startSignIn()} />;

  const run = async (id: string, action: () => Promise<void>) => {
    if (processing) return;
    setProcessing(id); setError(null);
    try { await action(); window.dispatchEvent(new Event('app-a-inbox-changed')); window.dispatchEvent(new Event('app-a-plan-changed')); } catch { setError(t.error); } finally { setProcessing(null); }
  };
  const addManual = async () => {
    const title = newTitle.trim(); if (!title || processing) return;
    const now = new Date().toISOString();
    const item: AppAInboxItem = { id: createManualInboxItemId(), title, kind: "task", horizon: "later", status: "inbox", source: "manual", language, createdAt: now, updatedAt: now };
    await run("new", async () => { await saveInboxItem(user.uid, item); setItems((all) => [item, ...all]); setNewTitle(""); });
  };
  const update = (item: AppAInboxItem, status: InboxItemStatus, extras: { scheduledLocalDate?: string; waitingOn?: string } = {}) => run(item.id, async () => {
    const next = await updateInboxItemStatus(user.uid, item, status, extras); setItems((all) => all.map((entry) => entry.id === item.id ? next : entry));
  });
  const scheduleToday = async (item: AppAInboxItem): Promise<AppAInboxItem | null> => {
    const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone); const document = await loadConfirmedDailyPlan(user.uid, localDate);
    if (!document) { setError(t.noPlan); return null; }
    const result = addInboxItemToPlan(document.plan, item);
    if ("error" in result) { setError(result.error === "duplicate" ? t.duplicate : result.error === "duration_required" ? t.durationNeeded : result.error.includes("capacity") ? t.capacity : t.error); return null; }
    const scheduled = await savePlanAndScheduleInboxItemAtomic(user.uid, { ...document, plan: result.draft }, item);
    return scheduled.item;
  };
  const addToday = (item: AppAInboxItem) => {
    if (!item.estimatedMinutes) { setDurationForToday(item.id); setOpenActions(null); return; }
    void run(item.id, async () => {
      const scheduled = await scheduleToday(item);
      if (scheduled) setItems((all) => all.map((entry) => entry.id === item.id ? scheduled : entry));
    });
  };
  const saveDurationAndAddToday = (item: AppAInboxItem) => run(item.id, async () => {
    const minutes = Number(missingMinutes[item.id]);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) { setError(t.durationNeeded); return; }
    const withDuration = await addMissingInboxDuration(user.uid, item.id, minutes);
    const scheduled = await scheduleToday(withDuration);
    setItems((all) => all.map((entry) => entry.id === item.id ? scheduled || withDuration : entry));
    if (scheduled) setDurationForToday(null);
  });
  const taskFilters: Array<[Exclude<Filter, "notes">, string]> = [["all", t.active], ["this_week", t.week], ["later", t.later], ["waiting", t.waiting], ["scheduled", t.scheduled], ["completed", t.completed], ["archived", t.archived]];

  return <div className="mx-auto w-full max-w-[760px] px-4 pb-10 sm:px-6">
    <header className="mb-5">
      <p className="app-a-eyebrow">{t.eyebrow}</p>
      <h1 className="app-a-page-title">{t.title}</h1>
      <p className="app-a-page-intro max-w-[580px]">{t.intro}</p>
    </header>

    <section className="app-a-surface mb-4 p-3" aria-label={t.add}>
      <div className="flex min-w-0 gap-2">
        <input className="app-a-field app-a-focus-ring min-w-0 flex-1 px-3 py-2.5" maxLength={500} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addManual(); }} placeholder={t.placeholder} />
        <button type="button" onClick={() => void addManual()} disabled={!newTitle.trim() || processing === "new"} className="app-a-primary-button app-a-focus-ring shrink-0 px-3.5"><Plus className="h-4 w-4" /><span className="hidden min-[360px]:inline">{t.add}</span></button>
      </div>
    </section>

    <div className="mb-4 grid gap-3">
      <div className="grid grid-cols-2 gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={filter !== "notes"} onClick={() => setFilter("all")} className={`app-a-focus-ring min-h-11 rounded-xl px-3 text-[14px] font-semibold ${filter !== "notes" ? "app-a-primary-button" : "app-a-secondary-button"}`}>{t.all}</button>
        <button type="button" role="tab" aria-selected={filter === "notes"} onClick={() => setFilter("notes")} className={`app-a-focus-ring min-h-11 rounded-xl px-3 text-[14px] font-semibold ${filter === "notes" ? "app-a-primary-button" : "app-a-secondary-button"}`}>{t.notes}</button>
      </div>
      <div className="grid min-w-0 gap-2 min-[520px]:grid-cols-[1fr_auto]">
        <label className="app-a-field flex min-w-0 items-center gap-2 px-3"><Search className="h-4 w-4 shrink-0" aria-hidden="true" /><input className="min-h-11 min-w-0 flex-1 bg-transparent outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} /></label>
        {filter !== "notes" ? <label className="app-a-field flex min-h-11 min-w-0 items-center gap-2 px-3 text-[13px] font-medium"><span className="shrink-0 text-[#86868B]">{t.filters}</span><select className="min-w-0 flex-1 bg-transparent font-semibold outline-none" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>{taskFilters.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label> : null}
      </div>
    </div>

    {error ? <div role="alert" className="mb-3 rounded-xl p-3 text-[13px]" style={{ background: "var(--app-a-danger-soft)", color: "var(--app-a-danger)" }}>{error}</div> : null}

    {visible.length === 0 ? <div className="app-a-surface flex min-h-[180px] flex-col items-center justify-center gap-3 p-7 text-center"><Inbox className="h-6 w-6" style={{ color: "var(--app-a-accent)" }} /><p style={{ color: "var(--app-a-text-secondary)" }}>{t.empty}</p></div> : <div className="space-y-2.5">{visible.map((item) => {
      const isNote = item.kind === "note";
      const canAddToday = !isNote && (item.status === "inbox" || item.status === "waiting");
      return <article key={item.id} className="app-a-surface min-w-0 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-[16px] font-semibold leading-snug">{item.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]" style={{ color: "var(--app-a-text-secondary)" }}>
              {isNote ? <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{t.note}</span> : <><span>{item.status === "waiting" ? t.waiting : item.status === "scheduled" ? `${t.scheduled}: ${item.scheduledLocalDate}` : item.status === "completed" ? t.completed : item.status === "archived" ? t.archived : item.horizon === "this_week" ? t.week : t.later}</span>{item.estimatedMinutes ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{item.estimatedMinutes} {t.minutes}</span> : null}</>}
            </div>
          </div>
          {processing === item.id ? <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin" /> : <button type="button" aria-label={t.more} aria-expanded={openActions === item.id} onClick={() => setOpenActions((open) => open === item.id ? null : item.id)} className="app-a-secondary-button app-a-focus-ring h-11 w-11 shrink-0 p-0"><Ellipsis className="h-5 w-5" /></button>}
        </div>

        {durationForToday === item.id ? <div className="mt-3 flex min-w-0 flex-wrap gap-2 rounded-xl bg-black/[0.025] p-2.5 dark:bg-white/[0.04]">
          <input autoFocus type="number" min="1" max="1440" inputMode="numeric" aria-label={t.duration} placeholder={t.duration} className="app-a-field app-a-focus-ring min-h-11 min-w-[120px] flex-1 px-3 text-[16px]" value={missingMinutes[item.id] || ""} onChange={(event) => setMissingMinutes((values) => ({ ...values, [item.id]: event.target.value }))} />
          <button type="button" disabled={Boolean(processing) || !missingMinutes[item.id]} onClick={() => void saveDurationAndAddToday(item)} className="app-a-primary-button app-a-focus-ring min-h-11 shrink-0 px-3 text-[13px]">{t.saveAndAdd}</button>
          <button type="button" onClick={() => setDurationForToday(null)} className="app-a-secondary-button app-a-focus-ring min-h-11 shrink-0 px-3 text-[13px]">{t.cancel}</button>
        </div> : null}

        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          {isNote ? <button type="button" onClick={() => void run(item.id, async () => { const next = await convertInboxNoteToTask(user.uid, item.id); setItems((all) => all.map((entry) => entry.id === item.id ? next : entry)); })} className="app-a-primary-button app-a-focus-ring min-h-11 px-3 text-[13px]">{t.makeTask}</button> : canAddToday ? <button type="button" onClick={() => addToday(item)} disabled={Boolean(processing)} className="app-a-primary-button app-a-focus-ring min-h-11 px-3 text-[13px]"><CalendarPlus className="h-4 w-4" />{t.addToday}</button> : null}
        </div>

        {openActions === item.id ? <div className="mt-3 grid min-w-0 gap-2 border-t pt-3 min-[430px]:grid-cols-2" style={{ borderColor: "var(--app-a-border)" }}>
          {!isNote && item.status === "inbox" ? <><div className="app-a-field flex min-h-11 min-w-0 items-center gap-2 px-2"><input type="date" min={getLocalDateKeyInTimeZone(effectiveTimeZone)} value={scheduleFor[item.id] || ""} onChange={(event) => setScheduleFor((all) => ({ ...all, [item.id]: event.target.value }))} className="min-w-0 flex-1 bg-transparent text-[13px]" aria-label={t.schedule} /><button type="button" className="shrink-0 text-[13px] font-semibold text-[#0071E3] dark:text-[#0A84FF]" disabled={!scheduleFor[item.id]} onClick={() => void update(item, "scheduled", { scheduledLocalDate: scheduleFor[item.id] })}>{t.schedule}</button></div><button type="button" onClick={() => void update(item, "waiting")} className="app-a-secondary-button app-a-focus-ring min-h-11 justify-start px-3 text-[13px]">{t.wait}</button></> : !isNote ? <button type="button" onClick={() => void update(item, "inbox")} className="app-a-secondary-button app-a-focus-ring min-h-11 justify-start px-3 text-[13px]"><Undo2 className="h-4 w-4" />{t.restore}</button> : null}
          {!isNote && item.status !== "completed" && item.status !== "archived" ? <><button type="button" onClick={() => void update(item, "completed")} className="app-a-secondary-button app-a-focus-ring min-h-11 justify-start px-3 text-[13px]"><Check className="h-4 w-4" />{t.complete}</button><button type="button" onClick={() => void update(item, "archived")} className="app-a-secondary-button app-a-focus-ring min-h-11 justify-start px-3 text-[13px]"><Archive className="h-4 w-4" />{t.archive}</button></> : null}
          {deleteConfirm === item.id ? <><button type="button" onClick={() => void run(item.id, async () => { await deleteInboxItem(user.uid, item.id); setItems((all) => all.filter((entry) => entry.id !== item.id)); setDeleteConfirm(null); })} className="app-a-focus-ring min-h-11 rounded-xl px-3 text-left text-[13px] font-semibold" style={{ color: "var(--app-a-danger)", background: "var(--app-a-danger-soft)" }}><Trash2 className="mr-1 inline h-4 w-4" />{t.confirmDelete}</button><button type="button" onClick={() => setDeleteConfirm(null)} className="app-a-secondary-button app-a-focus-ring min-h-11 justify-start px-3 text-[13px]">{t.cancel}</button></> : <button type="button" onClick={() => setDeleteConfirm(item.id)} className="app-a-focus-ring min-h-11 rounded-xl px-3 text-left text-[13px] font-semibold" style={{ color: "var(--app-a-danger)" }}><Trash2 className="mr-1 inline h-4 w-4" />{t.delete}</button>}
        </div> : null}
      </article>;
    })}</div>}
  </div>;
}
