import { useState, useEffect, useMemo } from "react";
import { readSessionDraft, writeSessionDraft } from "../../persistence/sessionDraft";
import {
  createSequencedVisionCandidate,
  visionStepKey,
} from "../../../shared/domain/today-candidates";
import {
  saveTodayCandidate,
  loadPendingTodayCandidatesContext,
  savePlanAndScheduleVisionAtomic,
} from "../../../shared/persistence/today-candidates";
import { loadConfirmedDailyPlan } from "../../persistence/dailyPlanRepository";
import { addVisionCandidateToPlan } from "../../screens/visionCandidatePlan";
import { getLocalDateKeyInTimeZone } from "../../persistence/dailyPlanDocument";
import { loadAppAPreferences, getEffectiveTimeZone } from "../../settings/preferences";
import { isVisionStrategyResult, isVisionFeasibilityResult } from "../../../shared/domain/vision";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  Split,
  Target,
  X,
} from "lucide-react";
import type { VisionFeasibilityResult, VisionStrategyResult } from "../../../shared/domain/vision";
import { assessVisionFeasibility, createVisionStrategy, decomposeVisionStep } from "../../api/visionStrategyApi";
import type { AppALanguage } from "../../types";
import { useAppAAuth } from "../../auth/useAppAAuth";
import { createVisionStrategyId, type SavedVisionStrategy } from "../../../shared/domain/vision";
import { getVisionSaveDiagnostic, loadVisionLibrary, saveVisionStrategy } from "../../../shared/persistence/vision";
import VoiceInputButton from "../voice/VoiceInputButton";
import VisionStepRefineModal from "./VisionStepRefineModal";

const SHOW_DEV_DIAGNOSTICS =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname.startsWith("ais-"));

interface VisionWorkingDraft {
  documentId: string;
  strategy: VisionStrategyResult | null;
  breakdowns: Record<string, string[]>;
  timeframe: string;
  acceptedGoal: string;
  feasibility: VisionFeasibilityResult | null;
  feasibilityDetails: string;
  questionAnswers: Record<string, string>;
  saved: boolean;
}

function validWorkingDraft(value: unknown): boolean {
  const draft = value as VisionWorkingDraft | null;
  return (
    !!draft &&
    draft.saved === false &&
    /^vision_[a-z0-9_]{4,80}$/.test(draft.documentId) &&
    (!draft.strategy || isVisionStrategyResult(draft.strategy)) &&
    (!draft.feasibility || isVisionFeasibilityResult(draft.feasibility)) &&
    typeof draft.timeframe === "string" &&
    draft.timeframe.length <= 200 &&
    typeof draft.acceptedGoal === "string" &&
    typeof draft.feasibilityDetails === "string" &&
    draft.feasibilityDetails.length <= 4000 &&
    !!draft.questionAnswers &&
    Object.values(draft.questionAnswers).every((answer) => typeof answer === "string" && answer.length <= 500) &&
    !!draft.breakdowns &&
    Object.values(draft.breakdowns).every((steps) => Array.isArray(steps) && steps.every((step) => typeof step === "string"))
  );
}

const COPY = {
  en: {
    develop: "Develop this direction",
    loading: "Turning the idea into a practical path…",
    error: "The direction could not be developed. Try again.",
    saveError: "The strategy could not be saved.",
    signInToSave: "Your strategy is kept on this screen. Sign in again to save it.",
    retrySave: "Sign in and save again",
    savedToast: "Saved",
    notSaved: "Not saved — try again",
    imagine: "Imagine",
    why: "Why it matters",
    next: "Next specific step",
    nextHelper: "You can add this step to today's plan. The next one unlocks once you finish it.",
    addToTodayPlan: "Add to today's plan",
    inTodayPlan: "In today's plan",
    fullPath: (count: number) => `Full path (${count} ${count === 1 ? "milestone" : "milestones"})`,
    risksAndAssumptions: "Risks and assumptions",
    risks: "Risks",
    assumptions: "Assumptions to verify",
    hide: "Hide strategy",
    show: "Show strategy",
    breakDownAction: "Break into smaller steps",
    refineWithAi: "Refine with AI",
    checking: "Checking usefulness…",
    alreadyActionable: "This step is already concrete enough to begin.",
    maxDepthReached: "Maximum breakdown depth reached.",
    stepOptions: "Step options",
    editStep: "Edit step",
    saveStep: "Save step",
    cancelStep: "Cancel",
    stepRequired: "Enter a concrete step (3–240 characters).",
    breakdownProposalTitle: "Proposed smaller steps:",
    acceptBreakdown: "Accept smaller steps",
    rejectBreakdown: "Cancel",
    substepsCount: (count: number) => `${count} step${count === 1 ? "" : "s"}`,
    milestoneStepsCount: (count: number) => `${count} step${count === 1 ? "" : "s"}`,
  },
  sr: {
    develop: "Razradi ovaj pravac",
    loading: "Pretvaram ideju u praktičan put…",
    error: "Pravac nije mogao da se razradi. Pokušajte ponovo.",
    saveError: "Strategija nije mogla da se sačuva.",
    signInToSave: "Strategija ostaje na ovom ekranu. Prijavite se ponovo da biste je sačuvali.",
    retrySave: "Prijavi se i sačuvaj ponovo",
    savedToast: "Sačuvano",
    notSaved: "Nije sačuvano — pokušajte ponovo",
    imagine: "Zamisli",
    why: "Zašto je važno",
    next: "Sledeći konkretan korak",
    nextHelper: "Ovaj korak možeš dodati u današnji plan. Sledeći se otključava kada ga završiš.",
    addToTodayPlan: "Dodaj u današnji plan",
    inTodayPlan: "U današnjem planu",
    fullPath: (count: number) => `Cela putanja (${count} ${count === 1 ? "etapa" : count < 5 ? "etape" : "etapa"})`,
    risksAndAssumptions: "Rizici i pretpostavke",
    risks: "Rizici",
    assumptions: "Pretpostavke koje treba proveriti",
    hide: "Sakrij strategiju",
    show: "Prikaži strategiju",
    breakDownAction: "Podeli na manje korake",
    refineWithAi: "Razradi uz AI",
    checking: "Proveravam korisnost…",
    alreadyActionable: "Ovaj korak je već dovoljno konkretan za početak.",
    maxDepthReached: "Maksimalan nivo raščlanjivanja je dostignut.",
    stepOptions: "Opcije koraka",
    editStep: "Izmeni korak",
    saveStep: "Sačuvaj korak",
    cancelStep: "Otkaži",
    stepRequired: "Unesite konkretan korak (3–240 znakova).",
    breakdownProposalTitle: "Predlog manjih koraka:",
    acceptBreakdown: "Prihvati manje korake",
    rejectBreakdown: "Otkaži",
    substepsCount: (count: number) => `${count} korak${count === 1 ? "" : count < 5 ? "a" : "a"}`,
    milestoneStepsCount: (count: number) => `${count} korak${count === 1 ? "" : count < 5 ? "a" : "a"}`,
  },
  tr: {
    develop: "Bu yönü geliştir",
    loading: "Fikir uygulanabilir bir yola dönüştürülüyor…",
    error: "Yön geliştirilemedi. Tekrar deneyin.",
    saveError: "Strateji kaydedilemedi.",
    signInToSave: "Stratejiniz bu ekranda tutuluyor. Kaydetmek için tekrar giriş yapın.",
    retrySave: "Giriş yap ve tekrar kaydet",
    savedToast: "Kaydedildi",
    notSaved: "Kaydedilmedi — tekrar deneyin",
    imagine: "Hayal et",
    why: "Neden önemli",
    next: "Sonraki somut adım",
    nextHelper: "Bu adımı bugünkü plana ekleyebilirsiniz. Tamamlandığında bir sonraki adımın kilidi açılır.",
    addToTodayPlan: "Bugünün planına ekle",
    inTodayPlan: "Bugünün planında",
    fullPath: (count: number) => `Tüm yol (${count} ${count === 1 ? "aşama" : "aşama"})`,
    risksAndAssumptions: "Riskler ve varsayımlar",
    risks: "Riskler",
    assumptions: "Doğrulanacak varsayımlar",
    hide: "Stratejiyi gizle",
    show: "Stratejiyi göster",
    breakDownAction: "Daha küçük adımlara böl",
    refineWithAi: "Yapay zeka ile geliştir",
    checking: "Yararlılık kontrol ediliyor…",
    alreadyActionable: "Bu adım başlamak için zaten yeterince somut.",
    maxDepthReached: "Maksimum ayrıştırma derinliğine ulaşıldı.",
    stepOptions: "Adım seçenekleri",
    editStep: "Adımı düzenle",
    saveStep: "Adımı kaydet",
    cancelStep: "İptal",
    stepRequired: "Somut bir adım girin (3–240 karakter).",
    breakdownProposalTitle: "Önerilen küçük adımlar:",
    acceptBreakdown: "Küçük adımları kabul et",
    rejectBreakdown: "İptal",
    substepsCount: (count: number) => `${count} adım`,
    milestoneStepsCount: (count: number) => `${count} adım`,
  },
} as const;

