import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Layers,
  Lightbulb,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
  Target,
} from "lucide-react";
import type { SavedVisionStrategy } from "../../shared/domain/vision";
import {
  deleteVisionStrategy,
  loadCurrentVisionId,
  loadVisionLibrary,
  setCurrentVisionId,
  setVisionStrategyArchived,
  visionIdeaFingerprint,
} from "../../shared/persistence/vision";
import PlanHistoryState from "../components/PlanHistoryState";
import VoiceInputButton from "../components/voice/VoiceInputButton";
import VisionStrategyBuilder from "../components/vision/VisionStrategyBuilder";
import { readSessionDraft, writeSessionDraft } from "../persistence/sessionDraft";
import type { AppALanguage } from "../types";
import { getVisionItems } from "./planHistory";
import { useAppAPlanHistory } from "./useAppAPlanHistory";

const COPY = {
  en: {
    eyebrow: "Long-term direction",
    title: "Vision",
    intro: "Keep several directions, develop one at a time, and choose which one guides Today.",
    guide: "How Vision works",
    guideIntro: "Vision is for meaningful directions that take more than one day — not today’s errands or notes.",
    guideCapture: "Add a direction in your own words. A timeframe is optional; the app can suggest a realistic one.",
    guideDevelop: "Develop it into milestones and small next steps. You can keep several visions in your library.",
    guideFocus: "Choose one current focus. It guides Today; other visions may occasionally offer one optional step, but nothing enters your plan without your confirmation.",
    placeholder: "Describe a direction or goal…",
    add: "New vision",
    active: "Active",
    archived: "Archived",
    empty: "No visions in this view.",
    current: "Current focus",
    currentHelp: "Only this vision guides primary suggestions in Today.",
    noCurrent: "Choose a current focus",
    noCurrentHelp: "Select one active vision to guide Today. The others remain available without taking over your plan.",
    openCurrent: "Open focus",
    openedFocus: "Open",
    makeCurrent: "Set as focus",
    strategyTitle: "Strategy",
    library: "All visions",
    hideVisions: "Hide list",
    showVisions: "Show list",
    draft: "Not developed yet",
    archive: "Archive",
    restore: "Restore",
    remove: "Delete",
    confirm: "Permanently delete this vision?",
    confirmText: "This action cannot be undone. All milestones and progress for this vision will be permanently removed.",
    cancel: "Cancel",
    error: "The vision could not be updated. Try again.",
    choose: "Choose a vision from the list or add a new one.",
    original: "Original entry",
    moreOptions: "More options",
    nextStepLabel: "Next step:",
    onlyActiveVision: "This is your only active vision.",
    selectedBadge: "Selected",
    archiveFocusConfirmTitle: "Archive current focus?",
    archiveFocusConfirmText: "This vision is your current focus for Today. Archiving it will remove it as the current focus until you choose another vision.",
  },
  sr: {
    eyebrow: "Dugoročni pravac",
    title: "Vizija",
    intro: "Sačuvajte više pravaca, razrađujte jedan po jedan i izaberite koji vodi današnje predloge.",
    guide: "Kako radi Vizija",
    guideIntro: "Vizija služi za važne pravce koji traju duže od jednog dana — ne za današnje obaveze ili beleške.",
    guideCapture: "Unesite pravac svojim rečima. Rok je opcion; aplikacija može predložiti realan vremenski okvir.",
    guideDevelop: "Razradite ga u etape i male sledeće korake. Možete sačuvati više vizija u biblioteci.",
    guideFocus: "Izaberite jedan trenutni fokus. On vodi Danas; druge vizije mogu povremeno ponuditi jedan opcioni korak, ali ništa ne ulazi u plan bez vaše potvrde.",
    placeholder: "Opišite pravac ili cilj…",
    add: "Nova vizija",
    active: "Aktivne",
    archived: "Arhivirane",
    empty: "Nema vizija u ovom prikazu.",
    current: "Trenutni fokus",
    currentHelp: "Samo ova vizija vodi glavne predloge u odeljku Danas.",
    noCurrent: "Izaberite trenutni fokus",
    noCurrentHelp: "Izaberite jednu aktivnu viziju koja vodi Danas. Ostale ostaju dostupne bez preuzimanja plana.",
    openCurrent: "Otvori fokus",
    openedFocus: "Otvoreno",
    makeCurrent: "Postavi kao fokus",
    strategyTitle: "Strategija",
    library: "Sve vizije",
    hideVisions: "Sakrij listu",
    showVisions: "Prikaži listu",
    draft: "Još nije razrađena",
    archive: "Arhiviraj",
    restore: "Vrati",
    remove: "Obriši",
    confirm: "Trajno obrisati ovu viziju?",
    confirmText: "Ova radnja se ne može poništiti. Sve etape i koraci ove vizije biće trajno uklonjeni.",
    cancel: "Otkaži",
    error: "Vizija nije mogla da se izmeni. Pokušajte ponovo.",
    choose: "Izaberite viziju sa liste ili dodajte novu.",
    original: "Originalni unos",
    moreOptions: "Više opcija",
    nextStepLabel: "Sledeći korak:",
    onlyActiveVision: "Ovo je vaša jedina aktivna vizija.",
    selectedBadge: "Izabrano",
    archiveFocusConfirmTitle: "Arhivirati trenutni fokus?",
    archiveFocusConfirmText: "Ova vizija je trenutni fokus za Danas. Arhiviranjem se uklanja trenutni fokus dok eksplicitno ne izaberete drugu viziju.",
  },
  tr: {
    eyebrow: "Uzun vadeli yön",
    title: "Vizyon",
    intro: "Birden fazla yönü saklayın, her seferinde birini geliştirin ve Bugün'ü hangisinin yönlendireceğini seçin.",
    guide: "Vizyon nasıl çalışır?",
    guideIntro: "Vizyon, bir günden uzun süren anlamlı yönler içindir; bugünün işleri veya notları için değildir.",
    guideCapture: "Yönünüzü kendi sözlerinizle ekleyin. Süre isteğe bağlıdır; uygulama gerçekçi bir zaman aralığı önerebilir.",
    guideDevelop: "Bunu aşamalara ve küçük sonraki adımlara dönüştürün. Kitaplığınızda birden fazla vizyon tutabilirsiniz.",
    guideFocus: "Bir mevcut odak seçin. Bugün'ü o yönlendirir; diğer vizyonlar bazen isteğe bağlı tek bir adım sunabilir, ancak onayınız olmadan hiçbir şey planınıza girmez.",
    placeholder: "Bir yön veya hedef açıklayın…",
    add: "Yeni vizyon",
    active: "Aktif",
    archived: "Arşiv",
    empty: "Bu görünümde vizyon yok.",
    current: "Mevcut odak",
    currentHelp: "Bugün bölümündeki ana önerileri yalnızca bu vizyon yönlendirir.",
    noCurrent: "Mevcut odağı seçin",
    noCurrentHelp: "Bugün'ü yönlendirecek bir aktif vizyon seçin. Diğerleri planınızı devralmadan kullanılabilir kalır.",
    openCurrent: "Odağı aç",
    openedFocus: "Açık",
    makeCurrent: "Mevcut odak yap",
    strategyTitle: "Strateji",
    library: "Tüm vizyonlar",
    hideVisions: "Listeyi gizle",
    showVisions: "Listeyi göster",
    draft: "Henüz geliştirilmedi",
    archive: "Arşivle",
    restore: "Geri yükle",
    remove: "Sil",
    confirm: "Bu vizyon kalıcı olarak silinsin mi?",
    confirmText: "Bu işlem geri alınamaz. Bu vizyona ait tüm aşamalar ve adımlar kalıcı olarak kaldırılacaktır.",
    cancel: "İptal",
    error: "Vizyon güncellenemedi. Tekrar deneyin.",
    choose: "Listeden bir vizyon seçin veya yenisini ekleyin.",
    original: "Orijinal giriş",
    moreOptions: "Daha fazla seçenek",
    nextStepLabel: "Sonraki adım:",
    onlyActiveVision: "Bu sizin tek aktif vizyonunuzdur.",
    selectedBadge: "Seçildi",
    archiveFocusConfirmTitle: "Mevcut odak arşivlendi mi?",
    archiveFocusConfirmText: "Bu vizyon Bugün için mevcut odağınızdır. Arşivlendiğinde başka bir vizyon seçene kadar odak kaldırılır.",
  },
} as const;

