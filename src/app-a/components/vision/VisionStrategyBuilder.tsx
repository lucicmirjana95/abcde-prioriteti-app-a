import { useState, useEffect } from "react";
import { readSessionDraft, writeSessionDraft } from '../../persistence/sessionDraft';
import { visionStepKey } from '../../../shared/domain/today-candidates';
import { isVisionStrategyResult, isVisionFeasibilityResult } from '../../../shared/domain/vision';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  MoreHorizontal,
  Pencil,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  Split,
  X,
} from "lucide-react";
import type { VisionFeasibilityResult, VisionStrategyResult } from "../../../shared/domain/vision";
import { assessVisionFeasibility, createVisionStrategy, decomposeVisionStep } from "../../api/visionStrategyApi";
import type { AppALanguage } from "../../types";
import { useAppAAuth } from "../../auth/useAppAAuth";
import { createVisionStrategyId, type SavedVisionStrategy } from "../../../shared/domain/vision";
import { getVisionSaveDiagnostic, loadVisionLibrary, saveVisionStrategy } from "../../../shared/persistence/vision";

const SHOW_DEV_DIAGNOSTICS = typeof window !== "undefined" &&
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
  return !!draft && draft.saved === false && /^vision_[a-z0-9_]{4,80}$/.test(draft.documentId) &&
    (!draft.strategy || isVisionStrategyResult(draft.strategy)) && (!draft.feasibility || isVisionFeasibilityResult(draft.feasibility)) &&
    typeof draft.timeframe === 'string' && draft.timeframe.length <= 200 && typeof draft.acceptedGoal === 'string' &&
    typeof draft.feasibilityDetails === 'string' && draft.feasibilityDetails.length <= 4000 &&
    !!draft.questionAnswers && Object.values(draft.questionAnswers).every(answer => typeof answer === 'string' && answer.length <= 500) &&
    !!draft.breakdowns && Object.values(draft.breakdowns).every(steps => Array.isArray(steps) && steps.every(step => typeof step === 'string'));
}

const COPY = {
  en: {
    develop: "Develop this direction",
    loading: "Turning the idea into a practical path…",
    error: "The direction could not be developed. Try again.",
    saveError: "The strategy could not be saved.",
    signInToSave: "Your strategy is kept on this screen. Sign in again to save it.",
    retrySave: "Sign in and save again",
    saved: "Saved",
    notSaved: "Not saved — try again",
    imagine: "Imagine",
    plan: "Plan",
    check: "Check",
    why: "Why it matters",
    risks: "Risks",
    assumptions: "Assumptions to verify",
    next: "Smallest useful next step",
    hide: "Hide strategy",
    show: "Show strategy",
    breakDownAction: "Break into smaller steps",
    checking: "Checking usefulness…",
    alreadyActionable: "This step is already concrete enough to begin.",
    maxDepthReached: "Maximum breakdown depth reached.",
    nextFlow: "This step appears automatically in Today. You decide whether to add it to the daily plan. The following step appears after this one is completed.",
    stepOptions: "Step options",
    editStep: "Edit this step",
    saveStep: "Save step",
    cancelStep: "Cancel",
    stepRequired: "Enter a concrete step (3–240 characters).",
    substepsCount: (count: number) => `${count} step${count === 1 ? "" : "s"}`,
  },
  sr: {
    develop: "Razradi ovaj pravac",
    loading: "Pretvaram ideju u praktičan put…",
    error: "Pravac nije mogao da se razradi. Pokušajte ponovo.",
    saveError: "Strategija nije mogla da se sačuva.",
    signInToSave: "Strategija ostaje na ovom ekranu. Prijavite se ponovo da biste je sačuvali.",
    retrySave: "Prijavi se i sačuvaj ponovo",
    saved: "Sačuvano",
    notSaved: "Nije sačuvano — pokušajte ponovo",
    imagine: "Zamisli",
    plan: "Isplaniraj",
    check: "Proveri",
    why: "Zašto je važno",
    risks: "Rizici",
    assumptions: "Pretpostavke koje treba proveriti",
    next: "Najmanji koristan sledeći korak",
    hide: "Sakrij strategiju",
    show: "Prikaži strategiju",
    breakDownAction: "Podeli na manje korake",
    checking: "Proveravam korisnost…",
    alreadyActionable: "Ovaj korak je već dovoljno konkretan za početak.",
    maxDepthReached: "Maksimalan nivo raščlanjivanja je dostignut.",
    nextFlow: "Ovaj korak se automatski pojavljuje u odeljku Danas. Vi birate da li ćete ga dodati u dnevni plan. Naredni korak se pojavljuje kada završite ovaj.",
    stepOptions: "Opcije koraka",
    editStep: "Izmeni ovaj korak",
    saveStep: "Sačuvaj korak",
    cancelStep: "Otkaži",
    stepRequired: "Unesite konkretan korak (3–240 znakova).",
    substepsCount: (count: number) => `${count} korak${count === 1 ? "" : count < 5 ? "a" : "a"}`,
  },
  tr: {
    develop: "Bu yönü geliştir",
    loading: "Fikir uygulanabilir bir yola dönüştürülüyor…",
    error: "Yön geliştirilemedi. Tekrar deneyin.",
    saveError: "Strateji kaydedilemedi.",
    signInToSave: "Stratejiniz bu ekranda tutuluyor. Kaydetmek için tekrar giriş yapın.",
    retrySave: "Giriş yap ve tekrar kaydet",
    saved: "Kaydedildi",
    notSaved: "Kaydedilmedi — tekrar deneyin",
    imagine: "Hayal et",
    plan: "Planla",
    check: "Kontrol et",
    why: "Neden önemli",
    risks: "Riskler",
    assumptions: "Doğrulanacak varsayımlar",
    next: "En küçük yararlı sonraki adım",
    hide: "Stratejiyi gizle",
    show: "Stratejiyi göster",
    breakDownAction: "Daha küçük adımlara böl",
    checking: "Yararlılık kontrol ediliyor…",
    alreadyActionable: "Bu adım başlamak için zaten yeterince somut.",
    maxDepthReached: "Maksimum ayrıştırma derinliğine ulaşıldı.",
    nextFlow: "Bu adım Bugün bölümünde otomatik olarak görünür. Günlük plana ekleyip eklememeye siz karar verirsiniz. Sonraki adım, bunu tamamladığınızda görünür.",
    stepOptions: "Adım seçenekleri",
    editStep: "Bu adımı düzenle",
    saveStep: "Adımı kaydet",
    cancelStep: "İptal",
    stepRequired: "Somut bir adım girin (3–240 karakter).",
    substepsCount: (count: number) => `${count} adım`,
  },
} as const;

