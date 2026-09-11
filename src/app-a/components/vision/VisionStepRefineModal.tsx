import { useState } from "react";
import { AlertCircle, AlertTriangle, Check, Clock3, Loader2, Sparkles, X, Edit3, ArrowRight, CornerDownRight, RotateCcw } from "lucide-react";
import type { VisionStepRefinementResult } from "../../../shared/domain/vision";
import { refineVisionStep } from "../../api/visionStrategyApi";
import type { AppALanguage } from "../../types";
import VoiceInputButton from "../voice/VoiceInputButton";

interface Props {
  stepText: string;
  stepKey: string;
  visionIdea: string;
  visionOutcome?: string;
  visionTimeframe?: string;
  previousSteps?: string[];
  nextSteps?: string[];
  language: AppALanguage;
  isInTodayPlan?: boolean;
  onApplyRefinement: (refinedText: string, syncWithToday: boolean, additionalSubsteps?: string[]) => Promise<void>;
  onManualEdit: (stepText: string) => void;
  onClose: () => void;
}

const ISSUE_OPTIONS = {
  sr: [
    { id: "too_vague", label: "Previše je neodređeno" },
    { id: "dont_know_how_to_start", label: "Ne znam kako da počnem" },
    { id: "step_too_large", label: "Korak je prevelik" },
    { id: "missing_resources", label: "Nemam potrebne resurse" },
    { id: "disagree", label: "Ne slažem se sa ovim korakom" },
  ],
  en: [
    { id: "too_vague", label: "Too vague" },
    { id: "dont_know_how_to_start", label: "Don't know how to start" },
    { id: "step_too_large", label: "Step is too large" },
    { id: "missing_resources", label: "Missing needed resources" },
    { id: "disagree", label: "Disagree with this step" },
  ],
  tr: [
    { id: "too_vague", label: "Çok belirsiz" },
    { id: "dont_know_how_to_start", label: "Nasıl başlayacağımı bilmiyorum" },
    { id: "step_too_large", label: "Adım çok büyük" },
    { id: "missing_resources", label: "Gerekli kaynaklar eksik" },
    { id: "disagree", label: "Bu adıma katılmıyorum" },
  ],
} as const;