const VISION_SIGN_IN_COPY = {
  en: { title: "Your visions stay private", text: "Sign in to save your Vision library, current focus, and progress across days." },
  sr: { title: "Vaše vizije ostaju privatne", text: "Prijavite se da biste sačuvali biblioteku Vizija, trenutni fokus i napredak kroz dane." },
  tr: { title: "Vizyonlarınız gizli kalır", text: "Vizyon kitaplığınızı, mevcut odağınızı ve günler içindeki ilerlemenizi kaydetmek için giriş yapın." },
} as const;

const VISION_GUIDE_KEY = "app_a_vision_guide_seen_v1";
const shouldOpenVisionGuide = () => {
  try {
    return localStorage.getItem(VISION_GUIDE_KEY) !== "seen";
  } catch {
    return true;
  }
};

type Draft = { draftIdea: string; manualIdeas: string[] };
const validDraft = (value: unknown): value is Draft => {
  const v = value as Draft;
  return (
    !!v &&
    typeof v.draftIdea === "string" &&
    v.draftIdea.length <= 4000 &&
    Array.isArray(v.manualIdeas) &&
    v.manualIdeas.every((x) => typeof x === "string" && x.length <= 4000)
  );
};

const compactVisionTitle = (value: string) => {
  const clean = value.replace(/\s+/g, " ").trim();
  const sentence = clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || clean;
  return sentence.length > 88 ? `${sentence.slice(0, 85).trimEnd()}…` : sentence;
};