const FEASIBILITY_COPY = {
  en: {
    timeframe: "Desired timeframe (optional)",
    timeframePlaceholder: "e.g. 12 months",
    check: "Check feasibility and develop",
    assessment: "Feasibility check",
    useAdjusted: "Use realistic version",
    keepOriginal: "Keep original goal",
    useTimeframe: "Suggested timeframe",
    needsInfo: "Answer the questions below. Your answers will be added to this Vision direction and checked again.",
    detailsLabel: "Your missing details",
    detailsPlaceholder: "Answer briefly in the same order…",
    recheck: "Add details and check again",
  },
  sr: {
    timeframe: "Željeni rok (opciono)",
    timeframePlaceholder: "npr. 12 meseci",
    check: "Proveri izvodljivost i razradi",
    assessment: "Provera izvodljivosti",
    useAdjusted: "Koristi realniju verziju",
    keepOriginal: "Zadrži originalni cilj",
    useTimeframe: "Predloženi rok",
    needsInfo: "Odgovorite na pitanja ispod. Odgovori će biti dodati ovom pravcu Vizije i ponovo provereni.",
    detailsLabel: "Podaci koji nedostaju",
    detailsPlaceholder: "Odgovorite kratko, istim redosledom…",
    recheck: "Dodaj odgovore i proveri ponovo",
  },
  tr: {
    timeframe: "İstenen süre (isteğe bağlı)",
    timeframePlaceholder: "örn. 12 ay",
    check: "Uygulanabilirliği kontrol et ve geliştir",
    assessment: "Uygulanabilirlik kontrolü",
    useAdjusted: "Gerçekçi sürümü kullan",
    keepOriginal: "Orijinal hedefi koru",
    useTimeframe: "Önerilen süre",
    needsInfo: "Aşağıdaki soruları yanıtlayın. Yanıtlar bu Vizyon yönüne eklenip yeniden kontrol edilir.",
    detailsLabel: "Eksik bilgileriniz",
    detailsPlaceholder: "Aynı sırayla kısaca yanıtlayın…",
    recheck: "Bilgileri ekle ve tekrar kontrol et",
  },
} as const;