const LABELS = {
  sr: {
    modalTitle: "Razradi korak uz AI",
    currentStepLabel: "Trenutni korak",
    questionLabel: "Šta vam nije jasno ili šta vam ne odgovara kod ovog koraka?",
    feedbackPlaceholder: "Napišite dodatne detalje ili šta biste radije postigli…",
    submitButton: "Razradi uz AI",
    submitting: "AI razrađuje korak…",
    refineError: "Došlo je do greške pri razradi koraka. Pokušajte ponovo.",
    aiProposalTitle: "AI predlog razrade",
    currentVsProposed: "Poređenje",
    currentHeading: "Prethodno",
    proposedHeading: "Novi predlog",
    smallerFirstMove: "Manji prvi potez (za lak početak)",
    substeps: "Predloženi podkoraci",
    neededResources: "Potrebni resursi i preduslovi",
    estimatedDuration: "Procena trajanja",
    alignmentReason: "Zašto ovo podržava viziju",
    missingInfoWarning: "Napomena o nedostajućim podacima",
    downstreamChanges: "Predlog za naredne korake",
    applyProposal: "Primeni predlog",
    refineAgain: "Doradi ponovo",
    keepCurrent: "Zadrži postojeći",
    manualEdit: "Izmeni ručno",
    syncTodayTitle: "Ažuriranje današnjeg plana",
    syncTodayMessage: "Ovaj korak se već nalazi u vašem današnjem planu. Želite li da ažurirate i današnji zadatak?",
    updateBoth: "Ažuriraj oba",
    updateVisionOnly: "Samo viziju",
    cancel: "Otkaži",
  },
  en: {
    modalTitle: "Refine Step with AI",
    currentStepLabel: "Current step",
    questionLabel: "What is unclear or isn't working with this step?",
    feedbackPlaceholder: "Add specific details or what you would prefer to accomplish…",
    submitButton: "Refine with AI",
    submitting: "AI is refining the step…",
    refineError: "Could not refine the step. Please try again.",
    aiProposalTitle: "AI Refinement Proposal",
    currentVsProposed: "Comparison",
    currentHeading: "Current",
    proposedHeading: "AI Proposal",
    smallerFirstMove: "Smaller first move (low friction start)",
    substeps: "Suggested sub-steps",
    neededResources: "Needed resources & preconditions",
    estimatedDuration: "Estimated duration",
    alignmentReason: "Why this supports the vision",
    missingInfoWarning: "Note on missing information",
    downstreamChanges: "Suggested downstream changes",
    applyProposal: "Apply proposal",
    refineAgain: "Refine again",
    keepCurrent: "Keep current",
    manualEdit: "Edit manually",
    syncTodayTitle: "Update Today's Plan",
    syncTodayMessage: "This step is already in your Today's plan. Would you like to update the Today task as well?",
    updateBoth: "Update both",
    updateVisionOnly: "Vision only",
    cancel: "Cancel",
  },
  tr: {
    modalTitle: "Adımı Yapay Zeka ile Geliştir",
    currentStepLabel: "Mevcut adım",
    questionLabel: "Bu adımda net olmayan veya size uymayan nedir?",
    feedbackPlaceholder: "Ek ayrıntılar veya neyi tercih edeceğinizi yazın…",
    submitButton: "Yapay Zeka ile Geliştir",
    submitting: "Yapay zeka adımı geliştiriyor…",
    refineError: "Adım geliştirilemedi. Lütfen tekrar deneyin.",
    aiProposalTitle: "Yapay Zeka Geliştirme Önerisi",
    currentVsProposed: "Karşılaştırma",
    currentHeading: "Mevcut",
    proposedHeading: "Yeni Öneri",
    smallerFirstMove: "Daha küçük ilk hamle (kolay başlangıç)",
    substeps: "Önerilen alt adımlar",
    neededResources: "Gerekli kaynaklar ve önkoşullar",
    estimatedDuration: "Tahmini süre",
    alignmentReason: "Vizyonu neden destekliyor",
    missingInfoWarning: "Eksik bilgi uyarısı",
    downstreamChanges: "Sonraki adımlar için öneriler",
    applyProposal: "Öneriyi uygula",
    refineAgain: "Yeniden geliştir",
    keepCurrent: "Mevcut olanı koru",
    manualEdit: "Manuel düzenle",
    syncTodayTitle: "Bugünkü Planı Güncelle",
    syncTodayMessage: "Bu adım zaten bugünkü planınızda yer alıyor. Bugünkü görevi de güncellemek ister misiniz?",
    updateBoth: "İkisini de güncelle",
    updateVisionOnly: "Yalnızca vizyonu",
    cancel: "İptal",
  },
} as const;

