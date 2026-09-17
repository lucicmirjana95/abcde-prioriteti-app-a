import React, { useEffect, useMemo, useState } from "react";
import { useAppAAuth } from "../auth/useAppAAuth";
import PlanHistoryState from "../components/PlanHistoryState";
import type { AppAInboxItem } from "../domain/inbox/contracts";
import { normalizeInboxTitle } from "../domain/inbox/contracts";
import { getLocalDateKeyInTimeZone } from "../persistence/dailyPlanDocument";
import { getEffectiveTimeZone } from "../settings/preferences";
import type { AppALanguage, AppAPreferences } from "../types";
import { useDataRefresh } from "../persistence/useDataRefresh";
import { useVisionReviewAdapter } from "../adapters/useVisionReviewAdapter";
import type { SavedVisionStrategy } from "../../shared/domain/vision";
import type { InboxAdapter } from "../adapters/inboxAdapter";
import { useInboxAdapter } from "../adapters/useInboxAdapter";
import { useInboxMutations } from "../components/inbox/useInboxMutations";
import InboxQuickCapture from "../components/inbox/InboxQuickCapture";
import InboxSections, { type InboxFilter } from "../components/inbox/InboxSections";
import InboxItemCard from "../components/inbox/InboxItemCard";
import FlowHeader from "../components/daily-reset/FlowHeader";

