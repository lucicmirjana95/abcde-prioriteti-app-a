import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Filter,
  Inbox,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useAppAAuth } from "../auth/useAppAAuth";
import PlanHistoryState from "../components/PlanHistoryState";
import type { AppAInboxItem, InboxItemStatus } from "../domain/inbox/contracts";
import { createManualInboxItemId, normalizeInboxTitle } from "../domain/inbox/contracts";
import {
  addMissingInboxDuration,
  convertInboxNoteToTask,
  deleteInboxItem,
  importDailyPlanItemsToInbox,
  loadInboxItems,
  saveInboxItem,
  savePlanAndScheduleInboxItemAtomic,
  updateInboxItemStatus,
} from "../persistence/inboxRepository";
import { getLocalDateKeyInTimeZone } from "../persistence/dailyPlanDocument";
import { loadConfirmedDailyPlan, loadRecentDailyPlans } from "../persistence/dailyPlanRepository";
import { getEffectiveTimeZone } from "../settings/preferences";
import type { AppALanguage, AppAPreferences } from "../types";
import { addInboxItemToPlan } from "./inboxCandidatePlan";
import { useDataRefresh } from "../persistence/useDataRefresh";

type Filter = "all" | "notes" | "this_week" | "later" | "waiting" | "scheduled" | "completed" | "archived";