const FEASIBILITY_COPY = {
  en: { timeframe: "Desired timeframe (optional)", timeframePlaceholder: "e.g. 12 months", check: "Check feasibility and develop", assessment: "Feasibility check", useAdjusted: "Use realistic version", keepOriginal: "Keep original goal", useTimeframe: "Suggested timeframe", needsInfo: "Answer the questions below. Your answers will be added to this Vision direction and checked again.", detailsLabel: "Your missing details", detailsPlaceholder: "Answer briefly in the same order…", recheck: "Add details and check again" },
  sr: { timeframe: "Željeni rok (opciono)", timeframePlaceholder: "npr. 12 meseci", check: "Proveri izvodljivost i razradi", assessment: "Provera izvodljivosti", useAdjusted: "Koristi realniju verziju", keepOriginal: "Zadrži originalni cilj", useTimeframe: "Predloženi rok", needsInfo: "Odgovorite na pitanja ispod. Odgovori će biti dodati ovom pravcu Vizije i ponovo provereni.", detailsLabel: "Podaci koji nedostaju", detailsPlaceholder: "Odgovorite kratko, istim redosledom…", recheck: "Dodaj odgovore i proveri ponovo" },
  tr: { timeframe: "İstenen süre (isteğe bağlı)", timeframePlaceholder: "örn. 12 ay", check: "Uygulanabilirliği kontrol et ve geliştir", assessment: "Uygulanabilirlik kontrolü", useAdjusted: "Gerçekçi sürümü kullan", keepOriginal: "Orijinal hedefi koru", useTimeframe: "Önerilen süre", needsInfo: "Aşağıdaki soruları yanıtlayın. Yanıtlar bu Vizyon yönüne eklenip yeniden kontrol edilir.", detailsLabel: "Eksik bilgileriniz", detailsPlaceholder: "Aynı sırayla kısaca yanıtlayın…", recheck: "Bilgileri ekle ve tekrar kontrol et" },
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
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editingStepText, setEditingStepText] = useState("");
  const [stepEditError, setStepEditError] = useState(false);
  const [saved, setSaved] = useState(Boolean(initialDocument) && !working);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [expandedMilestone, setExpandedMilestone] = useState(0);
  const [timeframe, setTimeframe] = useState(working?.timeframe || initialDocument?.planningContext?.timeframe || "");
  const [feasibility, setFeasibility] = useState<VisionFeasibilityResult | null>(working?.feasibility || null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>(working?.questionAnswers || {});
  const [feasibilityDetails, setFeasibilityDetails] = useState(working?.feasibilityDetails || initialDocument?.planningContext?.clarificationDetails || "");
  const [saveDiagnostic, setSaveDiagnostic] = useState<string | null>(null);
  const [acceptedGoal, setAcceptedGoal] = useState(working?.acceptedGoal || initialDocument?.planningContext?.acceptedGoal || idea);
  const [currentRevision, setCurrentRevision] = useState<number | undefined>(initialDocument?.revision);
  const [versionConflict, setVersionConflict] = useState(false);
  useEffect(() => {
    writeSessionDraft(workingKey, { documentId, strategy, breakdowns, timeframe, acceptedGoal, feasibility, feasibilityDetails, questionAnswers, saved });
  }, [workingKey, documentId, strategy, breakdowns, timeframe, acceptedGoal, feasibility, feasibilityDetails, questionAnswers, saved]);
  const context = (goal = acceptedGoal, target = timeframe, details = feasibilityDetails) => JSON.stringify({ originalGoal: idea, acceptedGoal: goal, timeframe: target || null, userClarifications: details || null });

  async function persistStrategy(currentStrategy: VisionStrategyResult, currentBreakdowns: Record<string, string[]>, goal = acceptedGoal, target = timeframe, details = feasibilityDetails) {
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
      planningContext: { acceptedGoal: goal, ...(target.trim() ? { timeframe: target.trim() } : {}), ...(details.trim() ? { clarificationDetails: details.trim() } : {}) },
      ...(initialDocument?.archivedAt ? { archivedAt: initialDocument.archivedAt } : {}),
    };
    try {
      const savedDoc = await saveVisionStrategy(userId, document);
      setCurrentRevision(savedDoc.revision);
      setVersionConflict(false);
      setSaved(true);
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
      if (SHOW_DEV_DIAGNOSTICS) console.error({ feature: "app_a_vision_save", ...diagnostic, projectId: "daily-reset-app-a", databaseId: "(default)", authReady, authPresent: Boolean(user), uidMatchesPath: user?.uid === userId });
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
    } catch {
      setError(true);
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
    } catch {
      setError(true);
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
      const result = await decomposeVisionStep({ idea: acceptedGoal, step, depth, language, planningContext: JSON.stringify({ context: JSON.parse(context()), milestones: strategy.milestones, existingBreakdowns: breakdowns }) });
      if (!result.shouldDecompose || result.reason === "already_actionable") {
        setConcreteStep(key);
        return;
      }
      const nextBreakdowns = { ...breakdowns, [key]: result.substeps };
      setBreakdowns(nextBreakdowns);
      setCollapsedKeys((prev) => ({ ...prev, [key]: false }));
      await persistStrategy(strategy, nextBreakdowns);
    } catch {
      setError(true);
    } finally {
      setCheckingStep(null);
    }
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
        milestones: strategy.milestones.map((milestone, index) => index === milestoneIndex ? {
          ...milestone,
          steps: milestone.steps.map((step, indexInMilestone) => indexInMilestone === stepIndex ? value : step),
        } : milestone),
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
      [parentKey]: parentSteps.map((step, index) => index === childIndex ? value : step),
    };
    if (await persistStrategy(strategy, nextBreakdowns)) {
      setBreakdowns(nextBreakdowns);
      setEditingStep(null);
    }
  }

  if (!strategy) {
    return (
      <div className="mt-4">
        <label className="block text-[13px] font-semibold">
          {ft.timeframe}
          <input
            value={timeframe}
            maxLength={200}
            onChange={(event) => { setTimeframe(event.target.value); setSaved(false); }}
            placeholder={ft.timeframePlaceholder}
            className="app-a-field app-a-focus-ring mt-2 w-full p-3"
          />
        </label>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="app-a-secondary-button mt-3 w-full justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t.loading}
            </>
          ) : (
            <>
              <Route className="h-4 w-4" aria-hidden="true" />
              {ft.check}
            </>
          )}
        </button>
        {feasibility ? (
          <div className="mt-3 rounded-[14px] border border-amber-500/25 bg-amber-500/10 p-4">
            <h3 className="text-[14px] font-semibold">{ft.assessment}</h3>
            <p className="mt-2 text-[13px] leading-relaxed">{feasibility.reason}</p>
            {feasibility.assumptions.length ? (
              <ul className="mt-2 list-disc pl-5 text-[12px] text-[#6E6E73] dark:text-[#AEAEB2]">
                {feasibility.assumptions.map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            ) : null}
            {feasibility.questions.length ? (
              <>
                <p className="mt-2 text-[14px]">{ft.needsInfo}</p>
                {feasibility.questions.map((question, index) => <label key={question} className="mt-4 block text-left text-[15px] font-medium">
                  {index + 1}. {question}
                  <textarea
                    value={questionAnswers[question] || ""}
                    onChange={event => setQuestionAnswers(answers => ({ ...answers, [question]: event.target.value }))}
                    rows={2}
                    maxLength={500}
                    className="app-a-field app-a-focus-ring mt-2 w-full resize-y p-3 text-[16px] font-normal"
                  />
                </label>)}
                <button
                  type="button"
                  disabled={!feasibility.questions.every(question => questionAnswers[question]?.trim()) || loading}
                  onClick={() => {
                    const details = [feasibilityDetails, ...feasibility.questions.map(question => `Question: ${question}\nAnswer: ${questionAnswers[question].trim()}`)].filter(Boolean).join("\n\n");
                    if (details.length > 4000) { setError(true); return; }
                    setFeasibilityDetails(details);
                    void generate(details);
                  }}
                  className="app-a-primary-button app-a-focus-ring mt-3 w-full px-4 disabled:opacity-50"
                >
                  {ft.recheck}
                </button>
              </>
            ) : null}
            {feasibility.adjustedGoal ? (
              <button
                type="button"
                onClick={() => void generateStrategy(feasibility.adjustedGoal || feasibility.normalizedGoal, feasibility.adjustedTimeframe || timeframe)}
                className="app-a-primary-button app-a-focus-ring mt-3 w-full px-4"
              >
                {ft.useAdjusted}: {feasibility.adjustedGoal}
              </button>
            ) : null}
            {feasibility.adjustedTimeframe ? (
              <p className="mt-2 text-[12px]">
                <strong>{ft.useTimeframe}:</strong> {feasibility.adjustedTimeframe}
              </p>
            ) : null}
            {feasibility.status !== "insufficient_information" && feasibility.status !== "not_a_vision" && feasibility.status !== "safety_sensitive" ? (
              <button
                type="button"
                onClick={() => void generateStrategy(feasibility.normalizedGoal)}
                className="app-a-secondary-button app-a-focus-ring mt-2 w-full px-4"
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
      <div className="group relative my-1 rounded-lg p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
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
              {isEditing ? <div>
                <input autoFocus value={editingStepText} maxLength={240} onChange={event => { setEditingStepText(event.target.value); setStepEditError(false); }} onKeyDown={event => { if (event.key === "Escape") setEditingStep(null); if (event.key === "Enter") { event.preventDefault(); void saveStepEdit(stepText, key); } }} className="app-a-field app-a-focus-ring w-full px-3 py-2 text-[14px]" aria-label={t.editStep} />
                {stepEditError ? <p role="alert" className="mt-1 text-[12px] text-[#FF3B30]">{t.stepRequired}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => void saveStepEdit(stepText, key)} className="app-a-primary-button min-h-10 px-3 text-[12px]"><Save className="h-3.5 w-3.5" />{t.saveStep}</button><button type="button" onClick={() => { setEditingStep(null); setStepEditError(false); }} className="app-a-secondary-button min-h-10 px-3 text-[12px]"><X className="h-3.5 w-3.5" />{t.cancelStep}</button></div>
              </div> : <span className="text-[13px] text-[#3A3A3C] dark:text-[#D1D1D6]">{stepText}</span>}

              {hasSubsteps && (
                <span className="ml-2 inline-flex items-center rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                  {t.substepsCount(breakdowns[key].length)}
                </span>
              )}
            </div>
          </div>

          {/* Overflow Menu Button */}
          {!isEditing ? <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenMenuKey((prev) => (prev === key ? null : key))}
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
                  onClick={() => { setEditingStep(key); setEditingStepText(stepText); setStepEditError(false); setOpenMenuKey(null); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
                >
                  <Pencil className="h-4 w-4 text-[#0071E3] dark:text-[#2997ff]" />
                  {t.editStep}
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
          </div> : null}
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

  return (
    <div className="mt-4 border-t border-black/5 pt-4 dark:border-white/10">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between text-[13px] font-semibold text-[#0071E3] dark:text-[#0A84FF]"
      >
        {expanded ? t.hide : t.show}
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded ? (
        <div className="mt-4 space-y-5">
          <section>
            <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-[#AF52DE]">
              <Sparkles className="h-4 w-4" />
              {t.imagine}
            </h3>
            <p className="mt-2 text-[15px] font-medium text-black dark:text-white">{strategy.outcome}</p>
            <p className="mt-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
              <strong>{t.why}:</strong> {strategy.importance}
            </p>
          </section>

          <div className="rounded-[16px] border-2 border-[#0071E3]/25 bg-[#0071E3]/8 p-4 text-[14px] text-black dark:border-[#0A84FF]/35 dark:bg-[#0A84FF]/15 dark:text-white">
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.07em] text-[#0071E3] dark:text-[#0A84FF]">{t.next}</p>
            <p className="text-[15px] font-semibold leading-relaxed">{strategy.nextStep}</p>
            {saved ? <p className="mt-2 text-[13px] leading-relaxed text-[#3C3C43] dark:text-[#D1D1D6]">{t.nextFlow}</p> : null}
          </div>

          <section>
            <h3 className="flex items-center justify-between text-[13px] font-semibold uppercase tracking-[0.07em] text-[#0071E3] dark:text-[#0A84FF]">
              <span>{t.plan}</span>
              {saved ? (
                <span className="flex items-center gap-1 normal-case tracking-normal text-[#1A7F37] dark:text-[#30D158]">
                  <Save className="h-3.5 w-3.5" />
                  {t.saved}
                </span>
              ) : null}
            </h3>

            <ol className="mt-3 space-y-3">
              {strategy.milestones.map((milestone, index) => (
                <li key={`${milestone.title}-${index}`} className="overflow-hidden rounded-[14px] border border-black/10 bg-white/70 dark:border-white/15 dark:bg-white/5">
                  <button type="button" onClick={() => setExpandedMilestone((current) => current === index ? -1 : index)} className="app-a-focus-ring flex min-h-14 w-full items-start justify-between gap-3 p-3 text-left" aria-expanded={expandedMilestone === index}>
                    <span><span className="block text-[14px] font-semibold text-black dark:text-white">{index + 1}. {milestone.title}</span><span className="mt-0.5 block text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{milestone.result}</span></span>
                    {expandedMilestone === index ? <ChevronUp className="mt-0.5 h-5 w-5 shrink-0 text-[#0071E3]" /> : <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-[#8E8E93]" />}
                  </button>

                  {expandedMilestone === index ? <div className="space-y-1 border-t border-black/10 px-3 py-2 dark:border-white/10">
                    {milestone.steps.map((step, stepIndex) => {
                      const key = `m${index}-s${stepIndex}`;
                      return <div key={key}>{renderStepItem(step, key, 0)}</div>;
                    })}
                  </div> : null}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-[#1A7F37] dark:text-[#30D158]">
              <ShieldCheck className="h-4 w-4" />
              {t.check}
            </h3>
            {strategy.risks.length ? (
              <>
                <p className="mt-2 text-[13px] font-semibold">{t.risks}</p>
                <ul className="list-disc pl-5 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
                  {strategy.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {strategy.assumptions.length ? (
              <>
                <p className="mt-2 text-[13px] font-semibold">{t.assumptions}</p>
                <ul className="list-disc pl-5 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
                  {strategy.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          {versionConflict ? (
            <div role="alert" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-[13px] text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">
                {language === "sr"
                  ? "Ova vizija je promenjena na drugom mestu (druga kartica ili uređaj)."
                  : language === "tr"
                  ? "Bu vizyon başka bir yerde değiştirildi."
                  : "This vision was modified elsewhere (another tab or device)."}
              </p>
              <p className="text-[12px] leading-relaxed opacity-90">
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
                className="app-a-secondary-button app-a-focus-ring mt-1 px-3 py-1 text-[12px] font-semibold"
              >
                {language === "sr" ? "Sinhronizuj verziju" : language === "tr" ? "Sürümü eşitle" : "Sync latest version"}
              </button>
            </div>
          ) : null}
          {error ? (
            <div className="space-y-1 text-[13px] text-[#FF3B30]" role="alert">
              <p>{t.saveError}</p>
              <p className="font-medium">{t.notSaved}</p>
              {SHOW_DEV_DIAGNOSTICS && saveDiagnostic ? <p className="font-mono text-[11px]">Save diagnostic: {saveDiagnostic}</p> : null}
            </div>
          ) : null}
          {authRequired ? <div className="space-y-2" role="alert"><p className="text-[13px]" style={{ color: "var(--app-a-danger)" }}>{t.signInToSave}</p><button type="button" onClick={() => void signInAndRetrySave()} className="app-a-secondary-button app-a-focus-ring px-4 text-[13px]">{t.retrySave}</button></div> : null}
        </div>
      ) : null}
    </div>
  );
}
