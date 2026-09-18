import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Layers,
  Lightbulb,
  MoreHorizontal,
  Plus,
  RotateCcw,
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
import FlowHeader from "../components/daily-reset/FlowHeader";
import GrowthPathArt from "../components/GrowthPathArt";
import InputCopyButton from "../components/common/InputCopyButton";
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
    guideSubtitle: "How long-term directions connect to your daily planning",
    guideStep1Badge: "Step 1",
    guideStep1Title: "Meaningful direction, not daily tasks",
    guideIntro: "Vision is for meaningful directions that take more than one day — not today’s errands or notes.",
    guideCapture: "Add a direction in your own words. A timeframe is optional; the app can suggest a realistic one.",
    guideStep2Badge: "Step 2",
    guideStep2Title: "Milestones and actionable steps",
    guideDevelop: "Develop it into milestones and small next steps. You can keep several visions in your library.",
    guideStep3Badge: "Step 3",
    guideStep3Title: "One current focus for Today",
    guideFocus: "Choose one current focus. It guides Today; other visions may occasionally offer one optional step, but nothing enters your plan without your confirmation.",
    guideDismiss: "Hide guide",
    placeholder: "Describe a direction or goal…",
    visionLabel: "Vision or long-term direction",
    timeframeLabel: "Desired timeframe (optional)",
    timeframePlaceholder: "e.g. 6 months, by end of year, 12 weeks…",
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
    backToAll: "Back to all visions",
    viewMilestones: "View milestones & steps",
    noVisionsActive: "No active visions yet. Capture your first long-term direction above.",
    noVisionsArchived: "No archived visions.",
    developAndSave: "Develop and save",
    milestonesCount: (m: number, s: number) => `${m} ${m === 1 ? "milestone" : "milestones"} • ${s} ${s === 1 ? "step" : "steps"}`,
  },
  sr: {
    eyebrow: "Dugoročni pravac",
    title: "Vizija",
    intro: "Sačuvajte više pravaca, razrađujte jedan po jedan i izaberite koji vodi današnje predloge.",
    guide: "Kako radi Vizija",
    guideSubtitle: "Kako dugoročni pravci sarađuju sa vašim dnevnim planiranjem",
    guideStep1Badge: "Korak 1",
    guideStep1Title: "Važan pravac, ne dnevne obaveze",
    guideIntro: "Vizija služi za važne pravce koji traju duže od jednog dana — ne za današnje obaveze ili beleške.",
    guideCapture: "Unesite pravac svojim rečima. Rok je opcion; aplikacija može predložiti realan vremenski okvir.",
    guideStep2Badge: "Korak 2",
    guideStep2Title: "Etape i konkretni koraci",
    guideDevelop: "Razradite ga u etape i male sledeće korake. Možete sačuvati više vizija u biblioteci.",
    guideStep3Badge: "Korak 3",
    guideStep3Title: "Jedan trenutni fokus za Danas",
    guideFocus: "Izaberite jedan trenutni fokus. On vodi Danas; druge vizije mogu povremeno ponuditi jedan opcioni korak, ali ništa ne ulazi u plan bez vaše potvrde.",
    guideDismiss: "Sakrij vodič",
    placeholder: "Opišite pravac ili cilj…",
    visionLabel: "Vizija ili dugoročni pravac",
    timeframeLabel: "Željeni rok (opciono)",
    timeframePlaceholder: "npr. 6 meseci, do kraja godine, 12 nedelja…",
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
    backToAll: "Nazad na sve vizije",
    viewMilestones: "Pogledaj etape i korake",
    noVisionsActive: "Još nemate aktivnih vizija. Unesite svoj prvi dugoročni pravac iznad.",
    noVisionsArchived: "Nema arhiviranih vizija.",
    developAndSave: "Razradi i sačuvaj",
    milestonesCount: (m: number, s: number) => `${m} ${m === 1 ? "etapa" : m < 5 ? "etape" : "etapa"} • ${s} ${s === 1 ? "korak" : s < 5 ? "koraka" : "koraka"}`,
  },
  tr: {
    eyebrow: "Uzun vadeli yön",
    title: "Vizyon",
    intro: "Birden fazla yönü saklayın, her seferinde birini geliştirin ve Bugün'ü hangisinin yönlendireceğini seçin.",
    guide: "Vizyon nasıl çalışır?",
    guideSubtitle: "Uzun vadeli yönlerin günlük planlamanızla nasıl çalıştığı",
    guideStep1Badge: "1. Adım",
    guideStep1Title: "Günlük işler değil, anlamlı yönler",
    guideIntro: "Vizyon, bir günden uzun süren anlamlı yönler içindir; bugünün işleri veya notları için değildir.",
    guideCapture: "Yönünüzü kendi sözlerinizle ekleyin. Süre isteğe bağlıdır; uygulama gerçekçi bir zaman aralığı önerebilir.",
    guideStep2Badge: "2. Adım",
    guideStep2Title: "Aşamalar ve somut adımlar",
    guideDevelop: "Bunu aşamalara ve küçük sonraki adımlara dönüştürün. Kitaplığınızda birden fazla vizyon tutabilirsiniz.",
    guideStep3Badge: "3. Adım",
    guideStep3Title: "Bugün için tek bir mevcut odak",
    guideFocus: "Bir mevcut odak seçin. Bugün'ü o yönlendirir; diğer vizyonlar bazen isteğe bağlı tek bir adım sunabilir, ancak onayınız olmadan hiçbir şey planınıza girmez.",
    guideDismiss: "Rehberi gizle",
    placeholder: "Bir yön veya hedef açıklayın…",
    visionLabel: "Vizyon veya uzun vadeli yön",
    timeframeLabel: "İstenen süre (isteğe bağlı)",
    timeframePlaceholder: "örn. 6 ay, yıl sonuna kadar, 12 hafta…",
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
    backToAll: "Tüm vizyonlara dön",
    viewMilestones: "Aşamaları ve adımları gör",
    noVisionsActive: "Henüz aktif vizyon yok. Yukarıdan ilk uzun vadeli yönünüzü ekleyin.",
    noVisionsArchived: "Arşivlenmiş vizyon yok.",
    developAndSave: "Geliştir ve kaydet",
    milestonesCount: (m: number, s: number) => `${m} aşama • ${s} adım`,
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

type LegacyDraft = { kind: "legacy"; draftIdea: string; manualIdeas: string[] };
type StructuredDraft = import("../types").AppAVisionSuggestionDraft & { kind: "structured" };
type NormalizedDraft = LegacyDraft | StructuredDraft;

const parseVisionScreenDraft = (value: unknown): NormalizedDraft => {
  const fallback: LegacyDraft = { kind: "legacy", draftIdea: "", manualIdeas: [] };
  if (!value) return fallback;

  if (typeof value === "string") {
    return { kind: "legacy", draftIdea: value.substring(0, 4000), manualIdeas: [] };
  }

  if (typeof value !== "object") return fallback;

  // Check structured draft
  if ("schemaVersion" in value && value.schemaVersion === 1) {
    const v = value;
    if (
      "suggestedTitle" in v && typeof v.suggestedTitle === "string" &&
      "desiredOutcome" in v && typeof v.desiredOutcome === "string" &&
      "reason" in v && typeof v.reason === "string" &&
      "sourceItemIds" in v && Array.isArray(v.sourceItemIds) &&
      "sourceDailyResetLocalDate" in v && typeof v.sourceDailyResetLocalDate === "string" &&
      "createdAt" in v && typeof v.createdAt === "string" &&
      "origin" in v && v.origin === "daily_reset_vision_suggestion" &&
      "suggestionFingerprint" in v && typeof v.suggestionFingerprint === "string"
    ) {
      const clarificationAnswer = "clarificationAnswer" in v && typeof v.clarificationAnswer === "string" ? v.clarificationAnswer : undefined;
      const possibleExistingVisionId = "possibleExistingVisionId" in v && typeof v.possibleExistingVisionId === "string" ? v.possibleExistingVisionId : undefined;

      return {
        kind: "structured",
        schemaVersion: 1,
        suggestedTitle: v.suggestedTitle,
        desiredOutcome: v.desiredOutcome,
        reason: v.reason,
        sourceItemIds: v.sourceItemIds.filter((id) => typeof id === "string"),
        sourceDailyResetLocalDate: v.sourceDailyResetLocalDate,
        clarificationAnswer,
        possibleExistingVisionId,
        createdAt: v.createdAt,
        origin: "daily_reset_vision_suggestion",
        suggestionFingerprint: v.suggestionFingerprint,
      };
    }
  }

  // Check legacy draft
  if ("draftIdea" in value && typeof value.draftIdea === "string") {
    const manualIdeas = "manualIdeas" in value && Array.isArray(value.manualIdeas)
      ? value.manualIdeas.filter((id) => typeof id === "string" && id.length <= 4000)
      : [];
    return { kind: "legacy", draftIdea: value.draftIdea.substring(0, 4000), manualIdeas };
  }

  return fallback;
};

const compactVisionTitle = (value: string) => {
  const clean = value.replace(/\s+/g, " ").trim();
  const sentence = clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || clean;
  return sentence.length > 88 ? `${sentence.slice(0, 85).trimEnd()}…` : sentence;
};

export default function VisionScreen({ language, targetVisionId }: { language: AppALanguage, targetVisionId?: string | null }) {
  const history = useAppAPlanHistory();
  const t = COPY[language];
  const key = `${history.user?.uid || "guest"}:vision:screen`;
  const [initial] = useState(() => {
    const raw = readSessionDraft<unknown>(key, null, () => true);
    return parseVisionScreenDraft(raw);
  });
  
  const getInitialIdea = (draft: NormalizedDraft) => {
    if (draft.kind === "structured") {
      return draft.clarificationAnswer 
        ? `${draft.suggestedTitle} - ${draft.clarificationAnswer}`
        : draft.suggestedTitle;
    }
    return draft.draftIdea;
  };

  const getInitialManualIdeas = (draft: NormalizedDraft) => {
    if (draft.kind === "structured") {
      return [getInitialIdea(draft)];
    }
    return draft.manualIdeas;
  };

  const [draftIdea, setDraftIdea] = useState(() => getInitialIdea(initial));
  const [draftTimeframe, setDraftTimeframe] = useState("");
  const [draftTimeframes, setDraftTimeframes] = useState<Record<string, string>>({});
  const [manualIdeas, setManualIdeas] = useState(() => getInitialManualIdeas(initial));
  const [saved, setSaved] = useState<SavedVisionStrategy[]>([]);
  const [view, setView] = useState<"active" | "archived">("active");
  const [deletedFingerprints, setDeletedFingerprints] = useState<string[]>([]);
  const [suppressedIdeas, setSuppressedIdeas] = useState<string[]>(() => {
    try {
      const dateKey = `app-a:vision:suppressed:${new Date().toISOString().slice(0, 10)}`;
      const saved = localStorage.getItem(dateKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const dateKey = `app-a:vision:suppressed:${new Date().toISOString().slice(0, 10)}`;
      localStorage.setItem(dateKey, JSON.stringify(suppressedIdeas));
    } catch {
      // Ignore
    }
  }, [suppressedIdeas]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [archiveConfirmItem, setArchiveConfirmItem] = useState<SavedVisionStrategy | null>(null);
  const [error, setError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(shouldOpenVisionGuide);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);

  // Close menus and modals on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsHeaderMenuOpen(false);
        setCardMenuId(null);
        setConfirm(null);
        setArchiveConfirmItem(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (isHeaderMenuOpen && !target?.closest("[data-vision-overflow-menu]")) {
        setIsHeaderMenuOpen(false);
      }
      if (cardMenuId && !target?.closest("[data-card-menu]")) {
        setCardMenuId(null);
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

  const effectiveUserId = history.user?.uid || "guest-local-user";

  useEffect(() => {
    let live = true;
    Promise.all([loadVisionLibrary(effectiveUserId), loadCurrentVisionId(effectiveUserId)])
      .then(([lib, current]) => {
        if (!live) return;
        setSaved(lib.strategies);
        setDeletedFingerprints(lib.deletedFingerprints);
        const active = lib.strategies.filter((x) => x.status !== "archived");
        const valid = active.some((x) => x.id === current) ? current : null;
        setFocusId(valid);

        let initialSelection: string | null = getInitialIdea(initial) ? `draft:${getInitialIdea(initial)}` : null;
        
        if (targetVisionId) {
          const target = lib.strategies.find((x) => x.id === targetVisionId);
          if (target) {
            initialSelection = target.id;
            setView(target.status === "archived" ? "archived" : "active");
          }
        }

        setSelected(initialSelection);

        if (!valid && active.length === 1 && !targetVisionId) {
          void setCurrentVisionId(effectiveUserId, active[0].id).then(() => setFocusId(active[0].id));
        }
      })
      .catch((err) => {
        console.warn("Vision load error:", err);
      });
    return () => {
      live = false;
    };
  }, [effectiveUserId, targetVisionId]);

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

  if (!history.user) {
    return (
      <div className="pt-8">
        <PlanHistoryState
          language={language}
          state="sign_in"
          onSignIn={() => void history.signIn()}
          signInTitle={language === 'sr' ? "Kreirajte strategiju iz vaše vizije" : language === 'tr' ? "Vizyonunuzdan bir strateji oluşturun" : "Create strategy from your vision"}
          signInText={language === 'sr' ? "Prijavite se pomoću Google naloga da biste kreirali vizije, razradili ih u etape i pratili svoj napredak." : language === 'tr' ? "Vizyonlar oluşturmak, bunları aşamalara ayırmak ve ilerlemenizi takip etmek için Google hesabı ile giriş yapın." : "Sign in with your Google account to create visions, break them down into milestones, and track your progress."}
        />
      </div>
    );
  }

  if (history.loading && !saved.length && !manualIdeas.length) return <PlanHistoryState language={language} state="loading" />;

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
      await setCurrentVisionId(effectiveUserId, id);
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
      const next = await setVisionStrategyArchived(effectiveUserId, item, item.status !== "archived");
      setSaved((all) => all.map((x) => (x.id === next.id ? next : x)));
      if (next.status === "archived" && focusId === next.id) {
        await setCurrentVisionId(effectiveUserId, null);
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
      await deleteVisionStrategy(effectiveUserId, item.id);
      const fingerprint = await visionIdeaFingerprint(item.idea);
      setDeletedFingerprints((all) => [...new Set([...all, fingerprint])]);
      setSuppressedIdeas((all) => [...new Set([...all, item.idea])]);
      setManualIdeas((all) => all.filter((idea) => idea !== item.idea));
      if (focusId === item.id) {
        await setCurrentVisionId(effectiveUserId, null);
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
    const tf = draftTimeframe.trim();
    if (tf) {
      setDraftTimeframes((prev) => ({ ...prev, [idea]: tf }));
    }
    setManualIdeas((all) => [idea, ...all.filter((x) => x !== idea)]);
    setSelected(`draft:${idea}`);
    setView("active");
    setDraftIdea("");
    setDraftTimeframe("");
  };

  // Render individual vision card for the grid
  const renderVisionCard = (item: SavedVisionStrategy, index: number) => {
    const isFocus = focusId === item.id;
    const isArchived = item.status === "archived";
    const milestonesCount = item.strategy?.milestones?.length || 0;
    const stepsCount = item.strategy?.milestones?.reduce((acc, m) => acc + (m.steps?.length || 0), 0) || 0;
    const title = compactVisionTitle(item.planningContext?.acceptedGoal || item.idea);
    const medallionTypes = ["plant", "stones", "waves", "sun"] as const;
    const medallionType = medallionTypes[index % medallionTypes.length];

    return (
      <article
        key={item.id}
        onClick={() => setSelected(item.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelected(item.id);
          }
        }}
        className={`app-a-surface group relative flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
          isFocus
            ? "border-[#34C759]/40 bg-[#34C759]/[0.015] dark:border-[#30D158]/40 dark:bg-[#30D158]/[0.02]"
            : "border-black/10 hover:border-[#0071E3]/40 dark:border-white/15 dark:hover:border-[#0A84FF]/40"
        }`}
      >
        <div>
          {/* Top Badges & Medallion Row */}
          <div className="flex items-start justify-between gap-3">
            <GrowthPathArt
              variant="medallion"
              medallionType={medallionType}
              size={42}
              className="shrink-0 shadow-xs"
            />

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {isFocus ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#34C759]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#248A3D] dark:text-[#30D158]">
                  <Check className="h-3 w-3" />
                  {t.current}
                </span>
              ) : null}

              {isArchived ? (
                <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-medium text-[#8E8E93] dark:bg-white/10">
                  {t.archived}
                </span>
              ) : item.planningContext?.timeframe ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                  <Target className="h-3 w-3 text-[#0071E3] dark:text-[#0A84FF]" />
                  {item.planningContext.timeframe}
                </span>
              ) : null}
            </div>
          </div>

          {/* Vision Title */}
          <h3 className="mt-3.5 text-[17px] font-bold text-black dark:text-white leading-snug group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors break-words">
            {title}
          </h3>

          {/* Milestones & Steps Pill */}
          <div className="mt-2 flex items-center gap-2 text-[12px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
            <span>{t.milestonesCount(milestonesCount, stepsCount)}</span>
          </div>

          {/* Next Step Preview */}
          {item.strategy?.nextStep ? (
            <p className="mt-2.5 line-clamp-2 text-[13px] text-[#48484A] dark:text-[#AEAEB2] leading-relaxed">
              <strong className="font-semibold text-black dark:text-white mr-1">{t.nextStepLabel}</strong>
              {item.strategy.nextStep}
            </p>
          ) : null}
        </div>

        {/* Card Footer Link */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/10">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0071E3] dark:text-[#0A84FF] group-hover:translate-x-0.5 transition-transform">
            {t.viewMilestones}
            <ChevronRight className="h-4 w-4" />
          </span>

          {/* Quick Overflow Button */}
          <div className="relative" data-card-menu onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={t.moreOptions}
              onClick={(e) => {
                e.stopPropagation();
                setCardMenuId((prev) => (prev === item.id ? null : item.id));
              }}
              className="app-a-secondary-button app-a-focus-ring h-8 w-8 p-0 justify-center rounded-lg"
            >
              <MoreHorizontal className="h-4 w-4 text-[#8E8E93]" />
            </button>

            {cardMenuId === item.id ? (
              <div
                role="menu"
                className="app-a-surface-elevated absolute right-0 bottom-full mb-1 z-30 min-w-[170px] rounded-xl border border-black/10 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#2C2C2E]"
              >
                {!isArchived && !isFocus ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCardMenuId(null);
                      void focus(item.id);
                    }}
                    className="flex w-full min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
                  >
                    <Check className="h-3.5 w-3.5 text-[#248A3D] dark:text-[#30D158]" />
                    {t.makeCurrent}
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCardMenuId(null);
                    requestArchive(item);
                  }}
                  className="flex w-full min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
                >
                  {isArchived ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                      {t.restore}
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5 text-[#8E8E93]" />
                      {t.archive}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCardMenuId(null);
                    setConfirm(item.id);
                  }}
                  className="flex w-full min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-[#FF3B30] hover:bg-[#FF3B30]/10 dark:text-[#FF453A]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.remove}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  // Render individual draft card for the grid
  const renderDraftCard = (idea: string) => {
    const tf = draftTimeframes[idea];
    return (
      <article
        key={idea}
        onClick={() => setSelected(`draft:${idea}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelected(`draft:${idea}`);
          }
        }}
        className="app-a-surface group relative flex flex-col justify-between rounded-2xl border border-dashed border-[#0071E3]/40 bg-[#0071E3]/[0.02] p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:border-[#0A84FF]/40 dark:bg-[#0A84FF]/[0.03]"
      >
        <div>
          <div className="flex items-start justify-between gap-3">
            <GrowthPathArt variant="medallion" medallionType="plant" size={42} className="shrink-0" />
            <span className="inline-block rounded-md bg-[#0071E3]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]">
              {t.draft}
            </span>
          </div>

          <h3 className="mt-3.5 text-[17px] font-bold text-black dark:text-white leading-snug group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors break-words">
            {compactVisionTitle(idea)}
          </h3>

          {tf ? (
            <div className="mt-2 flex items-center gap-1 text-[12px] text-[#6E6E73] dark:text-[#AEAEB2]">
              <Target className="h-3 w-3 text-[#0071E3] dark:text-[#0A84FF]" />
              <span>{tf}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/10">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0071E3] dark:text-[#0A84FF] group-hover:translate-x-0.5 transition-transform">
            {t.developAndSave}
            <ChevronRight className="h-4 w-4" />
          </span>
          <button
            type="button"
            aria-label={t.cancel}
            onClick={(e) => {
              e.stopPropagation();
              setManualIdeas((all) => all.filter((x) => x !== idea));
            }}
            className="app-a-secondary-button app-a-focus-ring h-8 w-8 p-0 justify-center rounded-lg text-[#8E8E93] hover:text-[#FF3B30]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </article>
    );
  };

  // Render vision cards grid
  const renderVisionGrid = () => {
    const list = view === "active" ? activeSaved : archivedSaved;
    const activeDrafts = view === "active" ? drafts : [];

    if (list.length === 0 && activeDrafts.length === 0) {
      return (
        <div className="app-a-surface rounded-2xl border border-black/10 flex min-h-[220px] flex-col items-center justify-center p-8 text-center dark:border-white/15">
          <img
            src="/app-a/illustrations/vision.png"
            alt=""
            className="mb-3 h-24 w-24 object-contain select-none pointer-events-none opacity-85"
            draggable={false}
          />
          <p className="text-[14px] text-[#6E6E73] dark:text-[#AEAEB2]">
            {view === "active" ? t.noVisionsActive : t.noVisionsArchived}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {activeDrafts.map((idea) => renderDraftCard(idea))}
        {list.map((item, index) => renderVisionCard(item, index))}
      </div>
    );
  };

  const totalVisionsCount = activeSaved.length + drafts.length;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 md:px-0 pb-28 sm:pb-32">
      {/* 1. SCREEN HEADER WITH WATERCOLOR MOTIF */}
      <FlowHeader
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.intro}
        className="mb-5"
      />

      {/* 2. REDESIGNED GUIDE "HOW VISION WORKS" */}
      {guideOpen ? (
        <section
          className="mb-6 overflow-hidden rounded-2xl border border-black/[0.08] bg-black/[0.02] p-4 sm:p-5 dark:border-white/[0.08] dark:bg-white/[0.02]"
          aria-labelledby="vision-guide-heading"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <GrowthPathArt variant="medallion" medallionType="plant" size={32} />
              <div>
                <h2 id="vision-guide-heading" className="text-[15px] font-semibold text-black dark:text-white">
                  {t.guide}
                </h2>
                <p className="text-[12px] text-[#8E8E93]">
                  {t.guideSubtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleGuide}
              aria-expanded={true}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium text-[#8E8E93] transition-colors hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span>{t.guideDismiss}</span>
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col justify-between rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1C1C1E]">
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-a-wash-apricot-badge)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--app-a-wash-apricot-text)]">
                    <GrowthPathArt variant="medallion" medallionType="stones" size={18} />
                    {t.guideStep1Badge}
                  </span>
                </div>
                <h3 className="mb-1.5 text-[14px] font-semibold text-black dark:text-white">
                  {t.guideStep1Title}
                </h3>
                <p className="text-[12.5px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                  {t.guideIntro} {t.guideCapture}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col justify-between rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1C1C1E]">
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-a-wash-dusty-blue-badge)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--app-a-wash-dusty-blue-text)]">
                    <GrowthPathArt variant="medallion" medallionType="waves" size={18} />
                    {t.guideStep2Badge}
                  </span>
                </div>
                <h3 className="mb-1.5 text-[14px] font-semibold text-black dark:text-white">
                  {t.guideStep2Title}
                </h3>
                <p className="text-[12.5px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                  {t.guideDevelop}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col justify-between rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1C1C1E]">
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-a-wash-sage-badge)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--app-a-wash-sage-text)]">
                    <GrowthPathArt variant="medallion" medallionType="plant" size={18} />
                    {t.guideStep3Badge}
                  </span>
                </div>
                <h3 className="mb-1.5 text-[14px] font-semibold text-black dark:text-white">
                  {t.guideStep3Title}
                </h3>
                <p className="text-[12.5px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                  {t.guideFocus}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="mb-4">
          <button
            type="button"
            onClick={toggleGuide}
            aria-expanded={false}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-[#8E8E93] transition-colors hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
          >
            <GrowthPathArt variant="medallion" medallionType="plant" size={18} />
            <span>{t.guide}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error ? (
        <p role="alert" className="app-a-panel-danger mb-4 text-[13px]">
          {t.error}
        </p>
      ) : null}

      {/* 3. CONDITIONAL: EITHER DEDICATED DETAIL PAGE OR MAIN VISION CARDS LIBRARY */}
      {selectedSaved || selectedDraft ? (
        <div className="space-y-4">
          {/* BACK TO ALL VISIONS BUTTON */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="app-a-secondary-button app-a-focus-ring inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.backToAll}
            </button>
          </div>

          {selectedSaved ? (
            <div className="space-y-6">
              {/* VISION HEADER CARD */}
              <article className="app-a-surface rounded-2xl border border-black/10 overflow-hidden dark:border-white/15 shadow-xs">
                {/* HERO BANNER ARTWORK */}
                <div className="relative border-b border-black/[0.06] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02]">
                  <GrowthPathArt variant="banner" size={90} className="w-full" />
                </div>

                <div className="p-4 sm:p-6">
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
                  <h2 className="mt-3 w-full break-words text-[20px] sm:text-[24px] font-bold text-black dark:text-white leading-snug">
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
              </article>

              {/* STRATEGY BUILDER / VIEWER - Placed directly on page without nested box */}
              {selectedSaved.status !== "archived" ? (
                <VisionStrategyBuilder
                  key={selectedSaved.id}
                  idea={selectedSaved.idea}
                  language={selectedSaved.language}
                  userId={effectiveUserId}
                  initialDocument={selectedSaved}
                  onSaved={(doc) => setSaved((all) => [doc, ...all.filter((x) => x.id !== doc.id)])}
                />
              ) : (
                <div className="app-a-surface rounded-2xl border border-black/10 p-8 text-center text-[13px] text-[#8E8E93] dark:border-white/15">
                  <p>{t.archived}</p>
                </div>
              )}
            </div>
          ) : selectedDraft ? (
            <article className="app-a-surface rounded-2xl border border-black/10 p-4 dark:border-white/15 sm:p-6">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/10 mb-6">
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-md bg-[#0071E3]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]">
                    {t.draft}
                  </span>
                  <h2 className="mt-1 w-full break-words text-[20px] sm:text-[22px] font-bold text-black dark:text-white leading-snug">
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
                userId={effectiveUserId}
                initialTimeframe={draftTimeframes[selectedDraft]}
                autoStart={true}
                provenanceItemIds={
                  initial.kind === "structured" && selectedDraft === getInitialIdea(initial)
                    ? initial.sourceItemIds
                    : undefined
                }
                onSaved={(doc) => {
                  const hadNoActiveVision = saved.every((item) => item.status === "archived");
                  setSaved((all) => [doc, ...all.filter((x) => x.id !== doc.id)]);
                  setManualIdeas((all) => all.filter((x) => x !== selectedDraft));
                  setSelected(doc.id);
                  if (!focusId && hadNoActiveVision) void focus(doc.id);
                }}
                onCancel={() => {
                  setManualIdeas((all) => all.filter((x) => x !== selectedDraft));
                  setSelected(null);
                }}
              />
            </article>
          ) : null}
        </div>
      ) : (
        /* MAIN VISION CARDS LIBRARY */
        <div className="space-y-6">
          {/* 3. NEW VISION INPUT FORM */}
          <form
            className="app-a-surface rounded-2xl border border-black/10 p-4 shadow-sm dark:border-white/15 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <div className="space-y-3.5">
              <div>
                <label className="block text-[13px] font-semibold text-black dark:text-white mb-1.5">
                  {t.visionLabel}
                </label>
                <div className="relative">
                  <textarea
                    value={draftIdea}
                    onChange={(e) => setDraftIdea(e.target.value)}
                    maxLength={4000}
                    rows={2}
                    placeholder={t.placeholder}
                    className="app-a-field app-a-focus-ring w-full resize-y rounded-xl p-3 pr-24 text-[15px] leading-relaxed"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    <InputCopyButton text={draftIdea} language={language} size="sm" />
                    <VoiceInputButton language={language} value={draftIdea} onChange={setDraftIdea} maxLength={4000} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-black dark:text-white mb-1.5">
                  {t.timeframeLabel}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={draftTimeframe}
                    onChange={(e) => setDraftTimeframe(e.target.value)}
                    maxLength={200}
                    placeholder={t.timeframePlaceholder}
                    className="app-a-field app-a-focus-ring w-full rounded-xl p-3 pr-10 text-[14px]"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                    <Target className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#8E8E93]">
                {language === "sr"
                  ? "AI procenjuje izvodljivost i razlaže viziju na etape i konkretne korake."
                  : language === "tr"
                  ? "Yapay zeka uygulanabilirliği değerlendirir ve aşamalara böler."
                  : "AI assesses feasibility and breaks down the vision into milestones."}
              </p>
              <button
                type="submit"
                disabled={draftIdea.trim().length < 3}
                className="app-a-primary-button gap-2 px-4 py-2.5 text-[14px] font-semibold shrink-0 self-end sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                {t.add}
              </button>
            </div>
          </form>

          {/* 4. CURRENT FOCUS SUMMARY CARD */}
          {view === "active" && currentVision ? (
            <section
              className="app-a-surface rounded-2xl border border-black/10 p-4 dark:border-white/15 sm:p-5"
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
                  <button
                    type="button"
                    onClick={() => setSelected(currentVision.id)}
                    className="app-a-secondary-button app-a-focus-ring px-3.5 py-2 text-[13px] font-semibold"
                  >
                    {t.openCurrent}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {/* Warning when active visions exist but none is marked focus */}
          {view === "active" && !currentVision && activeSaved.length > 1 ? (
            <section className="app-a-panel-warning">
              <h2 className="text-[15px] font-semibold">{t.noCurrent}</h2>
              <p className="mt-1 text-[13px] leading-relaxed">{t.noCurrentHelp}</p>
            </section>
          ) : null}

          {/* 5. TABS: ACTIVE vs ARCHIVED */}
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.08] pb-3 dark:border-white/[0.08]">
            <div className="flex rounded-[12px] p-1 bg-black/[0.06] dark:bg-white/[0.08]" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === "active"}
                onClick={() => setView("active")}
                className={`app-a-focus-ring min-h-[36px] px-4 rounded-[9px] text-[13px] font-semibold transition-all ${
                  view === "active"
                    ? "bg-white text-black shadow-xs dark:bg-[#3A3A3C] dark:text-white"
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
                className={`app-a-focus-ring min-h-[36px] px-4 rounded-[9px] text-[13px] font-semibold transition-all ${
                  view === "archived"
                    ? "bg-white text-black shadow-xs dark:bg-[#3A3A3C] dark:text-white"
                    : "text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
                }`}
              >
                {t.archived} ({archivedSaved.length})
              </button>
            </div>
          </div>

          {/* 6. GRID OF VISION CARDS */}
          {renderVisionGrid()}
        </div>
      )}

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