export default function VisionStepRefineModal({
  stepText,
  stepKey,
  visionIdea,
  visionOutcome,
  visionTimeframe,
  previousSteps,
  nextSteps,
  language,
  isInTodayPlan = false,
  onApplyRefinement,
  onManualEdit,
  onClose,
}: Props) {
  const t = LABELS[language] || LABELS.en;
  const issueOptions = ISSUE_OPTIONS[language] || ISSUE_OPTIONS.en;

  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [userFeedback, setUserFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<VisionStepRefinementResult | null>(null);
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const toggleIssue = (id: string) => {
    setSelectedIssues((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleGenerateRefinement = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedLabels = selectedIssues
        .map((id) => issueOptions.find((o) => o.id === id)?.label)
        .filter(Boolean) as string[];

      const result = await refineVisionStep({
        idea: visionIdea,
        step: stepText,
        language,
        userFeedback: userFeedback.trim() || undefined,
        selectedIssues: selectedLabels.length > 0 ? selectedLabels : undefined,
        currentOutcome: visionOutcome,
        timeframe: visionTimeframe,
        previousSteps,
        nextSteps,
      });

      setProposal(result);
    } catch (err) {
      setError(t.refineError);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = () => {
    if (isInTodayPlan) {
      setShowSyncPrompt(true);
    } else {
      void confirmApply(false);
    }
  };

  const confirmApply = async (syncWithToday: boolean) => {
    if (!proposal) return;
    setIsApplying(true);
    try {
      await onApplyRefinement(proposal.refinedStep, syncWithToday, proposal.substeps);
      onClose();
    } catch {
      setError(t.refineError);
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refine-step-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading && !isApplying) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-[24px] sm:rounded-[24px] border border-black/10 bg-white text-black shadow-2xl dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 id="refine-step-title" className="text-[16px] font-semibold">
                {t.modalTitle}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading || isApplying}
            className="app-a-focus-ring rounded-lg p-1.5 text-[#8E8E93] hover:bg-black/5 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Current Step Display */}
          <div className="rounded-2xl border border-black/[0.08] bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#AEAEB2]">
              {t.currentStepLabel}
            </p>
            <p className="mt-1 text-[15px] font-medium leading-relaxed">
              {stepText}
            </p>
          </div>

          {/* If Proposal Not Yet Generated: Input Phase */}
          {!proposal ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-semibold text-black dark:text-white mb-2">
                  {t.questionLabel}
                </label>
                {/* Quick Selection Chips */}
                <div className="flex flex-wrap gap-2">
                  {issueOptions.map((opt) => {
                    const isSelected = selectedIssues.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleIssue(opt.id)}
                        disabled={loading}
                        className={`app-a-focus-ring inline-flex min-h-[44px] sm:min-h-[38px] items-center rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                          isSelected
                            ? "bg-[#0071E3] text-white shadow-sm"
                            : "border border-black/10 bg-white text-[#3A3A3C] hover:bg-black/5 dark:border-white/15 dark:bg-[#2C2C2E] dark:text-[#D1D1D6] dark:hover:bg-white/10"
                        }`}
                        aria-pressed={isSelected}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free text & Voice Input */}
              <div className="relative">
                <textarea
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={loading}
                  placeholder={t.feedbackPlaceholder}
                  className="app-a-field app-a-focus-ring w-full p-3.5 pr-12 text-[14px] resize-none"
                />
                <div className="absolute right-2.5 bottom-3.5">
                  <VoiceInputButton
                    language={language}
                    value={userFeedback}
                    onChange={setUserFeedback}
                    maxLength={500}
                  />
                </div>
              </div>

              {error && (
                <div role="alert" className="app-a-panel-danger flex items-center gap-2 text-[13px]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            /* Proposal Review Phase */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Diff / Comparison Box */}
              <div className="rounded-2xl border border-[#0071E3]/30 bg-[#0071E3]/5 p-4 dark:border-[#0A84FF]/30 dark:bg-[#0A84FF]/10">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#0071E3] dark:text-[#0A84FF]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t.proposedHeading}
                </div>
                <p className="mt-2 text-[16px] font-bold text-black dark:text-white leading-snug">
                  {proposal.refinedStep}
                </p>

                {proposal.estimatedDuration && (
                  <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#6E6E73] dark:text-[#AEAEB2]">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{t.estimatedDuration}: {proposal.estimatedDuration}</span>
                  </div>
                )}
              </div>

              {/* Smaller First Move */}
              {proposal.smallerFirstMove && (
                <div className="rounded-xl border border-[#34C759]/30 bg-[#34C759]/5 p-3.5 dark:border-[#30D158]/30 dark:bg-[#30D158]/10">
                  <p className="text-[12px] font-semibold text-[#248A3D] dark:text-[#30D158]">
                    ⚡ {t.smallerFirstMove}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-black dark:text-white">
                    {proposal.smallerFirstMove}
                  </p>
                </div>
              )}

              {/* Substeps */}
              {proposal.substeps && proposal.substeps.length > 0 && (
                <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6E6E73] dark:text-[#AEAEB2]">
                    {t.substeps} ({proposal.substeps.length})
                  </p>
                  <ul className="mt-2 space-y-1.5 pl-4 list-decimal text-[13px] text-[#3A3A3C] dark:text-[#D1D1D6]">
                    {proposal.substeps.map((sub, idx) => (
                      <li key={idx} className="leading-snug">
                        {sub}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Needed Resources */}
              {proposal.neededResources && proposal.neededResources.length > 0 && (
                <div className="rounded-xl border border-black/10 p-3 text-[13px] dark:border-white/10">
                  <span className="font-semibold text-[#6E6E73] dark:text-[#AEAEB2]">{t.neededResources}: </span>
                  <span className="text-[#3A3A3C] dark:text-[#D1D1D6]">{proposal.neededResources.join(", ")}</span>
                </div>
              )}

              {/* Alignment Reason */}
              {proposal.alignmentReason && (
                <p className="text-[13px] text-[#6E6E73] dark:text-[#AEAEB2] italic leading-relaxed">
                  💡 {proposal.alignmentReason}
                </p>
              )}

              {/* Missing Info Warning */}
              {proposal.missingInfoWarning && (
                <div className="flex items-start gap-2 rounded-xl bg-[#FF9500]/10 p-3 text-[13px] text-[#C97800] dark:text-[#FF9F0A]">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{proposal.missingInfoWarning}</span>
                </div>
              )}

              {/* Downstream Changes Suggestions */}
              {proposal.suggestedDownstreamChanges && proposal.suggestedDownstreamChanges.length > 0 && (
                <div className="rounded-xl border border-black/10 bg-black/[0.015] p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                  <p className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#AEAEB2]">
                    {t.downstreamChanges}
                  </p>
                  <div className="mt-2 space-y-2 text-[13px]">
                    {proposal.suggestedDownstreamChanges.map((change, cIdx) => (
                      <div key={cIdx} className="rounded-lg bg-white p-2.5 border border-black/5 dark:bg-[#2C2C2E] dark:border-white/5">
                        <p className="line-through text-[#8E8E93]">{change.originalStep}</p>
                        <p className="font-medium text-black dark:text-white mt-0.5">↳ {change.suggestedChange}</p>
                        <p className="text-[11px] text-[#8E8E93] mt-0.5">{change.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-black/[0.08] p-4 bg-[#F2F2F7]/50 dark:bg-[#1C1C1E] dark:border-white/10 shrink-0">
          {!proposal ? (
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onManualEdit(stepText);
                  onClose();
                }}
                disabled={loading}
                className="app-a-secondary-button min-h-[44px] px-3.5 text-[13px]"
              >
                <Edit3 className="h-4 w-4" />
                {t.manualEdit}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="app-a-secondary-button min-h-[44px] px-4 text-[13px]"
                >
                  {t.keepCurrent}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateRefinement}
                  disabled={loading}
                  className="app-a-primary-button min-h-[44px] px-5 text-[13px] font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.submitting}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t.submitButton}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setProposal(null)}
                disabled={isApplying}
                className="app-a-secondary-button min-h-[44px] px-3.5 text-[13px]"
              >
                <RotateCcw className="h-4 w-4" />
                {t.refineAgain}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isApplying}
                  className="app-a-secondary-button min-h-[44px] px-4 text-[13px]"
                >
                  {t.keepCurrent}
                </button>
                <button
                  type="button"
                  onClick={handleApplyClick}
                  disabled={isApplying}
                  className="app-a-primary-button min-h-[44px] px-5 text-[13px] font-semibold"
                >
                  {isApplying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {t.applyProposal}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sync with Today Confirmation Dialog */}
        {showSyncPrompt && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/15 dark:bg-[#2C2C2E]">
              <h3 className="text-[16px] font-semibold text-black dark:text-white">
                {t.syncTodayTitle}
              </h3>
              <p className="mt-2 text-[14px] text-[#6E6E73] dark:text-[#AEAEB2] leading-relaxed">
                {t.syncTodayMessage}
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSyncPrompt(false);
                    void confirmApply(true);
                  }}
                  disabled={isApplying}
                  className="app-a-primary-button min-h-[44px] flex-1 text-[13px] font-semibold"
                >
                  {t.updateBoth}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSyncPrompt(false);
                    void confirmApply(false);
                  }}
                  disabled={isApplying}
                  className="app-a-secondary-button min-h-[44px] flex-1 text-[13px]"
                >
                  {t.updateVisionOnly}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSyncPrompt(false)}
                  disabled={isApplying}
                  className="app-a-secondary-button min-h-[44px] px-3 text-[13px] text-[#8E8E93]"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