const COPY = {
  en: {
    eyebrow: "Not for today yet",
    title: "Inbox",
    intro: "Keep later tasks clear and clarify notes without guessing actions.",
    add: "Add",
    placeholder: "What do you want to remember?",
    search: "Search Inbox",
    clearSearch: "Clear search",
    all: "Tasks",
    notes: "To clarify",
    filters: "Filters",
    allActive: "All active",
    allFilterLabel: "Show all tasks",
    filterBy: "Filter by status",
    clearFilter: "Clear filter",
    note: "Note — no action assumed",
    makeTask: "Turn into task",
    week: "This week",
    later: "Later",
    waiting: "Waiting",
    scheduled: "Scheduled",
    completed: "Completed",
    archived: "Archived",
    empty: "Nothing matches this view.",
    minutes: "min",
    duration: "Minutes",
    addToday: "Add to Today",
    schedule: "Schedule",
    scheduleDate: "Pick date",
    schedulePrompt: "Choose a date to schedule",
    wait: "Waiting",
    restore: "Move to Inbox",
    complete: "Complete",
    archive: "Archive",
    delete: "Delete",
    confirmDelete: "Delete permanently?",
    cancel: "Cancel",
    noPlan: "Create today's plan before adding this item.",
    durationNeeded: "Add an estimated duration first.",
    capacity: "This item does not fit in today's available time.",
    duplicate: "This item is already in today's plan.",
    error: "The action could not be completed. Try again.",
    signInError: "Sign-in was not completed. Your data has not changed.",
    retrySignIn: "Try sign-in again",
    moreActions: "More actions",
    addDurationPrompt: "How long will this task take?",
    saveAndAdd: "Add to Today",
    saveDuration: "Save duration",
  },
  sr: {
    eyebrow: "Još nije za danas",
    title: "Inboks",
    intro: "Sačuvajte obaveze za kasnije i razjasnite beleške bez izmišljanja zadataka.",
    add: "Dodaj",
    placeholder: "Šta želite da zapamtite?",
    search: "Pretraži Inboks",
    clearSearch: "Obriši pretragu",
    all: "Zadaci",
    notes: "Za razjašnjenje",
    filters: "Filteri",
    allActive: "Svi aktivni",
    allFilterLabel: "Prikaži sve zadatke",
    filterBy: "Filtriraj po statusu",
    clearFilter: "Poništi filter",
    note: "Beleška — radnja nije pretpostavljena",
    makeTask: "Pretvori u zadatak",
    week: "Ove nedelje",
    later: "Kasnije",
    waiting: "Čekam",
    scheduled: "Zakazano",
    completed: "Završeno",
    archived: "Arhivirano",
    empty: "Nema stavki u ovom prikazu.",
    minutes: "min",
    duration: "Minuta",
    addToday: "Dodaj u Danas",
    schedule: "Zakaži",
    scheduleDate: "Izaberi datum",
    schedulePrompt: "Izaberite datum za zakazivanje",
    wait: "Čekam",
    restore: "Vrati u Inboks",
    complete: "Završi",
    archive: "Arhiviraj",
    delete: "Obriši",
    confirmDelete: "Trajno obrisati?",
    cancel: "Otkaži",
    noPlan: "Prvo napravite današnji plan.",
    durationNeeded: "Prvo dodajte procenjeno trajanje.",
    capacity: "Ova stavka ne staje u raspoloživo vreme za danas.",
    duplicate: "Ova stavka je već u današnjem planu.",
    error: "Radnja nije uspela. Pokušajte ponovo.",
    signInError: "Prijava nije završena. Vaši podaci nisu promenjeni.",
    retrySignIn: "Pokušaj prijavu ponovo",
    moreActions: "Više akcija",
    addDurationPrompt: "Koliko minuta će trajati ovaj zadatak?",
    saveAndAdd: "Dodaj u Danas",
    saveDuration: "Sačuvaj trajanje",
  },
  tr: {
    eyebrow: "Henüz bugün için değil",
    title: "Gelen kutusu",
    intro: "Sonraki görevleri saklayın ve görev uydurmadan notları netleştirin.",
    add: "Ekle",
    placeholder: "Neyi hatırlamak istiyorsunuz?",
    search: "Gelen kutusunda ara",
    clearSearch: "Aramayı temizle",
    all: "Görevler",
    notes: "Netleştirilecek",
    filters: "Filtreler",
    allActive: "Tüm aktifler",
    allFilterLabel: "Tüm görevleri göster",
    filterBy: "Duruma göre filtrele",
    clearFilter: "Filtreyi temizle",
    note: "Not — eylem varsayılmadı",
    makeTask: "Göreve dönüştür",
    week: "Bu hafta",
    later: "Daha sonra",
    waiting: "Bekliyor",
    scheduled: "Planlandı",
    completed: "Tamamlandı",
    archived: "Arşivlenmiş",
    empty: "Bu görünümde öğe yok.",
    minutes: "dk",
    duration: "Dakika",
    addToday: "Bugüne ekle",
    schedule: "Planla",
    scheduleDate: "Tarih seç",
    schedulePrompt: "Planlamak için bir tarih seçin",
    wait: "Bekliyor",
    restore: "Gelen kutusuna taşı",
    complete: "Tamamla",
    archive: "Arşivle",
    delete: "Sil",
    confirmDelete: "Kalıcı olarak silinsin mi?",
    cancel: "İptal",
    noPlan: "Bu öğeyi eklemeden önce bugünün planını oluşturun.",
    durationNeeded: "Önce tahmini süre ekleyin.",
    capacity: "Bu öğe bugünkü kullanılabilir süreye sığmıyor.",
    duplicate: "Bu öğe zaten bugünün planında.",
    error: "İşlem tamamlanamadı. Tekrar deneyin.",
    signInError: "Giriş tamamlanmadı. Verileriniz değişmedi.",
    retrySignIn: "Girişi tekrar dene",
    moreActions: "Diğer işlemler",
    addDurationPrompt: "Bu görev ne kadar sürecek?",
    saveAndAdd: "Bugüne ekle",
    saveDuration: "Süreyi kaydet",
  },
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
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeDurationItem, setActiveDurationItem] = useState<string | null>(null);
  const [activeScheduleItem, setActiveScheduleItem] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Record<string, string>>({});
  const [missingMinutes, setMissingMinutes] = useState<Record<string, string>>({});

  const filterMenuRef = useRef<HTMLDivElement>(null);
  const migratedUsers = useRef(new Set<string>());
  const effectiveTimeZone = getEffectiveTimeZone(preferences);

  useEffect(() => {
    if (!showFilterMenu) return;
    const onMouseDown = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showFilterMenu]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
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
    })()
      .then((next) => {
        if (active) setItems(next);
      })
      .catch(() => {
        if (active) setError(t.error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authReady, t.error, user, refreshVersion]);

  const counts = useMemo(() => {
    let tasks = 0;
    let notes = 0;
    let thisWeek = 0;
    let later = 0;
    let waiting = 0;
    let scheduled = 0;
    let completed = 0;
    let archived = 0;

    for (const item of items) {
      const isTerminal = item.status === "archived" || item.status === "completed";
      if (item.kind === "note") {
        if (!isTerminal) notes++;
      } else {
        if (!isTerminal) tasks++;
        if (item.status === "inbox") {
          if (item.horizon === "this_week") thisWeek++;
          else if (item.horizon === "later") later++;
        } else if (item.status === "waiting") {
          waiting++;
        } else if (item.status === "scheduled") {
          scheduled++;
        } else if (item.status === "completed") {
          completed++;
        } else if (item.status === "archived") {
          archived++;
        }
      }
    }

    return { tasks, notes, thisWeek, later, waiting, scheduled, completed, archived };
  }, [items]);

  const visible = useMemo(() => {
    return items.filter((item) => {
      const isTerminal = item.status === "archived" || item.status === "completed";
      const matches =
        filter === "all"
          ? !isTerminal && item.kind !== "note"
          : filter === "notes"
          ? item.kind === "note" && !isTerminal
          : item.kind !== "note" &&
            ((filter === "this_week" && item.horizon === "this_week" && item.status === "inbox") ||
              (filter === "later" && item.horizon === "later" && item.status === "inbox") ||
              item.status === filter);
      const needle = normalizeInboxTitle(search);
      return matches && (!needle || normalizeInboxTitle(`${item.title} ${item.details || ""}`).includes(needle));
    });
  }, [filter, items, search]);

  if (!authReady || loading) return <PlanHistoryState language={language} state="loading" />;

  const startSignIn = async () => {
    setSignInFailed(false);
    try {
      await signInWithGoogle();
    } catch {
      setSignInFailed(true);
    }
  };

  if (!user) {
    return signInFailed ? (
      <PlanHistoryState
        language={language}
        state="error"
        errorText={t.signInError}
        retryLabel={t.retrySignIn}
        onSignIn={() => void startSignIn()}
      />
    ) : (
      <PlanHistoryState language={language} state="sign_in" onSignIn={() => void startSignIn()} />
    );
  }

  const run = async (id: string, action: () => Promise<void>) => {
    if (processing) return;
    setProcessing(id);
    setError(null);
    try {
      await action();
      window.dispatchEvent(new Event("app-a-inbox-changed"));
      window.dispatchEvent(new Event("app-a-plan-changed"));
    } catch {
      setError(t.error);
    } finally {
      setProcessing(null);
    }
  };

  const addManual = async () => {
    const title = newTitle.trim();
    if (!title || processing) return;
    const now = new Date().toISOString();
    const item: AppAInboxItem = {
      id: createManualInboxItemId(),
      title,
      kind: "task",
      horizon: "later",
      status: "inbox",
      source: "manual",
      language,
      createdAt: now,
      updatedAt: now,
    };
    await run("new", async () => {
      await saveInboxItem(user.uid, item);
      setItems((all) => [item, ...all]);
      setNewTitle("");
    });
  };

  const update = (item: AppAInboxItem, status: InboxItemStatus, extras: { scheduledLocalDate?: string; waitingOn?: string } = {}) =>
    run(item.id, async () => {
      const next = await updateInboxItemStatus(user.uid, item, status, extras);
      setItems((all) => all.map((entry) => (entry.id === item.id ? next : entry)));
    });

  const addToday = (item: AppAInboxItem) =>
    run(item.id, async () => {
      if (!item.estimatedMinutes) {
        setError(t.durationNeeded);
        return;
      }
      const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone);
      const document = await loadConfirmedDailyPlan(user.uid, localDate);
      if (!document) {
        setError(t.noPlan);
        return;
      }
      const result = addInboxItemToPlan(document.plan, item);
      if ("error" in result) {
        setError(
          result.error === "duplicate"
            ? t.duplicate
            : result.error === "duration_required"
            ? t.durationNeeded
            : result.error.includes("capacity")
            ? t.capacity
            : t.error
        );
        return;
      }
      const scheduled = await savePlanAndScheduleInboxItemAtomic(user.uid, { ...document, plan: result.draft }, item);
      setItems((all) => all.map((entry) => (entry.id === item.id ? scheduled.item : entry)));
    });

  const addDurationAndAddToPlan = async (item: AppAInboxItem, minutes: number) => {
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) return;
    await run(item.id, async () => {
      const localDate = getLocalDateKeyInTimeZone(effectiveTimeZone);
      const document = await loadConfirmedDailyPlan(user.uid, localDate);
      if (!document) {
        setError(t.noPlan);
        return;
      }
      const candidate: AppAInboxItem = { ...item, estimatedMinutes: minutes };
      const result = addInboxItemToPlan(document.plan, candidate);
      if ("error" in result) {
        setError(
          result.error === "duplicate"
            ? t.duplicate
            : result.error === "duration_required"
            ? t.durationNeeded
            : result.error.includes("capacity")
            ? t.capacity
            : t.error
        );
        return;
      }
      const updated = await addMissingInboxDuration(user.uid, item.id, minutes);
      const scheduled = await savePlanAndScheduleInboxItemAtomic(user.uid, { ...document, plan: result.draft }, updated);
      setItems((all) => all.map((entry) => (entry.id === item.id ? scheduled.item : entry)));
    });
  };

  const saveDurationOnly = async (item: AppAInboxItem, minutes: number) => {
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) return;
    await run(item.id, async () => {
      const updated = await addMissingInboxDuration(user.uid, item.id, minutes);
      setItems((values) => values.map((entry) => (entry.id === item.id ? updated : entry)));
    });
  };

  const taskFilterOptions: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: t.allActive, count: counts.tasks },
    { id: "this_week", label: t.week, count: counts.thisWeek },
    { id: "later", label: t.later, count: counts.later },
    { id: "waiting", label: t.waiting, count: counts.waiting },
    { id: "scheduled", label: t.scheduled, count: counts.scheduled },
    { id: "completed", label: t.completed, count: counts.completed },
    { id: "archived", label: t.archived, count: counts.archived },
  ];

  const isSecondaryFilterActive = filter !== "all" && filter !== "notes";
  const activeSecondaryFilterObj = taskFilterOptions.find((f) => f.id === filter);
  const activeFilterButtonLabel = isSecondaryFilterActive && activeSecondaryFilterObj ? activeSecondaryFilterObj.label : t.filters;

  return (
    <div className="mx-auto w-full max-w-[720px] px-3 pb-8 sm:px-6">
      {/* Header */}
      <header className="mb-4">
        <p className="app-a-eyebrow">{t.eyebrow}</p>
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight" style={{ color: "var(--app-a-text)" }}>
          {t.title}
        </h1>
        <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
          {t.intro}
        </p>
      </header>

      {/* Quick Add Bar: single row, simple input + Add */}
      <section className="mb-4" aria-label={t.add}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void addManual();
          }}
          className="flex w-full items-center gap-2 rounded-xl border p-1.5 shadow-sm transition-all"
          style={{ backgroundColor: "var(--app-a-surface)", borderColor: "var(--app-a-border)" }}
        >
          <input
            className="app-a-focus-ring min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-[14px] sm:text-[15px] outline-none placeholder:text-[var(--app-a-text-tertiary)]"
            maxLength={500}
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder={t.placeholder}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || processing === "new"}
            className="app-a-primary-button app-a-focus-ring flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-[13px] sm:text-[14px] font-semibold"
          >
            {processing === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>{t.add}</span>
          </button>
        </form>
      </section>

      {/* Search & Views Controls */}
      <div className="mb-4 space-y-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--app-a-text-tertiary)" }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="app-a-field app-a-focus-ring min-h-[38px] w-full pl-9 pr-8 text-[13px] sm:text-[14px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="app-a-focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--app-a-text-tertiary)] hover:text-[var(--app-a-text)]"
              aria-label={t.clearSearch}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Primary View Tabs + Secondary Filter Menu */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Primary View: Zadaci & Za razjašnjenje */}
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: "var(--app-a-surface-secondary)" }}>
            <button
              type="button"
              role="tab"
              aria-selected={filter !== "notes"}
              onClick={() => {
                if (filter === "notes") setFilter("all");
              }}
              className={`app-a-focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                filter !== "notes"
                  ? "app-a-primary-button shadow-sm"
                  : "text-[var(--app-a-text-secondary)] hover:text-[var(--app-a-text)]"
              }`}
            >
              <span>{t.all}</span>
              <span
                className="rounded-full px-1.5 text-[11px] font-medium"
                style={{ backgroundColor: filter !== "notes" ? "rgba(255,255,255,0.22)" : "var(--app-a-disabled-bg)" }}
              >
                {counts.tasks}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filter === "notes"}
              onClick={() => setFilter("notes")}
              className={`app-a-focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                filter === "notes"
                  ? "app-a-primary-button shadow-sm"
                  : "text-[var(--app-a-text-secondary)] hover:text-[var(--app-a-text)]"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{t.notes}</span>
              {counts.notes > 0 && (
                <span
                  className="rounded-full px-1.5 text-[11px] font-medium"
                  style={{ backgroundColor: filter === "notes" ? "rgba(255,255,255,0.22)" : "var(--app-a-disabled-bg)" }}
                >
                  {counts.notes}
                </span>
              )}
            </button>
          </div>

          {/* Secondary Filters Dropdown — ONLY displayed on Tasks tab */}
          {filter !== "notes" && (
            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setShowFilterMenu((prev) => !prev)}
                className={`app-a-focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  isSecondaryFilterActive
                    ? "app-a-primary-button shadow-sm"
                    : "border text-[var(--app-a-text-secondary)] hover:bg-[var(--app-a-disabled-bg)]"
                }`}
                style={{
                  borderColor: isSecondaryFilterActive ? "transparent" : "var(--app-a-border)",
                }}
                aria-expanded={showFilterMenu}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>{activeFilterButtonLabel}</span>
                {isSecondaryFilterActive ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilter("all");
                    }}
                    className="ml-0.5 rounded p-0.5 hover:bg-black/20"
                    aria-label={t.clearFilter}
                  >
                    <X className="h-3 w-3" />
                  </span>
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                )}
              </button>

              {showFilterMenu && (
                <div
                  className="absolute right-0 top-full z-20 mt-1.5 w-56 max-w-[calc(100vw-2.5rem)] rounded-xl border p-1.5 shadow-lg"
                  style={{
                    backgroundColor: "var(--app-a-surface)",
                    borderColor: "var(--app-a-border)",
                  }}
                >
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--app-a-text-tertiary)" }}>
                    {t.filterBy}
                  </div>
                  {taskFilterOptions.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setFilter(entry.id);
                        setShowFilterMenu(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--app-a-surface-secondary)]"
                      style={{
                        color: filter === entry.id ? "var(--app-a-accent)" : "var(--app-a-text)",
                        fontWeight: filter === entry.id ? 600 : 500,
                      }}
                    >
                      <span>{entry.label}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          backgroundColor: "var(--app-a-disabled-bg)",
                          color: "var(--app-a-text-secondary)",
                        }}
                      >
                        {entry.count}
                      </span>
                    </button>
                  ))}
                  {isSecondaryFilterActive && (
                    <div className="mt-1 border-t pt-1" style={{ borderColor: "var(--app-a-border)" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setFilter("all");
                          setShowFilterMenu(false);
                        }}
                        className="flex w-full items-center justify-center rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--app-a-surface-secondary)]"
                        style={{ color: "var(--app-a-text-secondary)" }}
                      >
                        {t.allFilterLabel}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div role="alert" className="app-a-panel-danger mb-3 text-[13px]">
          {error}
        </div>
      )}

      {/* Item List */}
      {visible.length === 0 ? (
        <div
          className="app-a-surface flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center"
          style={{ borderColor: "var(--app-a-border)" }}
        >
          <Inbox className="h-6 w-6" style={{ color: "var(--app-a-text-tertiary)" }} />
          <p className="text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>
            {t.empty}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => {
            const isNote = item.kind === "note";

            // Distinct Note Card
            if (isNote) {
              return (
                <article
                  key={item.id}
                  className="rounded-xl border p-3.5 transition-all sm:p-4"
                  style={{
                    backgroundColor: "var(--app-a-surface)",
                    borderColor: "var(--app-a-border)",
                    borderLeftWidth: "4px",
                    borderLeftColor: "var(--app-a-accent)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Explanatory note indicator: Note — no action assumed */}
                      <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--app-a-accent)" }}>
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span>{t.note}</span>
                      </div>

                      <h2 className="break-words text-[15px] font-semibold leading-snug sm:text-[16px]" style={{ color: "var(--app-a-text)" }}>
                        {item.title}
                      </h2>

                      {item.details && (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
                          {item.details}
                        </p>
                      )}
                    </div>

                    {/* Note actions: Turn into task (primary) & Delete (secondary) */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {processing === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--app-a-accent)]" />
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={Boolean(processing)}
                            onClick={() =>
                              void run(item.id, async () => {
                                const next = await convertInboxNoteToTask(user.uid, item.id);
                                setItems((all) => all.map((entry) => (entry.id === item.id ? next : entry)));
                              })
                            }
                            className="app-a-primary-button app-a-focus-ring flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold sm:text-[13px]"
                            aria-label={`${t.makeTask}: ${item.title}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{t.makeTask}</span>
                          </button>

                          {deleteConfirm === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  void run(item.id, async () => {
                                    await deleteInboxItem(user.uid, item.id);
                                    setItems((all) => all.filter((entry) => entry.id !== item.id));
                                    setDeleteConfirm(null);
                                  })
                                }
                                className="app-a-focus-ring rounded-lg px-2 py-1 text-[12px] font-semibold"
                                style={{ color: "var(--app-a-danger)", backgroundColor: "var(--app-a-danger-soft)" }}
                              >
                                {t.confirmDelete}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="app-a-secondary-button app-a-focus-ring px-2 py-1 text-[12px]"
                              >
                                {t.cancel}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(item.id)}
                              className="app-a-focus-ring flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--app-a-danger-soft)]"
                              style={{ borderColor: "var(--app-a-border)", color: "var(--app-a-text-tertiary)" }}
                              aria-label={`${t.delete}: ${item.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 hover:text-[var(--app-a-danger)]" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            }

            // Compact Task Card
            const hasKnownDuration = Boolean(item.estimatedMinutes);
            const isTerminal = item.status === "completed" || item.status === "archived";

            return (
              <article
                key={item.id}
                className="app-a-surface rounded-xl border p-3.5 transition-all sm:p-4"
                style={{ borderColor: "var(--app-a-border)" }}
              >
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  {/* Task Info */}
                  <div className="min-w-0 flex-1">
                    <h2
                      className={`break-words text-[15px] font-semibold leading-snug sm:text-[16px] ${
                        item.status === "completed" ? "line-through opacity-60" : ""
                      }`}
                      style={{ color: "var(--app-a-text)" }}
                    >
                      {item.title}
                    </h2>

                    {item.details && (
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
                        {item.details}
                      </p>
                    )}

                    {/* Metadata Row: Status/Horizon badge + duration ONLY if already known */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--app-a-text-secondary)" }}>
                      <span
                        className="inline-flex items-center rounded-md px-1.5 py-0.5 font-medium"
                        style={{
                          backgroundColor: item.status === "waiting" ? "var(--app-a-warning-soft)" : "var(--app-a-disabled-bg)",
                          color: item.status === "waiting" ? "var(--app-a-warning-text)" : "var(--app-a-text-secondary)",
                        }}
                      >
                        {item.status === "waiting"
                          ? t.waiting
                          : item.status === "scheduled"
                          ? `${t.scheduled}: ${item.scheduledLocalDate}`
                          : item.status === "completed"
                          ? t.completed
                          : item.status === "archived"
                          ? t.archived
                          : item.horizon === "this_week"
                          ? t.week
                          : t.later}
                      </span>

                      {hasKnownDuration && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock3 className="h-3 w-3" />
                          <span>
                            {item.estimatedMinutes} {t.minutes}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Area: 1 Primary Button + "…" Menu */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {processing === item.id ? (
                      <div className="flex h-8 w-8 items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--app-a-accent)]" />
                      </div>
                    ) : (
                      <>
                        {/* Primary Action */}
                        {!isTerminal ? (
                          <button
                            type="button"
                            disabled={Boolean(processing)}
                            onClick={() => {
                              if (item.estimatedMinutes) {
                                void addToday(item);
                              } else {
                                setActiveDurationItem((current) => (current === item.id ? null : item.id));
                                setActiveMenu(null);
                                setActiveScheduleItem(null);
                              }
                            }}
                            className="app-a-primary-button app-a-focus-ring flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold sm:text-[13px]"
                            aria-label={`${t.addToday}: ${item.title}`}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            <span>{t.addToday}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(processing)}
                            onClick={() => void update(item, "inbox")}
                            className="app-a-secondary-button app-a-focus-ring flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium"
                            aria-label={`${t.restore}: ${item.title}`}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            <span>{t.restore}</span>
                          </button>
                        )}

                        {/* "…" More Actions Menu Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenu((current) => (current === item.id ? null : item.id));
                            setActiveDurationItem(null);
                            setActiveScheduleItem(null);
                          }}
                          className="app-a-focus-ring flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--app-a-disabled-bg)]"
                          style={{
                            borderColor: activeMenu === item.id ? "var(--app-a-accent)" : "var(--app-a-border)",
                            color: "var(--app-a-text-secondary)",
                          }}
                          aria-label={t.moreActions}
                          aria-expanded={activeMenu === item.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline Duration Prompt when Add to Today is tapped and duration is unknown */}
                {activeDurationItem === item.id && (
                  <div
                    className="mt-3 rounded-xl border p-3 transition-all"
                    style={{ backgroundColor: "var(--app-a-surface-secondary)", borderColor: "var(--app-a-border)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--app-a-text)" }}>
                        {t.addDurationPrompt}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveDurationItem(null)}
                        className="app-a-focus-ring rounded p-1 text-[var(--app-a-text-tertiary)] hover:text-[var(--app-a-text)]"
                        aria-label={t.cancel}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* Quick preset buttons: 15, 30, 45, 60 min */}
                      {[15, 30, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            void addDurationAndAddToPlan(item, mins);
                            setActiveDurationItem(null);
                          }}
                          className="app-a-secondary-button app-a-focus-ring px-2.5 py-1 text-[12px] font-medium"
                        >
                          {mins} {t.minutes}
                        </button>
                      ))}

                      {/* Custom input */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          placeholder={t.duration}
                          value={missingMinutes[item.id] || ""}
                          onChange={(e) => setMissingMinutes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="app-a-field app-a-focus-ring min-h-[34px] w-20 shrink-0 px-2 text-[13px]"
                        />
                        <button
                          type="button"
                          disabled={!missingMinutes[item.id]}
                          onClick={() => {
                            const val = Number(missingMinutes[item.id]);
                            if (val > 0) {
                              void addDurationAndAddToPlan(item, val);
                              setActiveDurationItem(null);
                            }
                          }}
                          className="app-a-primary-button app-a-focus-ring px-2.5 py-1 text-[12px] font-semibold"
                        >
                          {t.saveAndAdd}
                        </button>
                        <button
                          type="button"
                          disabled={!missingMinutes[item.id]}
                          onClick={() => {
                            const val = Number(missingMinutes[item.id]);
                            if (val > 0) {
                              void saveDurationOnly(item, val);
                              setActiveDurationItem(null);
                            }
                          }}
                          className="app-a-secondary-button app-a-focus-ring px-2 py-1 text-[11px]"
                        >
                          {t.saveDuration}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Schedule Date Picker when opened via "Zakaži" */}
                {activeScheduleItem === item.id && (
                  <div
                    className="mt-3 rounded-xl border p-3 transition-all"
                    style={{ backgroundColor: "var(--app-a-surface-secondary)", borderColor: "var(--app-a-border)" }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--app-a-text)" }}>
                        {t.schedulePrompt}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveScheduleItem(null)}
                        className="app-a-focus-ring rounded p-1 text-[var(--app-a-text-tertiary)] hover:text-[var(--app-a-text)]"
                        aria-label={t.cancel}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        min={getLocalDateKeyInTimeZone(effectiveTimeZone)}
                        value={scheduleFor[item.id] || ""}
                        onChange={(event) => setScheduleFor((all) => ({ ...all, [item.id]: event.target.value }))}
                        className="app-a-field app-a-focus-ring min-h-[36px] max-w-full sm:max-w-[170px] shrink-0 px-2.5 text-[13px]"
                        aria-label={t.scheduleDate}
                      />
                      <button
                        type="button"
                        disabled={!scheduleFor[item.id]}
                        onClick={() => {
                          void update(item, "scheduled", { scheduledLocalDate: scheduleFor[item.id] });
                          setActiveScheduleItem(null);
                        }}
                        className="app-a-primary-button app-a-focus-ring px-3 py-1.5 text-[12px] font-semibold"
                      >
                        {t.schedule}
                      </button>
                    </div>
                  </div>
                )}

                {/* Secondary Actions expanded via "…" menu */}
                {activeMenu === item.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2.5" style={{ borderColor: "var(--app-a-border)" }}>
                    {/* Zakaži */}
                    {!isTerminal && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveScheduleItem(item.id);
                          setActiveMenu(null);
                        }}
                        className="app-a-secondary-button app-a-focus-ring flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        <span>{t.schedule}</span>
                      </button>
                    )}

                    {/* Čekam */}
                    {!isTerminal && (
                      <button
                        type="button"
                        onClick={() => {
                          void update(item, item.status === "waiting" ? "inbox" : "waiting");
                          setActiveMenu(null);
                        }}
                        className="app-a-secondary-button app-a-focus-ring flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium"
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>{item.status === "waiting" ? t.restore : t.wait}</span>
                      </button>
                    )}

                    {/* Završi (short label) */}
                    {item.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => {
                          void update(item, "completed");
                          setActiveMenu(null);
                        }}
                        className="app-a-secondary-button app-a-focus-ring flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{t.complete}</span>
                      </button>
                    )}

                    {/* Arhiviraj */}
                    {item.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => {
                          void update(item, "archived");
                          setActiveMenu(null);
                        }}
                        className="app-a-secondary-button app-a-focus-ring flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>{t.archive}</span>
                      </button>
                    )}

                    {/* Obriši with confirmation */}
                    {deleteConfirm === item.id ? (
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            void run(item.id, async () => {
                              await deleteInboxItem(user.uid, item.id);
                              setItems((all) => all.filter((entry) => entry.id !== item.id));
                              setDeleteConfirm(null);
                            });
                          }}
                          className="app-a-focus-ring flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
                          style={{ color: "var(--app-a-danger)", backgroundColor: "var(--app-a-danger-soft)" }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t.confirmDelete}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="app-a-secondary-button app-a-focus-ring px-2 py-1.5 text-[12px]"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(item.id)}
                        className="app-a-focus-ring ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--app-a-danger-soft)]"
                        style={{ color: "var(--app-a-danger)" }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t.delete}</span>
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