const COPY = {
  en: {
    eyebrow: "Not for today yet",
    title: "Inbox",
    intro: "Keep thoughts and later tasks clear, and decide what happens next.",
    add: "Save to Inbox",
    placeholder: "What do you want to remember or decide on later?",
    search: "Search Inbox",
    charCount: "characters",
    quickPrompt: "Items stay in Inbox until you explicitly schedule or move them.",
    emptyTitle: "Inbox is clear",
    emptyDesc: "A calm place for thoughts, ideas, and tasks that are not yet part of today's plan.",
    all: "Tasks",
    notes: "To clarify",
    week: "This week",
    waiting: "Waiting",
    scheduled: "Scheduled",
    later: "Later",
    completed: "Completed",
    archived: "Archived",
    sectionNeedsDecision: "Needs clarification",
    sectionWaiting: "Waiting for response",
    sectionScheduled: "Scheduled",
    sectionThisWeek: "This week",
    sectionLater: "Other saved items",
    addToday: "Add to Today",
    clarify: "Clarify",
    schedule: "Schedule date",
    scheduleAction: "Schedule",
    moveToWeek: "This week",
    moveToLater: "Later",
    markWaiting: "Waiting for response",
    saveWaiting: "Save waiting status",
    connectVision: "Connect to vision",
    developVision: "Develop as vision",
    edit: "Edit",
    saveEdit: "Save changes",
    complete: "Mark complete",
    archive: "No longer needed",
    restore: "Move back to Inbox",
    delete: "Delete permanently",
    confirmDelete: "Delete permanently?",
    confirmDeleteDesc: "This item will be permanently deleted and cannot be restored.",
    cancel: "Cancel",
    more: "More actions",
    waitingOnLabel: "Waiting for:",
    waitingPrompt: "Who or what are you waiting for?",
    waitingPlaceholder: "e.g. Colleague review, client reply...",
    editPlaceholder: "Item title...",
    sourceManual: "Quick note",
    sourceDailyReset: "From daily plan",
    sourceRollover: "Rollover",
    minutes: "min",
    note: "Note — no action assumed",
    converted: "Saved as a task in Inbox. Add it to Today only when you choose.",
    itemAddedToToday: "Added to today's plan.",
    noPlan: "Create today's plan before adding this item.",
    durationNeeded: "Add an estimated duration first.",
    capacity: "This item does not fit in today's available time.",
    duplicate: "This item is already in today's plan.",
    error: "The action could not be completed. Try again.",
    invalidDate: "Please select a date from today onwards.",
    signInError: "Sign-in was not completed. Your data has not changed.",
    retrySignIn: "Try sign-in again",
    visionConnected: "Connected to vision.",
    visionSelectPrompt: "Select a vision to connect:",
    visionNone: "No active visions found.",
    retry: "Try again",
  },
  sr: {
    eyebrow: "Još nije za danas",
    title: "Inboks",
    intro: "Sačuvajte ideje i obaveze za kasnije i razjasnite beleške bez izmišljanja zadataka.",
    add: "Sačuvaj u Inboks",
    placeholder: "Šta želite da zapamtite ili odlučite kasnije?",
    search: "Pretraži Inboks",
    charCount: "znakova",
    quickPrompt: "Stavke ostaju u Inboksu dok ih vi sami ne zakažete ili prebacite.",
    emptyTitle: "Inboks je miran",
    emptyDesc: "Mirno privremeno mesto za ideje, obaveze i stavke koje još nisu spremne za današnji plan.",
    all: "Zadaci",
    notes: "Za razjašnjenje",
    week: "Ove nedelje",
    waiting: "Čekam",
    scheduled: "Zakazano",
    later: "Kasnije",
    completed: "Završeno",
    archived: "Arhivirano",
    sectionNeedsDecision: "Zahteva razjašnjenje",
    sectionWaiting: "Čekam odgovor",
    sectionScheduled: "Zakazane stavke",
    sectionThisWeek: "Ove nedelje",
    sectionLater: "Ostale sačuvane ideje",
    addToday: "Dodaj u Danas",
    clarify: "Razjasni",
    schedule: "Zakaži datum",
    scheduleAction: "Zakaži",
    moveToWeek: "Ove nedelje",
    moveToLater: "Kasnije",
    markWaiting: "Čekam odgovor",
    saveWaiting: "Sačuvaj status čekanja",
    connectVision: "Poveži sa vizijom",
    developVision: "Razradi kao viziju",
    edit: "Izmeni",
    saveEdit: "Sačuvaj izmene",
    complete: "Označi kao završeno",
    archive: "Više nije potrebno",
    restore: "Vrati u Inboks",
    delete: "Trajno obriši",
    confirmDelete: "Trajno obrisati?",
    confirmDeleteDesc: "Ova stavka će biti trajno uklonjena i ne može se povratiti.",
    cancel: "Otkaži",
    more: "Više radnji",
    waitingOnLabel: "Čeka se:",
    waitingPrompt: "Koga ili šta čekate?",
    waitingPlaceholder: "npr. Odgovor klijenta, mišljenje kolege...",
    editPlaceholder: "Naslov stavke...",
    sourceManual: "Brza zabeleška",
    sourceDailyReset: "Iz dnevnog plana",
    sourceRollover: "Prebačeno",
    minutes: "min",
    note: "Beleška — radnja nije pretpostavljena",
    converted: "Sačuvano kao zadatak u Inboksu. U Danas se dodaje samo kada vi odlučite.",
    itemAddedToToday: "Dodato u današnji plan.",
    noPlan: "Prvo napravite današnji plan.",
    durationNeeded: "Prvo dodajte procenjeno trajanje.",
    capacity: "Ova stavka ne staje u raspoloživo vreme za danas.",
    duplicate: "Ova stavka je već u današnjem planu.",
    error: "Radnja nije uspela. Pokušajte ponovo.",
    invalidDate: "Izaberite datum od danas pa nadalje.",
    signInError: "Prijava nije završena. Vaši podaci nisu promenjeni.",
    retrySignIn: "Pokušaj prijavu ponovo",
    visionConnected: "Povezano sa vizijom.",
    visionSelectPrompt: "Izaberite viziju za povezivanje:",
    visionNone: "Nema aktivnih vizija.",
    retry: "Pokušaj ponovo",
  },
  tr: {
    eyebrow: "Henüz bugün için değil",
    title: "Gelen kutusu",
    intro: "Düşünceleri saklayın ve görev uydurmadan notları netleştirin.",
    add: "Gelen kutusuna kaydet",
    placeholder: "Daha sonra neyi hatırlamak veya karar vermek istiyorsunuz?",
    search: "Gelen kutusunda ara",
    charCount: "karakter",
    quickPrompt: "Öğeler siz planlayana veya taşıyana kadar Gelen Kutusunda kalır.",
    emptyTitle: "Gelen kutusu sakin",
    emptyDesc: "Henüz bugünün planına hazır olmayan düşünceler, fikirler ve görevler için sakin bir yer.",
    all: "Görevler",
    notes: "Netleştirilecek",
    week: "Bu hafta",
    waiting: "Bekliyor",
    scheduled: "Planlandı",
    later: "Daha sonra",
    completed: "Tamamlandı",
    archived: "Arşivlenmiş",
    sectionNeedsDecision: "Netleştirme gerektirenler",
    sectionWaiting: "Yanıt bekleyenler",
    sectionScheduled: "Planlananlar",
    sectionThisWeek: "Bu hafta",
    sectionLater: "Diğer kayıtlı öğeler",
    addToday: "Bugüne ekle",
    clarify: "Netleştir",
    schedule: "Tarih planla",
    scheduleAction: "Planla",
    moveToWeek: "Bu hafta",
    moveToLater: "Daha sonra",
    markWaiting: "Yanıt bekliyorum",
    saveWaiting: "Bekleme durumunu kaydet",
    connectVision: "Vizyona bağla",
    developVision: "Vizyon olarak geliştir",
    edit: "Düzenle",
    saveEdit: "Değişiklikleri kaydet",
    complete: "Tamamla",
    archive: "Artık gerekli değil",
    restore: "Gelen kutusuna geri taşı",
    delete: "Kalıcı olarak sil",
    confirmDelete: "Kalıcı olarak silinsin mi?",
    confirmDeleteDesc: "Bu öğe kalıcı olarak silinecek ve geri alınamayacaktır.",
    cancel: "İptal",
    more: "Diğer işlemler",
    waitingOnLabel: "Beklenen:",
    waitingPrompt: "Kimi veya neyi bekliyorsunuz?",
    waitingPlaceholder: "ör. Müşteri yanıtı, meslektaş onayı...",
    editPlaceholder: "Öğe başlığı...",
    sourceManual: "Hızlı not",
    sourceDailyReset: "Günlük plandan",
    sourceRollover: "Devredilen",
    minutes: "dk",
    note: "Not — eylem varsayılmadı",
    converted: "Gelen kutusuna görev olarak kaydedildi. Yalnızca siz seçtiğinizde Bugün'e eklenir.",
    itemAddedToToday: "Bugünün planına eklendi.",
    noPlan: "Bu öğeyi eklemeden önce bugünün planını oluşturun.",
    durationNeeded: "Önce tahmini süre ekleyin.",
    capacity: "Bu öğe bugünkü kullanılabilir süreye sığmıyor.",
    duplicate: "Bu öğe zaten bugünün planında.",
    error: "İşlem tamamlanamadı. Tekrar deneyin.",
    invalidDate: "Lütfen bugünden itibaren geçerli bir tarih seçin.",
    signInError: "Giriş tamamlanmadı. Verileriniz değişmedi.",
    retrySignIn: "Girişi tekrar dene",
    visionConnected: "Vizyona bağlandı.",
    visionSelectPrompt: "Bağlanacak vizyonu seçin:",
    visionNone: "Etkin vizyon bulunamadı.",
    retry: "Tekrar dene",
  },
} as const;