export default function VisionStrategyBuilder({
  idea,
  language,
  userId,
  initialDocument,
  onSaved,
  onRequestSignIn,
}: {
  idea: string;
  language: AppALanguage;
  userId: string;
  initialDocument?: SavedVisionStrategy;
  onSaved?: (document: SavedVisionStrategy) => void;
  onRequestSignIn?: () => Promise<void>;
}) {
  const t = COPY[language];
  const ft = FEASIBILITY_COPY[language];
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const workingKey = `${userId}:vision:${visionStepKey(idea)}`;
  const [working] = useState(() => readSessionDraft<VisionWorkingDraft | null>(workingKey, null, validWorkingDraft));
  const [strategy, setStrategy] = useState<VisionStrategyResult | null>(working?.strategy || initialDocument?.strategy || null);
  const [documentId] = useState(working?.documentId || initialDocument?.id || createVisionStrategyId);
  const [breakdowns, setBreakdowns] = useState<Record<string, string[]>>(working?.breakdowns || initialDocument?.stepBreakdowns || {});
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [checkingStep, setCheckingStep] = useState<string | null>(null);
  const [concreteStep, setConcreteStep] = useState<string | null>(null);
  const [breakdownProposal, setBreakdownProposal] = useState<{
    key: string;
    substeps: string[];
    parentStep: string;
  } | null>(null);
  const [refiningStep, setRefiningStep] = useState<{
    key: string;
    text: string;
  } | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editingStepText, setEditingStepText] = useState("");
  const [stepEditError, setStepEditError] = useState(false);
  const [saved, setSaved] = useState(Boolean(initialDocument) && !working);
  const [savedToastVisible, setSavedToastVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Close menus on Escape or Click outside
  useEffect(() => {
    if (!openMenuKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuKey(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-step-menu]")) {
        setOpenMenuKey(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [openMenuKey]);

  // Independent milestone expand states
  const [openMilestones, setOpenMilestones] = useState<Record<number, boolean>>({});
  const [isFullPathOpen, setIsFullPathOpen] = useState(false);
  const [isRisksOpen, setIsRisksOpen] = useState(false);

  const [timeframe, setTimeframe] = useState(working?.timeframe || initialDocument?.planningContext?.timeframe || "");
  const [feasibility, setFeasibility] = useState<VisionFeasibilityResult | null>(working?.feasibility || null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>(working?.questionAnswers || {});
  const [feasibilityDetails, setFeasibilityDetails] = useState(working?.feasibilityDetails || initialDocument?.planningContext?.clarificationDetails || "");
  const [saveDiagnostic, setSaveDiagnostic] = useState<string | null>(null);
  const [acceptedGoal, setAcceptedGoal] = useState(working?.acceptedGoal || initialDocument?.planningContext?.acceptedGoal || idea);
  const [currentRevision, setCurrentRevision] = useState<number | undefined>(initialDocument?.revision);
  const [versionConflict, setVersionConflict] = useState(false);

  const [isInTodayPlan, setIsInTodayPlan] = useState(false);
  const [isAddingToPlan, setIsAddingToPlan] = useState(false);

  useEffect(() => {
    let active = true;
    const checkTodayPlan = async () => {
      if (!userId || !strategy?.nextStep) return;
      try {
        const localDate = getLocalDateKeyInTimeZone(getEffectiveTimeZone(loadAppAPreferences()));
        const [planDoc, pendingCtx] = await Promise.all([
          loadConfirmedDailyPlan(userId, localDate),
          loadPendingTodayCandidatesContext(userId),
        ]);
        if (!active) return;
        const inPlan = Boolean(
          planDoc?.plan &&
            [...planDoc.plan.firstFocus, ...planDoc.plan.laterToday, ...planDoc.plan.ifCapacityRemains].some(
              (item) =>
                item.title.trim().toLowerCase() === strategy.nextStep.trim().toLowerCase() ||
                item.goalRelationship?.goalId === documentId ||
                item.id.includes(documentId)
            )
        );
        const isScheduled = pendingCtx.items.some(
          (c) => c.sourceId === documentId && (c.status === "scheduled" || c.status === "completed")
        );
        setIsInTodayPlan(inPlan || isScheduled);
      } catch {
        // non-blocking check
      }
    };
    void checkTodayPlan();
    window.addEventListener("app-a-plan-changed", checkTodayPlan);
    window.addEventListener("app-a-vision-candidates-changed", checkTodayPlan);
    return () => {
      active = false;
      window.removeEventListener("app-a-plan-changed", checkTodayPlan);
      window.removeEventListener("app-a-vision-candidates-changed", checkTodayPlan);
    };
  }, [userId, documentId, strategy?.nextStep]);

  useEffect(() => {
    writeSessionDraft(workingKey, {
      documentId,
      strategy,
      breakdowns,
      timeframe,
      acceptedGoal,
      feasibility,
      feasibilityDetails,
      questionAnswers,
      saved,
    });
  }, [workingKey, documentId, strategy, breakdowns, timeframe, acceptedGoal, feasibility, feasibilityDetails, questionAnswers, saved]);

  const context = (goal = acceptedGoal, target = timeframe, details = feasibilityDetails) =>
    JSON.stringify({
      originalGoal: idea,
      acceptedGoal: goal,
      timeframe: target || null,
      userClarifications: details || null,
    });

  const toggleMilestone = (index: number) => {
    setOpenMilestones((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  async function persistStrategy(
    currentStrategy: VisionStrategyResult,
    currentBreakdowns: Record<string, string[]>,
    goal = acceptedGoal,
    target = timeframe,
    details = feasibilityDetails
  ) {
    const now = new Date().toISOString();
    const document: SavedVisionStrategy = {
      id: documentId,
      idea,
      language,
      strategy: currentStrategy,
      stepBreakdowns: currentBreakdowns,
      createdAt: initialDocument?.createdAt || now,
      updatedAt: now,
      revision: currentRevision,
      status: initialDocument?.status || "active",
      planningContext: {
        acceptedGoal: goal,
        ...(target.trim() ? { timeframe: target.trim() } : {}),
        ...(details.trim() ? { clarificationDetails: details.trim() } : {}),
      },
      ...(initialDocument?.archivedAt ? { archivedAt: initialDocument.archivedAt } : {}),
    };
    try {
      const savedDoc = await saveVisionStrategy(userId, document);
      setCurrentRevision(savedDoc.revision);
      setVersionConflict(false);
      setSaved(true);
      setSavedToastVisible(true);
      setTimeout(() => setSavedToastVisible(false), 2600);
      setAuthRequired(false);
      setError(false);
      setSaveDiagnostic(null);
      onSaved?.(savedDoc);
      window.dispatchEvent(new Event("app-a-vision-candidates-changed"));
      return true;
    } catch (cause) {
      const diagnostic = getVisionSaveDiagnostic(cause);
      setSaved(false);
      setSaveDiagnostic(`${diagnostic.stage} / ${diagnostic.category} / ${diagnostic.firebaseCode}`);
      if (diagnostic.category === "version_conflict" || diagnostic.firebaseCode === "vision_changed_elsewhere") {
        setVersionConflict(true);
        setError(false);
        setAuthRequired(false);
      } else if (diagnostic.category === "unauthenticated") {
        setAuthRequired(true);
      } else {
        setError(true);
      }
      if (SHOW_DEV_DIAGNOSTICS)
        console.error({
          feature: "app_a_vision_save",
          ...diagnostic,
          projectId: "daily-reset-app-a",
          databaseId: "(default)",
          authReady,
          authPresent: Boolean(user),
          uidMatchesPath: user?.uid === userId,
        });
      return false;
    }
  }

  async function signInAndRetrySave() {
    if (!strategy) return;
    setError(false);
    if (onRequestSignIn) await onRequestSignIn();
    else await signInWithGoogle();
    await persistStrategy(strategy, breakdowns);
  }

  async function generateStrategy(goal: string, target = timeframe, details = feasibilityDetails) {
    setSaved(false);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 42_000);
    setLoading(true);
    setError(false);
    setAuthRequired(false);
    try {
      const generated = await createVisionStrategy(goal, language, controller.signal, context(goal, target, details));
      setAcceptedGoal(goal);
      setTimeframe(target);
      setBreakdowns({});
      setStrategy(generated);
      setExpanded(true);
      await persistStrategy(generated, {}, goal, target, details);
    } catch (cause) {
      if (cause instanceof Error && cause.message === "authentication_required") {
        setAuthRequired(true);
      } else {
        setError(true);
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function generate(additionalDetails = feasibilityDetails) {
    setSaved(false);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 42_000);
    setLoading(true);
    setError(false);
    setAuthRequired(false);
    setFeasibility(null);
    try {
      const enrichedIdea = additionalDetails.trim()
        ? `${idea}\n\nUser-provided clarifying details:\n${additionalDetails.trim()}`
        : idea;
      const result = await assessVisionFeasibility(enrichedIdea, timeframe, language, controller.signal);
      if (result.status === "feasible") {
        window.clearTimeout(timeout);
        setLoading(false);
        await generateStrategy(result.normalizedGoal, timeframe, additionalDetails || feasibilityDetails);
        return;
      }
      setFeasibilityDetails(additionalDetails);
      setQuestionAnswers({});
      setFeasibility(result);
    } catch (cause) {
      if (cause instanceof Error && cause.message === "authentication_required") {
        setAuthRequired(true);
      } else {
        setError(true);
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function breakDown(step: string, key: string, depth: 0 | 1 = 0) {
    if (!strategy || checkingStep) return;
    setOpenMenuKey(null);
    setCheckingStep(key);
    setConcreteStep(null);
    setError(false);
    setAuthRequired(false);
    try {
      const result = await decomposeVisionStep({
        idea: acceptedGoal,
        step,
        depth,
        language,
        planningContext: JSON.stringify({
          context: JSON.parse(context()),
          milestones: strategy.milestones,
          existingBreakdowns: breakdowns,
        }),
      });
      if (!result.shouldDecompose || result.reason === "already_actionable" || !result.substeps || result.substeps.length === 0) {
        setConcreteStep(key);
        return;
      }
      // Present AI proposal before saving
      setBreakdownProposal({
        key,
        substeps: result.substeps,
        parentStep: step,
      });
    } catch (cause) {
      if (cause instanceof Error && cause.message === "authentication_required") {
        setAuthRequired(true);
      } else {
        setError(true);
      }
    } finally {
      setCheckingStep(null);
    }
  }

  async function handleAcceptBreakdown(key: string, substeps: string[]) {
    if (!strategy) return;
    const nextBreakdowns = { ...breakdowns, [key]: substeps };
    setBreakdowns(nextBreakdowns);
    setCollapsedKeys((prev) => ({ ...prev, [key]: false }));
    setBreakdownProposal(null);
    await persistStrategy(strategy, nextBreakdowns);
  }

  function handleRejectBreakdown() {
    setBreakdownProposal(null);
  }

  async function saveStepEdit(originalStep: string, key: string) {
    if (!strategy) return;
    const value = editingStepText.trim();
    if (value.length < 3 || value.length > 240) {
      setStepEditError(true);
      return;
    }
    setStepEditError(false);
    const topLevel = key.match(/^m(\d+)-s(\d+)$/);
    if (topLevel) {
      const milestoneIndex = Number(topLevel[1]);
      const stepIndex = Number(topLevel[2]);
      const nextStrategy: VisionStrategyResult = {
        ...strategy,
        nextStep: strategy.nextStep === originalStep ? value : strategy.nextStep,
        milestones: strategy.milestones.map((milestone, index) =>
          index === milestoneIndex
            ? {
                ...milestone,
                steps: milestone.steps.map((step, indexInMilestone) =>
                  indexInMilestone === stepIndex ? value : step
                ),
              }
            : milestone
        ),
      };
      if (await persistStrategy(nextStrategy, breakdowns)) {
        setStrategy(nextStrategy);
        setEditingStep(null);
      }
      return;
    }
    const child = key.match(/^(.*)-d(\d+)$/);
    if (!child) return;
    const parentKey = child[1];
    const childIndex = Number(child[2]);
    const parentSteps = breakdowns[parentKey];
    if (!parentSteps?.[childIndex]) return;
    const nextBreakdowns = {
      ...breakdowns,
      [parentKey]: parentSteps.map((step, index) => (index === childIndex ? value : step)),
    };
    if (await persistStrategy(strategy, nextBreakdowns)) {
      setBreakdowns(nextBreakdowns);
      setEditingStep(null);
    }
  }

  async function saveFeaturedStepEdit() {
    if (!strategy) return;
    const value = editingStepText.trim();
    if (value.length < 3 || value.length > 240) {
      setStepEditError(true);
      return;
    }
    setStepEditError(false);
    const originalStep = strategy.nextStep;
    const nextStrategy: VisionStrategyResult = {
      ...strategy,
      nextStep: value,
      milestones: strategy.milestones.map((milestone, index) =>
        index === 0
          ? {
              ...milestone,
              steps: milestone.steps.map((step, stepIndex) =>
                stepIndex === 0 && step === originalStep ? value : step
              ),
            }
          : milestone
      ),
    };
    if (await persistStrategy(nextStrategy, breakdowns)) {
      setStrategy(nextStrategy);
      setEditingStep(null);
    }
  }

  async function applyRefinement(refinedText: string, syncWithToday: boolean, additionalSubsteps?: string[], key?: string) {
    if (!strategy || !key) return;
    
    let nextStrategy = { ...strategy };
    let nextBreakdowns = { ...breakdowns };

    const topLevel = key.match(/^m(\d+)-s(\d+)$/);
    const child = key.match(/^(.*)-d(\d+)$/);
    
    // Featured step or top-level milestone step
    if (key === "featured-next-step" || topLevel) {
      let milestoneIndex = 0;
      let stepIndex = 0;
      
      if (topLevel) {
        milestoneIndex = Number(topLevel[1]);
        stepIndex = Number(topLevel[2]);
      }
      
      const originalStep = key === "featured-next-step" ? strategy.nextStep : strategy.milestones[milestoneIndex].steps[stepIndex];

      nextStrategy = {
        ...strategy,
        nextStep: (key === "featured-next-step" || (milestoneIndex === 0 && stepIndex === 0 && originalStep === strategy.nextStep)) ? refinedText : strategy.nextStep,
        milestones: strategy.milestones.map((milestone, idx) =>
          idx === milestoneIndex
            ? {
                ...milestone,
                steps: milestone.steps.map((s, sIdx) =>
                  sIdx === stepIndex ? refinedText : s
                ),
              }
            : milestone
        ),
      };
      
      // If AI proposed substeps and it's a top-level step, apply them to breakdowns
      if (additionalSubsteps && additionalSubsteps.length > 0) {
         const mKey = topLevel ? key : `m0-s0`;
         nextBreakdowns = { ...nextBreakdowns, [mKey]: additionalSubsteps };
         setCollapsedKeys((prev) => ({ ...prev, [mKey]: false }));
      }
    } else if (child) {
      const parentKey = child[1];
      const childIndex = Number(child[2]);
      const parentSteps = breakdowns[parentKey];
      if (parentSteps?.[childIndex]) {
        nextBreakdowns = {
          ...breakdowns,
          [parentKey]: parentSteps.map((s, index) => (index === childIndex ? refinedText : s)),
        };
      }
    }

    if (await persistStrategy(nextStrategy, nextBreakdowns)) {
      setStrategy(nextStrategy);
      setBreakdowns(nextBreakdowns);
      
      // If requested, sync with today's plan
      if (syncWithToday && userId) {
        try {
          const localDate = getLocalDateKeyInTimeZone(getEffectiveTimeZone(loadAppAPreferences()));
          // We need to update the plan here... But actually the requirement says: "syncWithToday: boolean"
          // We can dispatch an event for TodayExecutionScreen to pick it up, or directly update the candidate.
          // Since saveTodayCandidate can update it if we know the candidate ID, but we only know the goalId.
          // For now, updating the strategy triggers the listener in TodayExecutionScreen if we dispatch an event, but wait, TodayExecutionScreen doesn't auto-update text.
          // Let's rely on the strategy update propagating, or we can just update the candidate here.
          const candidate = createSequencedVisionCandidate(
            { id: documentId, idea, strategy: nextStrategy, stepBreakdowns: nextBreakdowns, status: 'active', planningContext: { acceptedGoal: acceptedGoal }, language, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), revision: currentRevision } as SavedVisionStrategy,
            0,
            new Date().toISOString()
          );
          if (candidate) {
            // We overwrite the candidate title to the refined text to be absolutely sure.
            candidate.title = refinedText;
            await saveTodayCandidate(userId, candidate);
            window.dispatchEvent(new Event("app-a-vision-candidates-changed"));
          }
        } catch (e) {
          console.error("Failed to sync with today plan", e);
        }
      }
    }
  }

  async function handleAddToTodayPlan() {
    if (!strategy?.nextStep || isAddingToPlan) return;
    setIsAddingToPlan(true);
    try {
      const currentDoc: SavedVisionStrategy = {
        id: documentId,
        idea,
        language,
        strategy,
        stepBreakdowns: breakdowns,
        createdAt: initialDocument?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revision: currentRevision,
        planningContext: {
          acceptedGoal,
          timeframe,
          clarificationDetails: feasibilityDetails,
        },
      };
      const candidate = createSequencedVisionCandidate(currentDoc, 0);
      const localDate = getLocalDateKeyInTimeZone(getEffectiveTimeZone(loadAppAPreferences()));
      const confirmedPlan = await loadConfirmedDailyPlan(userId, localDate);

      if (confirmedPlan) {
        const addResult = addVisionCandidateToPlan(confirmedPlan.plan, candidate);
        if (!("error" in addResult)) {
          await savePlanAndScheduleVisionAtomic(userId, { ...confirmedPlan, plan: addResult.draft }, candidate);
          setIsInTodayPlan(true);
          window.dispatchEvent(new Event("app-a-plan-changed"));
          window.dispatchEvent(new Event("app-a-vision-candidates-changed"));
          return;
        }
      }

      await saveTodayCandidate(userId, candidate);
      setIsInTodayPlan(true);
      window.dispatchEvent(new Event("app-a-vision-candidates-changed"));
    } catch (e) {
      console.error("Failed to add vision candidate to today plan:", e);
    } finally {
      setIsAddingToPlan(false);
    }
  }

  if (!strategy) {
    return (
      <div className="mt-4">
        <label className="block text-[13px] font-semibold text-black dark:text-white">
          {ft.timeframe}
          <input
            value={timeframe}
            maxLength={200}
            onChange={(event) => {
              setTimeframe(event.target.value);
              setSaved(false);
            }}
            placeholder={ft.timeframePlaceholder}
            className="app-a-field app-a-focus-ring mt-2 w-full p-3 text-[15px]"
          />
        </label>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="app-a-secondary-button app-a-focus-ring mt-3 w-full justify-center text-[14px] font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t.loading}
            </>
          ) : (
            <>
              <Route className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" aria-hidden="true" />
              {ft.check}
            </>
          )}
        </button>

        {feasibility ? (
          <div className="app-a-surface mt-4 rounded-2xl border border-black/10 p-5 dark:border-white/15">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-[15px] font-bold text-black dark:text-white">{ft.assessment}</h3>
                <p className="text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{feasibility.reason}</p>
              </div>
            </div>

            {feasibility.assumptions.length ? (
              <ul className="mt-3 list-disc pl-5 text-[12px] text-[#6E6E73] dark:text-[#AEAEB2] space-y-0.5">
                {feasibility.assumptions.map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            ) : null}

            {feasibility.questions.length ? (
              <div className="mt-4 space-y-3 pt-3 border-t border-black/10 dark:border-white/10">
                <p className="text-[13px] font-medium text-black dark:text-white">{ft.needsInfo}</p>
                {feasibility.questions.map((question, index) => (
                  <div
                    key={question}
                    className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <label className="block text-left text-[14px] font-semibold text-black dark:text-white">
                      {index + 1}. {question}
                    </label>
                    <div className="relative mt-2">
                      <textarea
                        value={questionAnswers[question] || ""}
                        onChange={(event) =>
                          setQuestionAnswers((answers) => ({
                            ...answers,
                            [question]: event.target.value,
                          }))
                        }
                        rows={2}
                        maxLength={500}
                        placeholder={ft.detailsPlaceholder}
                        className="app-a-field app-a-focus-ring w-full resize-y rounded-xl p-3 pr-12 text-[15px] font-normal"
                      />
                      <div className="absolute right-2 top-2">
                        <VoiceInputButton
                          language={language}
                          value={questionAnswers[question] || ""}
                          onChange={(val) =>
                            setQuestionAnswers((answers) => ({
                              ...answers,
                              [question]: val,
                            }))
                          }
                          maxLength={500}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={!feasibility.questions.every((question) => questionAnswers[question]?.trim()) || loading}
                  onClick={() => {
                    const details = [
                      feasibilityDetails,
                      ...feasibility.questions.map(
                        (question) => `Question: ${question}\nAnswer: ${questionAnswers[question].trim()}`
                      ),
                    ]
                      .filter(Boolean)
                      .join("\n\n");
                    if (details.length > 4000) {
                      setError(true);
                      return;
                    }
                    setFeasibilityDetails(details);
                    void generate(details);
                  }}
                  className="app-a-primary-button app-a-focus-ring mt-2 w-full justify-center gap-2 py-3 text-[14px] font-semibold disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {ft.recheck}
                </button>
              </div>
            ) : null}

            {feasibility.adjustedGoal ? (
              <button
                type="button"
                onClick={() =>
                  void generateStrategy(
                    feasibility.adjustedGoal || feasibility.normalizedGoal,
                    feasibility.adjustedTimeframe || timeframe
                  )
                }
                className="app-a-primary-button app-a-focus-ring mt-3 w-full justify-center px-4 py-2.5 text-[14px] font-semibold"
              >
                {ft.useAdjusted}: {feasibility.adjustedGoal}
              </button>
            ) : null}
            {feasibility.adjustedTimeframe ? (
              <p className="mt-2 text-[12px] text-[#6E6E73] dark:text-[#AEAEB2]">
                <strong className="text-black dark:text-white">{ft.useTimeframe}:</strong> {feasibility.adjustedTimeframe}
              </p>
            ) : null}
            {feasibility.status !== "insufficient_information" &&
            feasibility.status !== "not_a_vision" &&
            feasibility.status !== "safety_sensitive" ? (
              <button
                type="button"
                onClick={() => void generateStrategy(feasibility.normalizedGoal)}
                className="app-a-secondary-button app-a-focus-ring mt-2 w-full justify-center px-4 py-2.5 text-[13px]"
              >
                {ft.keepOriginal}
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="mt-2 text-[13px] text-[#FF3B30]" role="alert">
            {t.error}
          </p>
        ) : null}
      </div>
    );
  }

  const renderStepItem = (stepText: string, key: string, depth: number) => {
    const hasSubsteps = Boolean(breakdowns[key] && breakdowns[key].length > 0);
    const isCollapsed = Boolean(collapsedKeys[key]);
    const isMenuOpen = openMenuKey === key;
    const isChecking = checkingStep === key;
    const isConcrete = concreteStep === key;
    const isEditing = editingStep === key;

    return (
      <div className="group relative my-1 rounded-xl p-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-1 items-start gap-2">
            {hasSubsteps && (
              <button
                type="button"
                onClick={() => setCollapsedKeys((prev) => ({ ...prev, [key]: !prev[key] }))}
                className="app-a-focus-ring mt-0.5 rounded p-0.5 text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
                aria-label={isCollapsed ? t.show : t.hide}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}

            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div>
                  <input
                    autoFocus
                    value={editingStepText}
                    maxLength={240}
                    onChange={(event) => {
                      setEditingStepText(event.target.value);
                      setStepEditError(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setEditingStep(null);
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveStepEdit(stepText, key);
                      }
                    }}
                    className="app-a-field app-a-focus-ring w-full px-3 py-2 text-[15px]"
                    aria-label={t.editStep}
                  />
                  {stepEditError ? (
                    <p role="alert" className="mt-1 text-[12px] text-[#FF3B30]">
                      {t.stepRequired}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void saveStepEdit(stepText, key)}
                      className="app-a-primary-button min-h-9 px-3 text-[12px]"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {t.saveStep}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStep(null);
                        setStepEditError(false);
                      }}
                      className="app-a-secondary-button min-h-9 px-3 text-[12px]"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t.cancelStep}
                    </button>
                  </div>
                </div>
              ) : (
                <span className="break-words text-[13px] text-[#3A3A3C] dark:text-[#D1D1D6] leading-relaxed">
                  {stepText}
                </span>
              )}

              {hasSubsteps && (
                <span className="ml-2 inline-flex items-center rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                  {t.substepsCount(breakdowns[key].length)}
                </span>
              )}
            </div>
          </div>

          {/* Overflow Menu Button */}
          {!isEditing ? (
            <div className="relative shrink-0" data-step-menu>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuKey((prev) => (prev === key ? null : key));
                }}
                className="app-a-focus-ring rounded-lg p-1 text-[#8E8E93] hover:bg-black/10 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={t.stepOptions}
                aria-expanded={isMenuOpen}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {/* Overflow Dropdown */}
              {isMenuOpen && (
                <div
                  role="menu"
                  className="app-a-surface-elevated absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-black/10 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-[#2C2C2E]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setEditingStep(key);
                      setEditingStepText(stepText);
                      setStepEditError(false);
                      setOpenMenuKey(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
                  >
                    <Pencil className="h-4 w-4 text-[#0071E3] dark:text-[#2997ff]" />
                    {t.editStep}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setRefiningStep({ key, text: stepText });
                      setOpenMenuKey(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
                  >
                    <Sparkles className="h-4 w-4 text-[#AF52DE]" />
                    {t.refineWithAi}
                  </button>
                  {depth < 2 ? (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isChecking}
                      onClick={() => void breakDown(stepText, key, depth as 0 | 1)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5 disabled:opacity-50"
                    >
                      <Split className="h-4 w-4 text-[#0071E3] dark:text-[#2997ff]" />
                      {t.breakDownAction}
                    </button>
                  ) : (
                    <div className="px-3 py-2 text-[12px] text-[#8E8E93]" aria-disabled="true">
                      {t.maxDepthReached}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Status Indicators */}
        {isChecking && (
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#0071E3] dark:text-[#2997ff]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.checking}
          </p>
        )}

        {isConcrete && (
          <p className="mt-1 text-[12px] text-[#1A7F37] dark:text-[#30D158]">
            {t.alreadyActionable}
          </p>
        )}

        {/* Breakdown AI Proposal Confirmation Card */}
        {breakdownProposal && breakdownProposal.key === key && (
          <div className="mt-2.5 rounded-xl border border-[#0071E3]/20 bg-[#0071E3]/5 p-3 dark:border-[#0A84FF]/25 dark:bg-[#0A84FF]/10">
            <p className="text-[12px] font-semibold text-[#0071E3] dark:text-[#0A84FF]">
              {t.breakdownProposalTitle}
            </p>
            <ul className="mt-1.5 space-y-1 pl-4 list-disc text-[13px] text-black dark:text-white">
              {breakdownProposal.substeps.map((sub, sIdx) => (
                <li key={sIdx} className="leading-snug">
                  {sub}
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleAcceptBreakdown(breakdownProposal.key, breakdownProposal.substeps)}
                className="app-a-primary-button min-h-8 px-3 text-[12px] font-semibold"
              >
                <Check className="h-3.5 w-3.5" />
                {t.acceptBreakdown}
              </button>
              <button
                type="button"
                onClick={handleRejectBreakdown}
                className="app-a-secondary-button min-h-8 px-3 text-[12px]"
              >
                <X className="h-3.5 w-3.5" />
                {t.rejectBreakdown}
              </button>
            </div>
          </div>
        )}

        {/* Substeps Container */}
        {hasSubsteps && !isCollapsed && (
          <div className="mt-2 border-l-2 border-black/10 pl-3 dark:border-white/15 space-y-1">
            {breakdowns[key].map((substep, subIdx) => {
              const childKey = `${key}-d${subIdx}`;
              return <div key={childKey}>{renderStepItem(substep, childKey, depth + 1)}</div>;
            })}
          </div>
        )}
      </div>
    );
  };

  const totalMilestonesCount = strategy.milestones.length;
  const totalRisksCount = (strategy.risks?.length || 0) + (strategy.assumptions?.length || 0);

  return (
    <div className="mt-2">
      {/* 1. TOP TOGGLE STRATEGY / TRANSIENT SAVED TOAST */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0071E3] dark:text-[#0A84FF]"
        >
          {expanded ? t.hide : t.show}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Transient Saved Indicator - Never takes permanent header space */}
        {savedToastVisible ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#34C759]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#248A3D] dark:text-[#30D158] transition-opacity animate-in fade-in duration-200">
            <Check className="h-3 w-3" />
            {t.savedToast}
          </span>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-4 space-y-5">
          {/* 2. ZAMISLI / OUTCOME */}
          <section className="rounded-2xl border border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[#AF52DE]">
              <Sparkles className="h-3.5 w-3.5" />
              {t.imagine}
            </h3>
            <p className="mt-1.5 break-words text-[15px] font-medium text-black dark:text-white leading-relaxed">
              {strategy.outcome}
            </p>
            {strategy.importance ? (
              <p className="mt-1 break-words text-[13px] text-[#6E6E73] dark:text-[#AEAEB2] leading-relaxed">
                <strong className="font-semibold text-black dark:text-white">{t.why}:</strong> {strategy.importance}
              </p>
            ) : null}
          </section>

          {/* 3. SLEDEĆI KONKRETAN KORAK (FEATURED NEXT STEP CARD) */}
          <section
            className="app-a-surface rounded-2xl border border-black/10 p-4 text-black dark:border-white/15 dark:text-white sm:p-5"
            aria-labelledby="featured-next-step-heading"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                <h3
                  id="featured-next-step-heading"
                  className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#0071E3] dark:text-[#0A84FF]"
                >
                  {t.next}
                </h3>
              </div>

              {/* Step Options Menu */}
              <div className="relative" data-step-menu>
                <button
                  type="button"
                  aria-label={t.stepOptions}
                  aria-expanded={openMenuKey === "featured-next-step"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuKey((prev) => (prev === "featured-next-step" ? null : "featured-next-step"));
                  }}
                  className="app-a-focus-ring rounded-lg p-1 text-[#8E8E93] hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {openMenuKey === "featured-next-step" ? (
                  <div
                    role="menu"
                    className="app-a-surface-elevated absolute right-0 top-full z-20 mt-1 min-w-[190px] rounded-xl border border-black/10 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-[#2C2C2E]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={checkingStep === "featured-next-step"}
                      onClick={() => {
                        setOpenMenuKey(null);
                        void breakDown(strategy.nextStep, "m0-s0", 0);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5 disabled:opacity-50"
                    >
                      <Split className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" />
                      {t.breakDownAction}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Next step text or editing input */}
            {editingStep === "featured-next-step" ? (
              <div className="mt-3">
                <input
                  autoFocus
                  value={editingStepText}
                  maxLength={240}
                  onChange={(event) => {
                    setEditingStepText(event.target.value);
                    setStepEditError(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setEditingStep(null);
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveFeaturedStepEdit();
                    }
                  }}
                  className="app-a-field app-a-focus-ring w-full px-3 py-2 text-[15px]"
                  aria-label={t.editStep}
                />
                {stepEditError ? (
                  <p role="alert" className="mt-1 text-[12px] text-[#FF3B30]">
                    {t.stepRequired}
                  </p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveFeaturedStepEdit()}
                    className="app-a-primary-button min-h-9 px-3 text-[12px] font-semibold"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {t.saveStep}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStep(null);
                      setStepEditError(false);
                    }}
                    className="app-a-secondary-button min-h-9 px-3 text-[12px]"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t.cancelStep}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 break-words text-[15px] sm:text-[16px] font-semibold text-black dark:text-white leading-snug">
                {strategy.nextStep}
              </p>
            )}

            {/* Breakdown proposal confirmation card for featured step */}
            {breakdownProposal && breakdownProposal.key === "m0-s0" && (
              <div className="mt-2.5 rounded-xl border border-[#0071E3]/20 bg-[#0071E3]/5 p-3 dark:border-[#0A84FF]/25 dark:bg-[#0A84FF]/10">
                <p className="text-[12px] font-semibold text-[#0071E3] dark:text-[#0A84FF]">
                  {t.breakdownProposalTitle}
                </p>
                <ul className="mt-1.5 space-y-1 pl-4 list-disc text-[13px] text-black dark:text-white">
                  {breakdownProposal.substeps.map((sub, sIdx) => (
                    <li key={sIdx} className="leading-snug">
                      {sub}
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleAcceptBreakdown(breakdownProposal.key, breakdownProposal.substeps)}
                    className="app-a-primary-button min-h-8 px-3 text-[12px] font-semibold"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {t.acceptBreakdown}
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectBreakdown}
                    className="app-a-secondary-button min-h-8 px-3 text-[12px]"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t.rejectBreakdown}
                  </button>
                </div>
              </div>
            )}

            {/* Helper note */}
            <p className="mt-2 text-[12px] text-[#6E6E73] dark:text-[#AEAEB2] leading-relaxed">
              {t.nextHelper}
            </p>

            {/* DIRECT ACTIONS ROW */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-black/[0.06] dark:border-white/10">
              {isInTodayPlan ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#34C759]/10 px-3 py-2 text-[12px] font-semibold text-[#248A3D] dark:text-[#30D158]">
                  <Check className="h-3.5 w-3.5" />
                  {t.inTodayPlan}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isAddingToPlan}
                  onClick={() => void handleAddToTodayPlan()}
                  className="app-a-primary-button app-a-focus-ring px-3.5 py-2 text-[13px] font-semibold gap-1.5"
                >
                  {isAddingToPlan ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {t.addToTodayPlan}
                </button>
              )}

              <button
                type="button"
                onClick={() => setRefiningStep({ key: "featured-next-step", text: strategy.nextStep })}
                className="app-a-secondary-button app-a-focus-ring px-3.5 py-2 text-[13px] font-semibold gap-1.5 text-[#AF52DE]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="sm:hidden">{t.refineWithAi}</span>
                <span className="hidden sm:inline">{t.refineWithAi}</span>
              </button>
            </div>
          </section>

          {/* 4. CELA PUTANJA (COLLAPSIBLE / COMPACT MILESTONE ROWS) */}
          <section className="app-a-surface rounded-2xl border border-black/10 overflow-hidden dark:border-white/15">
            <button
              type="button"
              onClick={() => setIsFullPathOpen((prev) => !prev)}
              aria-expanded={isFullPathOpen}
              className="app-a-focus-ring flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-2 text-[14px] font-semibold text-black dark:text-white">
                <Route className="h-4 w-4 text-[#0071E3] dark:text-[#0A84FF]" />
                {t.fullPath(totalMilestonesCount)}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[#8E8E93] transition-transform ${
                  isFullPathOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isFullPathOpen ? (
              <div className="border-t border-black/[0.06] p-3 space-y-2 dark:border-white/10">
                {strategy.milestones.map((milestone, index) => {
                  const isMilestoneOpen = Boolean(openMilestones[index]);
                  return (
                    <div
                      key={`${milestone.title}-${index}`}
                      className="rounded-xl border border-black/[0.08] bg-white/70 overflow-hidden dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      {/* Compact milestone row header */}
                      <button
                        type="button"
                        onClick={() => toggleMilestone(index)}
                        aria-expanded={isMilestoneOpen}
                        className="app-a-focus-ring flex min-h-[48px] w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-[11px] font-bold text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block line-clamp-2 break-words text-[13px] font-semibold text-black dark:text-white leading-snug">
                              {milestone.title}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] font-medium text-[#8E8E93] dark:bg-white/10">
                            {t.milestoneStepsCount(milestone.steps.length)}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-[#8E8E93] transition-transform ${
                              isMilestoneOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Expanded milestone content: result + individual steps */}
                      {isMilestoneOpen ? (
                        <div className="border-t border-black/[0.06] px-3.5 py-3 dark:border-white/10 space-y-2.5">
                          {milestone.result ? (
                            <p className="break-words text-[12px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2] bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-lg">
                              {milestone.result}
                            </p>
                          ) : null}

                          <div className="space-y-1">
                            {milestone.steps.map((step, stepIndex) => {
                              const key = `m${index}-s${stepIndex}`;
                              return <div key={key}>{renderStepItem(step, key, 0)}</div>;
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          {/* 5. RIZICI I PRETPOSTAVKE (COLLAPSIBLE / COMPACT) */}
          {totalRisksCount > 0 ? (
            <section className="app-a-surface rounded-2xl border border-black/10 overflow-hidden dark:border-white/15">
              <button
                type="button"
                onClick={() => setIsRisksOpen((prev) => !prev)}
                aria-expanded={isRisksOpen}
                className="app-a-focus-ring flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="h-4 w-4 text-[#1A7F37] dark:text-[#30D158] shrink-0" />
                  <span className="text-[14px] font-semibold text-black dark:text-white">
                    {t.risksAndAssumptions}
                  </span>
                  <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] font-medium text-[#8E8E93] dark:bg-white/10">
                    {totalRisksCount}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-[#8E8E93] transition-transform ${
                    isRisksOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isRisksOpen ? (
                <div className="border-t border-black/[0.06] p-4 dark:border-white/10 space-y-3">
                  {strategy.risks?.length ? (
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#FF9500]">
                        {t.risks}
                      </p>
                      <ul className="mt-1.5 list-disc pl-5 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2] space-y-1">
                        {strategy.risks.map((risk) => (
                          <li key={risk} className="break-words leading-relaxed">
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {strategy.assumptions?.length ? (
                    <div className={strategy.risks?.length ? "pt-2 border-t border-black/[0.06] dark:border-white/10" : ""}>
                      <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0071E3] dark:text-[#0A84FF]">
                        {t.assumptions}
                      </p>
                      <ul className="mt-1.5 list-disc pl-5 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2] space-y-1">
                        {strategy.assumptions.map((assumption) => (
                          <li key={assumption} className="break-words leading-relaxed">
                            {assumption}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {/* 6. CONFLICT / ALERT WARNINGS */}
          {versionConflict ? (
            <div
              role="alert"
              className="space-y-2.5 rounded-2xl border p-4 text-[13px] transition-colors border-[#FF9500]/30 bg-[#FF9500]/[0.08]"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#FF9500] shrink-0" />
                <p className="font-bold text-[14px] text-black dark:text-white">
                  {language === "sr"
                    ? "Ova vizija je promenjena na drugom mestu"
                    : language === "tr"
                    ? "Bu vizyon başka bir yerde değiştirildi"
                    : "This vision was modified elsewhere"}
                </p>
              </div>
              <p className="text-[12px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                {language === "sr"
                  ? "Vaše lokalne izmene su sačuvane ovde u uređivaču. Da biste sprečili nenamerno prepisivanje, sinhronizujte verziju pre ponovnog čuvanja."
                  : language === "tr"
                  ? "Yerel düzenlemeleriniz korundu. Üzerine yazmayı önlemek için lütfen tekrar kaydetmeden önce sürümü eşitleyin."
                  : "Your local changes are retained in this editor. To prevent overwriting other changes, sync the latest version before saving again."}
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const library = await loadVisionLibrary(userId);
                    const latest = library.strategies.find((s) => s.id === documentId);
                    if (latest) {
                      setCurrentRevision(latest.revision);
                      setVersionConflict(false);
                    }
                  } catch {
                    // ignore
                  }
                }}
                className="app-a-secondary-button app-a-focus-ring mt-1 px-3.5 py-1.5 text-[12px] font-semibold"
              >
                {language === "sr" ? "Sinhronizuj verziju" : language === "tr" ? "Sürümü eşitle" : "Sync latest version"}
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="space-y-1 text-[13px] text-[#FF3B30]" role="alert">
              <p>{t.saveError}</p>
              <p className="font-medium">{t.notSaved}</p>
              {SHOW_DEV_DIAGNOSTICS && saveDiagnostic ? (
                <p className="font-mono text-[11px]">Save diagnostic: {saveDiagnostic}</p>
              ) : null}
            </div>
          ) : null}

          {authRequired ? (
            <div className="space-y-2" role="alert">
              <p className="text-[13px] text-[#FF3B30]">{t.signInToSave}</p>
              <button
                type="button"
                onClick={() => void signInAndRetrySave()}
                className="app-a-secondary-button app-a-focus-ring px-4 text-[13px]"
              >
                {t.retrySave}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {refiningStep ? (
        <VisionStepRefineModal
          stepKey={refiningStep.key}
          stepText={refiningStep.text}
          visionIdea={acceptedGoal}
          visionOutcome={strategy.outcome}
          visionTimeframe={timeframe}
          language={language}
          isInTodayPlan={refiningStep.key === "featured-next-step" ? isInTodayPlan : false}
          onApplyRefinement={(refinedText, syncWithToday, substeps) => applyRefinement(refinedText, syncWithToday, substeps, refiningStep.key)}
          onManualEdit={(text) => {
            setEditingStep(refiningStep.key);
            setEditingStepText(text);
          }}
          onClose={() => setRefiningStep(null)}
        />
      ) : null}
    </div>
  );
}
