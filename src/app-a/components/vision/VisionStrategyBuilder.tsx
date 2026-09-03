import { useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  MoreHorizontal,
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
import { getVisionSaveDiagnostic, saveVisionStrategy } from "../../../shared/persistence/vision";
import { createTodayCandidateId, type TodayCandidate } from "../../../shared/domain/today-candidates";
import { saveTodayCandidate } from "../../../shared/persistence/today-candidates";

const SHOW_DEV_DIAGNOSTICS = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname.startsWith("ais-"));

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
    send: "Send to Today",
    confirmTitle: "Send this next step to Today?",
    confirmHelp: "It will be saved under Today without changing your confirmed plan. Add it to the plan when you are ready.",
    duration: "Estimated minutes",
    cancel: "Cancel",
    confirm: "Send next step",
    sent: "Sent to Today",
    stepOptions: "Step options",
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
    send: "Pošalji u Danas",
    confirmTitle: "Poslati ovaj sledeći korak u Danas?",
    confirmHelp: "Biće sačuvan u odeljku Danas bez menjanja potvrđenog plana. Dodajte ga u plan kada budete spremni.",
    duration: "Procenjeno minuta",
    cancel: "Otkaži",
    confirm: "Pošalji sledeći korak",
    sent: "Poslato u Danas",
    stepOptions: "Opcije koraka",
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
    send: "Bugüne gönder",
    confirmTitle: "Bu sonraki adım Bugün'e gönderilsin mi?",
    confirmHelp: "Onaylı planınızı değiştirmeden Bugün bölümüne kaydedilir. Hazır olduğunuzda plana ekleyebilirsiniz.",
    duration: "Tahmini dakika",
    cancel: "İptal",
    confirm: "Sonraki adımı gönder",
    sent: "Bugüne gönderildi",
    stepOptions: "Adım seçenekleri",
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
  const [strategy, setStrategy] = useState<VisionStrategyResult | null>(initialDocument?.strategy || null);
  const [documentId] = useState(initialDocument?.id || createVisionStrategyId);
  const [breakdowns, setBreakdowns] = useState<Record<string, string[]>>(initialDocument?.stepBreakdowns || {});
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [checkingStep, setCheckingStep] = useState<string | null>(null);
  const [concreteStep, setConcreteStep] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(initialDocument));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [timeframe, setTimeframe] = useState(initialDocument?.planningContext?.timeframe || "");
  const [feasibility, setFeasibility] = useState<VisionFeasibilityResult | null>(null);
  const [feasibilityDetails, setFeasibilityDetails] = useState(initialDocument?.planningContext?.clarificationDetails || "");
  const [saveDiagnostic, setSaveDiagnostic] = useState<string | null>(null);
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  const [candidateMinutes, setCandidateMinutes] = useState(25);
  const [candidateStatus, setCandidateStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function persistStrategy(currentStrategy: VisionStrategyResult, currentBreakdowns: Record<string, string[]>) {
    const now = new Date().toISOString();
    const document: SavedVisionStrategy = {
      id: documentId,
      idea,
      language,
      strategy: currentStrategy,
      stepBreakdowns: currentBreakdowns,
      createdAt: initialDocument?.createdAt || now,
      updatedAt: now,
      status: initialDocument?.status || "active",
      ...(timeframe.trim() || feasibilityDetails.trim() ? { planningContext: {
        ...(timeframe.trim() ? { timeframe: timeframe.trim() } : {}),
        ...(feasibilityDetails.trim() ? { clarificationDetails: feasibilityDetails.trim() } : {}),
      } } : {}),
      ...(initialDocument?.archivedAt ? { archivedAt: initialDocument.archivedAt } : {}),
    };
    try {
      await saveVisionStrategy(userId, document);
      setSaved(true);
      setAuthRequired(false);
      setError(false);
      setSaveDiagnostic(null);
      onSaved?.(document);
      return true;
    } catch (cause) {
      const diagnostic = getVisionSaveDiagnostic(cause);
      setSaved(false);
      setSaveDiagnostic(`${diagnostic.stage} / ${diagnostic.category} / ${diagnostic.firebaseCode}`);
      if (diagnostic.category === "unauthenticated") setAuthRequired(true);
      else setError(true);
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

  async function sendToToday() {
    if (!strategy || candidateStatus === "saving") return;
    const now = new Date().toISOString();
    const candidate: TodayCandidate = {
      id: createTodayCandidateId(documentId),
      source: "vision",
      sourceId: documentId,
      title: strategy.nextStep.trim(),
      estimatedMinutes: candidateMinutes,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    setCandidateStatus("saving");
    setError(false);
    setAuthRequired(false);
    try {
      await saveTodayCandidate(userId, candidate);
      setCandidateStatus("saved");
      setShowCandidateDialog(false);
    } catch (cause) {
      setCandidateStatus("idle");
      if (cause instanceof Error && cause.message === "authentication_required") setAuthRequired(true);
      else setError(true);
    }
  }

  async function generateStrategy(goal: string) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 42_000);
    setLoading(true);
    setError(false);
    setAuthRequired(false);
    try {
      const generated = await createVisionStrategy(goal, language, controller.signal);
      setStrategy(generated);
      setExpanded(true);
      await persistStrategy(generated, {});
    } catch {
      setError(true);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function generate(additionalDetails = "") {
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
        await generateStrategy(result.normalizedGoal);
        return;
      }
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
      const result = await decomposeVisionStep({ idea, step, depth, language });
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

  if (!strategy) {
    return (
      <div className="mt-4">
        <label className="block text-[13px] font-semibold">
          {ft.timeframe}
          <input
            value={timeframe}
            maxLength={200}
            onChange={(event) => setTimeframe(event.target.value)}
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
                <ul className="mt-2 list-disc pl-5 text-[12px] text-[#6E6E73] dark:text-[#AEAEB2]">
                  {feasibility.questions.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[12px] font-medium">{ft.needsInfo}</p>
                <label className="mt-3 block text-left text-[12px] font-semibold">
                  {ft.detailsLabel}
                  <textarea
                    value={feasibilityDetails}
                    onChange={(event) => setFeasibilityDetails(event.target.value)}
                    placeholder={ft.detailsPlaceholder}
                    rows={4}
                    className="app-a-field app-a-focus-ring mt-2 w-full resize-y p-3 text-[13px] font-normal"
                  />
                </label>
                <button
                  type="button"
                  disabled={!feasibilityDetails.trim() || loading}
                  onClick={() => void generate(feasibilityDetails)}
                  className="app-a-primary-button app-a-focus-ring mt-3 w-full px-4 disabled:opacity-50"
                >
                  {ft.recheck}
                </button>
              </>
            ) : null}
            {feasibility.adjustedGoal ? (
              <button
                type="button"
                onClick={() => void generateStrategy(feasibility.adjustedGoal!)}
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
            {feasibility.status !== "insufficient_information" ? (
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

            <div className="flex-1">
              <span className="text-[13px] text-[#3A3A3C] dark:text-[#D1D1D6]">{stepText}</span>

              {hasSubsteps && (
                <span className="ml-2 inline-flex items-center rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                  {t.substepsCount(breakdowns[key].length)}
                </span>
              )}
            </div>
          </div>

          {/* Overflow Menu Button */}
          <div className="relative shrink-0">
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

            <ol className="mt-2 space-y-3">
              {strategy.milestones.map((milestone, index) => (
                <li key={`${milestone.title}-${index}`}>
                  <p className="text-[14px] font-semibold text-black dark:text-white">
                    {index + 1}. {milestone.title}
                  </p>
                  <p className="text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">{milestone.result}</p>

                  <div className="mt-2 space-y-1">
                    {milestone.steps.map((step, stepIndex) => {
                      const key = `m${index}-s${stepIndex}`;
                      return <div key={key}>{renderStepItem(step, key, 0)}</div>;
                    })}
                  </div>
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

          <div className="rounded-[14px] bg-[#0071E3]/8 p-3 text-[14px] text-black dark:bg-[#0A84FF]/15 dark:text-white">
            <strong>{t.next}:</strong> {strategy.nextStep}
            <button
              type="button"
              disabled={candidateStatus === "saved"}
              onClick={() => setShowCandidateDialog(true)}
              className="app-a-secondary-button app-a-focus-ring mt-3 w-full gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              {candidateStatus === "saved" ? t.sent : t.send}
            </button>
          </div>

          {showCandidateDialog ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`candidate-dialog-${documentId}`}
            >
              <div className="app-a-surface w-full max-w-md p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 id={`candidate-dialog-${documentId}`} className="text-[19px] font-semibold">
                      {t.confirmTitle}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                      {t.confirmHelp}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCandidateDialog(false)}
                    className="app-a-focus-ring rounded-full p-2"
                    aria-label={t.cancel}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-4 text-[15px] font-medium">{strategy.nextStep}</p>
                <label className="mt-4 block text-[13px] font-semibold">
                  {t.duration}
                  <input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={candidateMinutes}
                    onChange={(event) =>
                      setCandidateMinutes(Math.max(5, Math.min(480, Number(event.target.value) || 5)))
                    }
                    className="app-a-field app-a-focus-ring mt-2 w-full p-3"
                  />
                </label>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCandidateDialog(false)}
                    className="app-a-secondary-button app-a-focus-ring px-4"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={candidateStatus === "saving"}
                    onClick={() => void sendToToday()}
                    className="app-a-primary-button app-a-focus-ring px-4"
                  >
                    {t.confirm}
                  </button>
                </div>
              </div>
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