const CLARIFY_COPY = {
  en: {
    clarify: "Clarify",
    prompt: "What concrete action do you want to take?",
    save: "Save as task",
    help: "Help me clarify",
    keep: "Keep as note",
    noSuggestion: "No responsible action is clear yet. Write your own action or keep this as a note.",
    retry: "Try suggestions again",
  },
  sr: {
    clarify: "Razjasni",
    prompt: "Koju konkretnu radnju želite da preduzmete?",
    save: "Sačuvaj kao zadatak",
    help: "Pomozi mi da razjasnim",
    keep: "Zadrži kao belešku",
    noSuggestion: "Još nema jasne i odgovorne radnje. Unesite svoju radnju ili zadržite ovo kao belešku.",
    retry: "Pokušaj druge predloge",
  },
  tr: {
    clarify: "Netleştir",
    prompt: "Hangi somut eylemi yapmak istiyorsunuz?",
    save: "Görev olarak kaydet",
    help: "Netleştirmeme yardım et",
    keep: "Not olarak tut",
    noSuggestion: "Henüz açık ve sorumlu bir eylem yok. Kendi eyleminizi yazın veya bunu not olarak tutun.",
    retry: "Önerileri tekrar dene",
  },
} as const;

export interface InboxScreenProps {
  language: AppALanguage;
  preferences: AppAPreferences;
  onOpenVision?: (visionId?: string) => void;
  adapter?: InboxAdapter;
}