export default function VisionScreen({ language }: { language: AppALanguage }) {
  const history = useAppAPlanHistory();
  const t = COPY[language];
  const key = `${history.user?.uid || "guest"}:vision:screen`;
  const [initial] = useState(() => readSessionDraft<Draft>(key, { draftIdea: "", manualIdeas: [] }, validDraft));
  const [draftIdea, setDraftIdea] = useState(initial.draftIdea);
  const [manualIdeas, setManualIdeas] = useState(initial.manualIdeas);
  const [saved, setSaved] = useState<SavedVisionStrategy[]>([]);
  const [view, setView] = useState<"active" | "archived">("active");
  const [deletedFingerprints, setDeletedFingerprints] = useState<string[]>([]);
  const [suppressedIdeas, setSuppressedIdeas] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [archiveConfirmItem, setArchiveConfirmItem] = useState<SavedVisionStrategy | null>(null);
  const [error, setError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(shouldOpenVisionGuide);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Close menus and modals on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsHeaderMenuOpen(false);
        setConfirm(null);
        setArchiveConfirmItem(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (isHeaderMenuOpen && !target?.closest("[data-vision-overflow-menu]")) {
        setIsHeaderMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [isHeaderMenuOpen]);

  const toggleGuide = () =>
    setGuideOpen((open) => {
      const next = !open;
      if (!next) {
        try {
          localStorage.setItem(VISION_GUIDE_KEY, "seen");
        } catch {
          // storage can be unavailable
        }
      }
      return next;
    });

  useEffect(() => writeSessionDraft(key, { draftIdea, manualIdeas }), [draftIdea, key, manualIdeas]);

  useEffect(() => {
    if (!history.user) return;
    let live = true;
    Promise.all([loadVisionLibrary(history.user.uid), loadCurrentVisionId(history.user.uid)])
      .then(([lib, current]) => {
        if (!live) return;
        setSaved(lib.strategies);
        setDeletedFingerprints(lib.deletedFingerprints);
        const active = lib.strategies.filter((x) => x.status !== "archived");
        const valid = active.some((x) => x.id === current) ? current : null;
        setFocusId(valid);
        setSelected(active[0]?.id || lib.strategies[0]?.id || null);
        if (!valid && active.length === 1) {
          void setCurrentVisionId(history.user!.uid, active[0].id).then(() => setFocusId(active[0].id));
        }
      })
      .catch(() => setError(true));
    return () => {
      live = false;
    };
  }, [history.user]);

  const [historyIdeas, setHistoryIdeas] = useState<Array<{ idea: string; fingerprint: string }>>([]);
  useEffect(() => {
    let live = true;
    const ideas = [...new Set(getVisionItems(history.plans).map(({ item }) => item.suggestedAction || item.originalText))];
    void Promise.all(ideas.map(async (idea) => ({ idea, fingerprint: await visionIdeaFingerprint(idea) }))).then((result) => {
      if (live) setHistoryIdeas(result);
    });
    return () => {
      live = false;
    };
  }, [history.plans]);

  const imported = useMemo(
    () =>
      historyIdeas
        .filter(
          ({ idea, fingerprint }) =>
            !deletedFingerprints.includes(fingerprint) &&
            !suppressedIdeas.includes(idea) &&
            !saved.some((x) => x.idea === idea)
        )
        .map(({ idea }) => idea),
    [deletedFingerprints, historyIdeas, saved, suppressedIdeas]
  );

  useEffect(() => setManualIdeas((current) => [...new Set([...current, ...imported])]), [imported]);

  if (!history.authReady || history.loading) return <PlanHistoryState language={language} state="loading" />;
  if (history.error) return <PlanHistoryState language={language} state="error" onSignIn={history.retry} />;
  if (!history.user) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6">
        <header className="mb-6">
          <p className="app-a-eyebrow">{t.eyebrow}</p>
          <h1 className="app-a-page-title">{t.title}</h1>
          <p className="app-a-page-intro max-w-[680px]">{t.intro}</p>
        </header>
        <PlanHistoryState
          language={language}
          state="sign_in"
          onSignIn={() => void history.signIn()}
          signInTitle={VISION_SIGN_IN_COPY[language].title}
          signInText={VISION_SIGN_IN_COPY[language].text}
        />
      </div>
    );
  }

  const activeSaved = saved.filter((item) => item.status !== "archived");
  const archivedSaved = saved.filter((item) => item.status === "archived");
  const currentVision = activeSaved.find((item) => item.id === focusId) || null;

  const drafts =
    view === "active"
      ? manualIdeas.filter(
          (idea) =>
            !suppressedIdeas.includes(idea) &&
            !deletedFingerprints.includes(historyIdeas.find((entry) => entry.idea === idea)?.fingerprint || "") &&
            !saved.some((x) => x.idea === idea)
        )
      : [];

  const shown = saved.filter((x) => (view === "archived" ? x.status === "archived" : x.status !== "archived"));
  const selectedSaved = saved.find((x) => x.id === selected);
  const selectedDraft = selected?.startsWith("draft:") ? selected.slice(6) : null;

  const focus = async (id: string) => {
    setBusy(id);
    try {
      await setCurrentVisionId(history.user!.uid, id);
      setFocusId(id);
      window.dispatchEvent(new Event("app-a-vision-candidates-changed"));
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const requestArchive = (item: SavedVisionStrategy) => {
    setIsHeaderMenuOpen(false);
    if (item.status !== "archived" && focusId === item.id) {
      setArchiveConfirmItem(item);
      return;
    }
    void archive(item);
  };

  const archive = async (item: SavedVisionStrategy) => {
    setBusy(item.id);
    setArchiveConfirmItem(null);
    try {
      const next = await setVisionStrategyArchived(history.user!.uid, item, item.status !== "archived");
      setSaved((all) => all.map((x) => (x.id === next.id ? next : x)));
      if (next.status === "archived" && focusId === next.id) {
        await setCurrentVisionId(history.user!.uid, null);
        setFocusId(null);
      }
      setSelected(null);
      setIsHeaderMenuOpen(false);
      window.dispatchEvent(new Event("app-a-vision-candidates-changed"));
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: SavedVisionStrategy) => {
    setBusy(item.id);
    try {
      await deleteVisionStrategy(history.user!.uid, item.id);
      const fingerprint = await visionIdeaFingerprint(item.idea);
      setDeletedFingerprints((all) => [...new Set([...all, fingerprint])]);
      setSuppressedIdeas((all) => [...new Set([...all, item.idea])]);
      setManualIdeas((all) => all.filter((idea) => idea !== item.idea));
      if (focusId === item.id) {
        await setCurrentVisionId(history.user!.uid, null);
        setFocusId(null);
      }
      setSaved((all) => all.filter((x) => x.id !== item.id));
      setSelected(null);
      setConfirm(null);
      setIsHeaderMenuOpen(false);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const add = () => {
    const idea = draftIdea.trim();
    if (idea.length < 3) return;
    setManualIdeas((all) => [idea, ...all.filter((x) => x !== idea)]);
    setSelected(`draft:${idea}`);
    setView("active");
    setDraftIdea("");
  };

  // Render items in list
  const renderLibraryItems = () => {
    if (shown.length + drafts.length === 0) {
      return (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 p-6 text-center">
          <Lightbulb className="h-5 w-5 text-[#0071E3] dark:text-[#0A84FF]" />
          <p className="text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.empty}</p>
        </div>
      );
    }

    // Special treatment if only 1 active vision exists and view is active
    if (view === "active" && activeSaved.length === 1 && drafts.length === 0) {
      const item = activeSaved[0];
      const isSelected = selected === item.id;
      const isFocus = focusId === item.id;

      return (
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              setSelected(item.id);
              setIsMobileLibraryOpen(false);
            }}
            className={`app-a-focus-ring flex w-full items-start justify-between gap-3 rounded-xl p-3 text-left transition-colors ${
              isSelected
                ? "bg-black/[0.04] dark:bg-white/[0.08]"
                : "hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[11px]">
                {isFocus ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#34C759]/10 px-2 py-0.5 font-semibold text-[#248A3D] dark:text-[#30D158]">
                    <Check className="h-3 w-3" />
                    {t.current}
                  </span>
                ) : null}
                {isSelected ? (
                  <span className="inline-flex items-center rounded-full bg-[#0071E3]/10 px-2 py-0.5 font-semibold text-[#0071E3] dark:bg-[#0A84FF]/10 dark:text-[#0A84FF]">
                    {t.selectedBadge}
                  </span>
                ) : null}
              </div>
              <span className="block break-words text-[14px] font-semibold text-black dark:text-white leading-snug">
                {compactVisionTitle(item.planningContext?.acceptedGoal || item.idea)}
              </span>
              <p className="mt-1 text-[12px] text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.onlyActiveVision}
              </p>
            </div>
            <ChevronRight
              className={`mt-1 h-4 w-4 shrink-0 transition-opacity ${
                isSelected ? "text-[#0071E3] dark:text-[#0A84FF] opacity-100" : "text-[#8E8E93] opacity-50"
              }`}
            />
          </button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-black/[0.06] dark:divide-white/10">
        {shown.map((item) => {
          const isSelected = selected === item.id;
          const isFocus = focusId === item.id;
          const isArchived = item.status === "archived";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelected(item.id);
                setIsMobileLibraryOpen(false);
              }}
              className={`app-a-focus-ring flex w-full items-start gap-3 p-3.5 text-left transition-colors ${
                isSelected
                  ? "bg-black/[0.04] dark:bg-white/[0.08]"
                  : "hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[14px] font-semibold text-black dark:text-white leading-snug">
                  {compactVisionTitle(item.planningContext?.acceptedGoal || item.idea)}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {isFocus ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#34C759]/10 px-2 py-0.5 font-semibold text-[#248A3D] dark:text-[#30D158]">
                      <Check className="h-3 w-3" />
                      {t.current}
                    </span>
                  ) : null}
                  {isSelected ? (
                    <span className="inline-flex items-center rounded-full bg-[#0071E3]/10 px-2 py-0.5 font-semibold text-[#0071E3] dark:bg-[#0A84FF]/10 dark:text-[#0A84FF]">
                      {t.selectedBadge}
                    </span>
                  ) : null}
                  {isArchived ? (
                    <span className="rounded-md bg-black/5 px-1.5 py-0.5 font-medium text-[#8E8E93] dark:bg-white/10">
                      {t.archived}
                    </span>
                  ) : !isFocus && !isSelected && item.planningContext?.timeframe ? (
                    <span className="text-[#6E6E73] dark:text-[#AEAEB2]">
                      {item.planningContext.timeframe}
                    </span>
                  ) : !isFocus && !isSelected ? (
                    <span className="text-[#8E8E93] dark:text-[#8E8E93]">
                      {t.active}
                    </span>
                  ) : null}
                </span>
              </span>
              <ChevronRight
                className={`mt-1 h-4 w-4 shrink-0 transition-opacity ${
                  isSelected ? "text-[#0071E3] dark:text-[#0A84FF] opacity-100" : "text-[#8E8E93] opacity-50"
                }`}
              />
            </button>
          );
        })}

        {drafts.map((idea) => {
          const draftKey = `draft:${idea}`;
          const isSelected = selected === draftKey;

          return (
            <button
              key={idea}
              type="button"
              onClick={() => {
                setSelected(draftKey);
                setIsMobileLibraryOpen(false);
              }}
              className={`app-a-focus-ring flex w-full items-start gap-3 p-3.5 text-left transition-colors ${
                isSelected
                  ? "bg-black/[0.04] dark:bg-white/[0.08]"
                  : "hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[14px] font-semibold text-black dark:text-white leading-snug">
                  {compactVisionTitle(idea)}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-md bg-black/5 px-1.5 py-0.5 font-medium text-[#8E8E93] dark:bg-white/10">
                    {t.draft}
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center rounded-full bg-[#0071E3]/10 px-2 py-0.5 font-semibold text-[#0071E3] dark:bg-[#0A84FF]/10 dark:text-[#0A84FF]">
                      {t.selectedBadge}
                    </span>
                  ) : null}
                </span>
              </span>
              <ChevronRight
                className={`mt-1 h-4 w-4 shrink-0 transition-opacity ${
                  isSelected ? "text-[#0071E3] dark:text-[#0A84FF] opacity-100" : "text-[#8E8E93] opacity-50"
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  const totalVisionsCount = activeSaved.length + drafts.length;

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6">
      {/* 1. SCREEN HEADER */}
      <header className="mb-5">
        <p className="app-a-eyebrow">{t.eyebrow}</p>
        <h1 className="app-a-page-title">{t.title}</h1>
        <p className="app-a-page-intro max-w-[680px]">{t.intro}</p>
      </header>

      {/* 2. COLLAPSED GUIDE "HOW VISION WORKS" */}
      <section className="app-a-surface mb-4 overflow-hidden" aria-labelledby="vision-guide-heading">
        <button
          type="button"
          onClick={toggleGuide}
          aria-expanded={guideOpen}
          className="app-a-focus-ring flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span id="vision-guide-heading" className="inline-flex items-center gap-2 text-[14px] font-semibold text-black dark:text-white">
            <Compass className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" />
            {t.guide}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[#8E8E93] transition-transform ${guideOpen ? "rotate-180" : ""}`} />
        </button>
        {guideOpen ? (
          <div className="grid gap-3 border-t border-black/[0.06] p-4 dark:border-white/10 sm:grid-cols-3">
            <div className="space-y-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-[12px] font-bold text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                1
              </span>
              <p className="text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.guideIntro} {t.guideCapture}
              </p>
            </div>
            <div className="space-y-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-[12px] font-bold text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                2
              </span>
              <p className="text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.guideDevelop}
              </p>
            </div>
            <div className="space-y-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-[12px] font-bold text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                3
              </span>
              <p className="text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.guideFocus}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* 3. NEW VISION INPUT FORM */}
      <form
        className="app-a-surface mb-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="relative">
          <textarea
            value={draftIdea}
            onChange={(e) => setDraftIdea(e.target.value)}
            maxLength={4000}
            rows={2}
            placeholder={t.placeholder}
            className="app-a-field app-a-focus-ring w-full resize-y p-3 pr-14 text-[16px]"
          />
          <div className="absolute right-2 top-2">
            <VoiceInputButton language={language} value={draftIdea} onChange={setDraftIdea} maxLength={4000} />
          </div>
        </div>
        <button
          type="submit"
          disabled={draftIdea.trim().length < 3}
          className="app-a-primary-button mt-3 gap-2 px-4 text-[14px]"
        >
          <Plus className="h-4 w-4" />
          {t.add}
        </button>
      </form>

      {/* 4. CURRENT FOCUS SUMMARY CARD */}
      {view === "active" && currentVision ? (
        <section
          className="app-a-surface mb-4 rounded-2xl border border-black/10 p-4 dark:border-white/15 sm:p-5"
          aria-labelledby="current-vision-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#248A3D] dark:text-[#30D158]">
                <span className="h-2 w-2 rounded-full bg-[#34C759]" />
                {t.current}
              </span>
              <h2 id="current-vision-heading" className="mt-1 line-clamp-2 break-words text-[16px] sm:text-[17px] font-semibold text-black dark:text-white leading-snug">
                {compactVisionTitle(currentVision.planningContext?.acceptedGoal || currentVision.idea)}
              </h2>
              {currentVision.strategy?.nextStep ? (
                <p className="mt-1.5 line-clamp-1 break-words text-[13px] text-[#6E6E73] dark:text-[#AEAEB2] leading-relaxed">
                  <strong className="font-semibold text-black dark:text-white">{t.nextStepLabel}</strong>{" "}
                  {currentVision.strategy.nextStep}
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.currentHelp}</p>
              )}
            </div>
            <div className="shrink-0 pt-1 sm:pt-0">
              {selected === currentVision.id ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-black/5 px-3 py-2 text-[12px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                  <Check className="h-3.5 w-3.5 text-[#248A3D] dark:text-[#30D158]" />
                  {t.openedFocus}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelected(currentVision.id)}
                  className="app-a-secondary-button app-a-focus-ring px-3.5 py-2 text-[13px] font-semibold"
                >
                  {t.openCurrent}
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Warning when active visions exist but none is marked focus */}
      {view === "active" && !currentVision && activeSaved.length > 1 ? (
        <section className="app-a-panel-warning mb-4">
          <h2 className="text-[15px] font-semibold">{t.noCurrent}</h2>
          <p className="mt-1 text-[13px] leading-relaxed">{t.noCurrentHelp}</p>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="app-a-panel-danger mb-3 text-[13px]">
          {t.error}
        </p>
      ) : null}

      {/* 5. ALL VISIONS (MOBILE COLLAPSIBLE ACCORDION) */}
      <div className="mb-4 block lg:hidden">
        <div className="app-a-surface overflow-hidden rounded-2xl border border-black/10 dark:border-white/15">
          <button
            type="button"
            onClick={() => setIsMobileLibraryOpen((prev) => !prev)}
            aria-expanded={isMobileLibraryOpen}
            className="app-a-focus-ring flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-[14px] font-semibold text-black dark:text-white">
              <Layers className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" />
              {t.library} ({totalVisionsCount})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#8E8E93]">
                {isMobileLibraryOpen ? t.hideVisions : t.showVisions}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[#8E8E93] transition-transform ${
                  isMobileLibraryOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {isMobileLibraryOpen ? (
            <div className="border-t border-black/[0.06] p-3 dark:border-white/10">
              <div className="mb-3 flex rounded-[12px] p-1 bg-black/[0.06] dark:bg-white/[0.08]" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "active"}
                  onClick={() => setView("active")}
                  className={`app-a-focus-ring flex-1 min-h-[36px] rounded-[9px] text-[13px] font-semibold transition-all ${
                    view === "active"
                      ? "bg-white text-black shadow-sm dark:bg-[#3A3A3C] dark:text-white"
                      : "text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
                  }`}
                >
                  {t.active} ({activeSaved.length + drafts.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "archived"}
                  onClick={() => setView("archived")}
                  className={`app-a-focus-ring flex-1 min-h-[36px] rounded-[9px] text-[13px] font-semibold transition-all ${
                    view === "archived"
                      ? "bg-white text-black shadow-sm dark:bg-[#3A3A3C] dark:text-white"
                      : "text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
                  }`}
                >
                  {t.archived} ({archivedSaved.length})
                </button>
              </div>

              {renderLibraryItems()}
            </div>
          ) : null}
        </div>
      </div>

      {/* 6. MAIN CONTENT GRID (DESKTOP 2-COLUMN, MOBILE SINGLE COLUMN) */}
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* DESKTOP SIDEBAR LIBRARY */}
        <section className="app-a-surface hidden overflow-hidden rounded-2xl border border-black/10 dark:border-white/15 lg:block">
          <div className="border-b border-black/[0.06] p-3 dark:border-white/10">
            <h2 className="mb-2 px-1 text-[14px] font-semibold text-black dark:text-white">
              {t.library}
            </h2>
            <div className="flex rounded-[12px] p-1 bg-black/[0.06] dark:bg-white/[0.08]" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === "active"}
                onClick={() => setView("active")}
                className={`app-a-focus-ring flex-1 min-h-[34px] rounded-[9px] text-[12px] font-semibold transition-all ${
                  view === "active"
                    ? "bg-white text-black shadow-sm dark:bg-[#3A3A3C] dark:text-white"
                    : "text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
                }`}
              >
                {t.active} ({activeSaved.length + drafts.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "archived"}
                onClick={() => setView("archived")}
                className={`app-a-focus-ring flex-1 min-h-[34px] rounded-[9px] text-[12px] font-semibold transition-all ${
                  view === "archived"
                    ? "bg-white text-black shadow-sm dark:bg-[#3A3A3C] dark:text-white"
                    : "text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
                }`}
              >
                {t.archived} ({archivedSaved.length})
              </button>
            </div>
          </div>
          {renderLibraryItems()}
        </section>

        {/* DETAILS SECTION */}
        <section className="min-w-0">
          {selectedSaved ? (
            <article className="app-a-surface rounded-2xl border border-black/10 p-4 dark:border-white/15 sm:p-6">
              {/* SELECTED VISION HEADER */}
              <div className="pb-3">
                {/* Status chip & Action buttons row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-[0.06em]">
                      {t.strategyTitle}
                    </span>
                    {focusId === selectedSaved.id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#34C759]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#248A3D] dark:text-[#30D158]">
                        <Check className="h-3 w-3" />
                        {t.current}
                      </span>
                    ) : selectedSaved.status === "archived" ? (
                      <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-semibold text-[#8E8E93] dark:bg-white/10">
                        {t.archived}
                      </span>
                    ) : selectedSaved.planningContext?.timeframe ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                        <Target className="h-3 w-3 text-[#0071E3] dark:text-[#0A84FF]" />
                        {selectedSaved.planningContext.timeframe}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Make Current Button */}
                    {selectedSaved.status !== "archived" && focusId !== selectedSaved.id ? (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void focus(selectedSaved.id)}
                        className="app-a-primary-button app-a-focus-ring px-3.5 py-2 text-[13px] font-semibold"
                      >
                        {t.makeCurrent}
                      </button>
                    ) : null}

                    {/* Overflow Menu (Archive, Restore, Delete) */}
                    <div className="relative" data-vision-overflow-menu>
                      <button
                        type="button"
                        aria-label={t.moreOptions}
                        aria-expanded={isHeaderMenuOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHeaderMenuOpen((prev) => !prev);
                        }}
                        className="app-a-secondary-button app-a-focus-ring h-10 w-10 p-0 justify-center rounded-xl"
                      >
                        <MoreHorizontal className="h-4 w-4 text-[#8E8E93]" />
                      </button>

                      {isHeaderMenuOpen ? (
                        <div
                          role="menu"
                          className="app-a-surface-elevated absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-xl border border-black/10 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#2C2C2E]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled={Boolean(busy)}
                            onClick={() => requestArchive(selectedSaved)}
                            className="flex w-full min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5 disabled:opacity-50"
                          >
                            {selectedSaved.status === "archived" ? (
                              <>
                                <RotateCcw className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" />
                                {t.restore}
                              </>
                            ) : (
                              <>
                                <Archive className="h-4 w-4 text-[#8E8E93]" />
                                {t.archive}
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              setConfirm(selectedSaved.id);
                            }}
                            className="flex w-full min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#FF3B30] hover:bg-[#FF3B30]/10 dark:text-[#FF453A]"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t.remove}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* FULL-WIDTH CLEAN TITLE */}
                <h2 className="mt-2.5 w-full break-words text-[18px] sm:text-[20px] font-bold text-black dark:text-white leading-snug">
                  {compactVisionTitle(selectedSaved.planningContext?.acceptedGoal || selectedSaved.idea)}
                </h2>

                {/* Collapsible Original Entry if different */}
                {selectedSaved.idea !== compactVisionTitle(selectedSaved.idea) ? (
                  <details className="mt-2 text-[12px] text-[#6E6E73] dark:text-[#AEAEB2]">
                    <summary className="cursor-pointer font-medium hover:text-black dark:hover:text-white">
                      {t.original}
                    </summary>
                    <p className="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-black/[0.03] p-2.5 leading-relaxed dark:bg-white/[0.05]">
                      {selectedSaved.idea}
                    </p>
                  </details>
                ) : null}
              </div>

              {/* STRATEGY BUILDER / VIEWER */}
              {selectedSaved.status !== "archived" ? (
                <VisionStrategyBuilder
                  key={selectedSaved.id}
                  idea={selectedSaved.idea}
                  language={selectedSaved.language}
                  userId={history.user.uid}
                  initialDocument={selectedSaved}
                  onSaved={(doc) => setSaved((all) => [doc, ...all.filter((x) => x.id !== doc.id)])}
                />
              ) : (
                <div className="py-8 text-center text-[13px] text-[#8E8E93]">
                  <p>{t.archived}</p>
                </div>
              )}
            </article>
          ) : selectedDraft ? (
            <article className="app-a-surface rounded-2xl border border-black/10 p-4 dark:border-white/15 sm:p-6">
              <div className="flex items-start justify-between gap-3 pb-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#8E8E93] dark:bg-white/10">
                    {t.draft}
                  </span>
                  <h2 className="mt-1 w-full break-words text-[18px] sm:text-[20px] font-bold text-black dark:text-white leading-snug">
                    {compactVisionTitle(selectedDraft)}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label={t.cancel}
                  onClick={() => {
                    setManualIdeas((all) => all.filter((x) => x !== selectedDraft));
                    setSelected(null);
                  }}
                  className="app-a-secondary-button app-a-focus-ring h-10 w-10 p-0 justify-center rounded-xl shrink-0"
                >
                  <X className="h-4 w-4 text-[#8E8E93]" />
                </button>
              </div>

              <VisionStrategyBuilder
                key={selectedDraft}
                idea={selectedDraft}
                language={language}
                userId={history.user.uid}
                onSaved={(doc) => {
                  const hadNoActiveVision = saved.every((item) => item.status === "archived");
                  setSaved((all) => [doc, ...all.filter((x) => x.id !== doc.id)]);
                  setManualIdeas((all) => all.filter((x) => x !== selectedDraft));
                  setSelected(doc.id);
                  if (!focusId && hadNoActiveVision) void focus(doc.id);
                }}
              />
            </article>
          ) : (
            <div className="app-a-surface rounded-2xl border border-black/10 flex min-h-[240px] flex-col items-center justify-center p-8 text-center dark:border-white/15">
              <Sparkles className="mb-2 h-7 w-7 text-[#0071E3] dark:text-[#0A84FF] opacity-60" />
              <p className="text-[14px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.choose}</p>
            </div>
          )}
        </section>
      </div>

      {/* 7. ARCHIVE FOCUS CONFIRMATION DIALOG */}
      {archiveConfirmItem ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="app-a-surface w-full max-w-[420px] rounded-2xl p-6 shadow-2xl border border-black/10 dark:border-white/15">
            <h2 className="text-[18px] font-bold text-black dark:text-white">
              {t.archiveFocusConfirmTitle}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
              {t.archiveFocusConfirmText}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setArchiveConfirmItem(null)}
                className="app-a-secondary-button app-a-focus-ring min-h-11 px-4 text-[13px] font-medium"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void archive(archiveConfirmItem)}
                className="app-a-primary-button app-a-focus-ring min-h-11 px-4 text-[13px] font-semibold"
              >
                {t.archive}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 8. PERMANENT DELETE CONFIRMATION DIALOG */}
      {confirm ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="app-a-surface w-full max-w-[420px] rounded-2xl p-6 shadow-2xl border border-black/10 dark:border-white/15">
            <h2 className="text-[18px] font-bold text-black dark:text-white">{t.confirm}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
              {t.confirmText}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="app-a-secondary-button app-a-focus-ring min-h-11 px-4 text-[13px] font-medium"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = saved.find((x) => x.id === confirm);
                  if (item) void remove(item);
                }}
                className="app-a-focus-ring min-h-11 rounded-xl bg-[#FF3B30] px-4 text-[13px] font-semibold text-white hover:bg-[#D70015] active:scale-98 transition-all"
              >
                {t.remove}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