export default function InboxScreen({
  language,
  preferences,
  onOpenVision,
  adapter: customAdapter,
}: InboxScreenProps) {
  const refreshVersion = useDataRefresh();
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const t = COPY[language];
  const clarifyCopy = CLARIFY_COPY[language];

  const adapter = useInboxAdapter(customAdapter);
  const effectiveTimeZone = getEffectiveTimeZone(preferences);
  const todayLocalDate = getLocalDateKeyInTimeZone(effectiveTimeZone);

  const { controller: visionController } = useVisionReviewAdapter(user?.uid, onOpenVision);

  const {
    items,
    setItems,
    loading,
    setLoading,
    error,
    setError,
    notice,
    setNotice,
    processingId,
    draft,
    setDraftTitle,
    draftError,
    submitDraft,
    retryDraft,
    updateItemStatus,
    editItemTitle,
    deleteItem,
    scheduleToday,
    convertNote,
    developVision,
    connectVision,
  } = useInboxMutations({
    userId: user?.uid || "guest",
    language,
    adapter,
    todayLocalDate,
    visionController,
    onOpenVision,
    translations: t,
  });

  const [signInFailed, setSignInFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [availableVisions, setAvailableVisions] = useState<SavedVisionStrategy[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load items on mount / auth ready
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setItems([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const loaded = await adapter.loadItems(user.uid);
        return loaded;
      } catch {
        throw new Error("inbox_load_failed");
      }
    })()
      .then((next) => {
        if (active) setItems(next);
      })
      .catch(() => {
        if (active) {
          // Retain previous items — do NOT wipe on transient load failure
          setLoadError(t.error);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [adapter, authReady, user, refreshVersion, loadAttempt, setItems, setLoading, t.error]);

  // Load active visions when requested
  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    void (async () => {
      try {
        const activeList = await adapter.loadVisionLibrary(user.uid);
        if (active) {
          setAvailableVisions(activeList);
        }
      } catch {
        if (active) setAvailableVisions([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [adapter, user?.uid]);

  const visible = useMemo(() => {
    return items.filter((item) => {
      const isTerminal = item.status === "archived" || item.status === "completed";
      const needle = normalizeInboxTitle(search);
      const matchesSearch =
        !needle ||
        normalizeInboxTitle(`${item.title} ${item.details || ""} ${item.waitingOn || ""}`).includes(
          needle
        );
      if (!matchesSearch) return false;

      switch (filter) {
        case "all":
          return !isTerminal && item.kind !== "note";
        case "notes":
          return item.kind === "note" && !isTerminal;
        case "this_week":
          return item.horizon === "this_week" && item.status === "inbox" && !isTerminal;
        case "waiting":
          return (item.status === "waiting" || item.kind === "waiting_for") && !isTerminal;
        case "scheduled":
          return item.status === "scheduled" && !isTerminal;
        case "later":
          return item.horizon === "later" && item.status === "inbox" && !isTerminal;
        case "completed":
          return item.status === "completed";
        case "archived":
          return item.status === "archived";
        default:
          return true;
      }
    });
  }, [filter, items, search]);

  const groupedSections = useMemo(() => {
    if (filter !== "all") return null;

    const notes = items.filter(
      (item) => item.kind === "note" && item.status !== "archived" && item.status !== "completed"
    );
    const waiting = visible.filter((item) => item.status === "waiting" || item.kind === "waiting_for");
    const scheduled = visible.filter((item) => item.status === "scheduled");
    const thisWeek = visible.filter((item) => item.horizon === "this_week" && item.status === "inbox");
    const later = visible.filter((item) => item.horizon === "later" && item.status === "inbox");

    return {
      notes,
      waiting,
      scheduled,
      thisWeek,
      later,
    };
  }, [filter, items, visible]);

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

  const renderCard = (item: AppAInboxItem) => (
    <InboxItemCard
      key={item.id}
      item={item}
      language={language}
      todayLocalDate={todayLocalDate}
      isProcessing={processingId === item.id}
      isMenuOpen={openActionsId === item.id}
      onToggleMenu={() => setOpenActionsId((prev) => (prev === item.id ? null : item.id))}
      onAddToday={scheduleToday}
      onUpdateStatus={updateItemStatus}
      onEditTitle={editItemTitle}
      onDelete={deleteItem}
      onConvertNote={convertNote}
      onDevelopVision={developVision}
      onConnectVision={connectVision}
      onClarifyHelp={(noteText) => adapter.clarifyNote(noteText, language)}
      availableVisions={availableVisions}
      onError={setError}
      translations={{
        ...t,
        clarifyCopy,
      }}
    />
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-28 sm:px-6 sm:pb-32 md:px-0">
      {/* 1. Header with Watercolor Horizon Art */}
      <FlowHeader
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.intro}
        className="mb-6"
      />

      {/* Global Alerts / Notices */}
      {/* Load Error — with Retry */}
      {loadError ? (
        <div
          className="mb-5 flex items-center justify-between gap-3 rounded-xl p-3.5 text-[13px] font-medium"
          style={{ background: "var(--app-a-danger-soft)", color: "var(--app-a-danger)" }}
        >
          <span role="alert">{loadError}</span>
          <button
            type="button"
            className="min-h-[44px] shrink-0 rounded-full px-3 font-semibold underline underline-offset-2"
            onClick={() => { setLoadError(null); setLoadAttempt((attempt) => attempt + 1); }}
          >
            {t.retry}
          </button>
        </div>
      ) : null}

      {/* Mutation Error — no Retry button, just the alert text */}
      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-xl p-3.5 text-[13px] font-medium"
          style={{ background: "var(--app-a-danger-soft)", color: "var(--app-a-danger)" }}
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl p-3.5 text-[13px] font-medium"
          style={{ background: "var(--app-a-accent-soft)", color: "var(--app-a-accent)" }}
        >
          {notice}
        </div>
      ) : null}

      {/* 2. Responsive 2-Column Layout on Desktop */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        {/* Left Column: Quick Capture (Sticky on desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <InboxQuickCapture
            language={language}
            draftTitle={draft.title}
            onDraftTitleChange={setDraftTitle}
            onSubmit={submitDraft}
            onRetry={retryDraft}
            isSubmitting={processingId === "new"}
            draftError={draftError}
            translations={t}
          />
        </div>

        {/* Right Column: Filters, Search & Item Sections */}
        <div className="lg:col-span-7 mt-6 lg:mt-0">
          <InboxSections
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
            visibleItems={visible}
            groupedSections={groupedSections}
            renderItemCard={renderCard}
            hasLoadError={!!loadError}
            translations={t}
          />
        </div>
      </div>
    </div>
  );
}
