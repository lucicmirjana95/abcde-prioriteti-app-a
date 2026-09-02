import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, CheckCircle2, Calendar, EyeOff, Plus, AlertCircle, Loader2 } from "lucide-react";
import type { AppALanguage } from "../../types";
import type { UnfinishedRolloverCandidate } from "../../domain/rollover/contracts";

interface Props {
  candidates: UnfinishedRolloverCandidate[];
  language: AppALanguage;
  hasConfirmedPlanToday: boolean;
  isLoading: boolean;
  onAddToToday: (candidate: UnfinishedRolloverCandidate) => Promise<string | null>;
  onRemindTomorrow: (candidate: UnfinishedRolloverCandidate) => Promise<void>;
  onMarkComplete: (candidate: UnfinishedRolloverCandidate) => Promise<void>;
  onDismiss: (candidate: UnfinishedRolloverCandidate) => Promise<void>;
}

const COPY = {
  en: {
    title: "Unfinished from earlier",
    intro: "Review tasks from previous daily plans that were not marked as done.",
    noConfirmedPlanWarning: "Create today's plan first to add earlier tasks directly.",
    addToToday: "Add to Today",
    remindTomorrow: "Remind Tomorrow",
    markComplete: "Mark Complete",
    dismiss: "Dismiss",
    minutesSuffix: "min",
    from: "From",
    loading: "Loading earlier tasks…",
    empty: "No unfinished tasks from previous days.",
    duplicateError: "This task is already in today's plan.",
    capacityExceededError: "Adding this task would exceed today's available time.",
    capacityUnknownError: "Please set available time before adding tasks.",
    generalError: "Could not perform action. Please try again.",
  },
  sr: {
    title: "Nezavršeno od ranije",
    intro: "Pregledajte zadatke iz prethodnih dnevnih planova koji nisu označeni kao završeni.",
    noConfirmedPlanWarning: "Prvo kreirajte današnji plan da biste direktno dodali ranije zadatke.",
    addToToday: "Dodaj u današnji plan",
    remindTomorrow: "Podseti me sutra",
    markComplete: "Označi kao završeno",
    dismiss: "Odbaci",
    minutesSuffix: "min",
    from: "Od",
    loading: "Učitavanje ranijih zadataka…",
    empty: "Nema nezavršenih zadataka iz prethodnih dana.",
    duplicateError: "Ovaj zadatak je već u današnjem planu.",
    capacityExceededError: "Dodavanje ovog zadatka premašuje raspoloživo vreme za danas.",
    capacityUnknownError: "Postavite raspoloživo vreme pre dodavanja zadataka.",
    generalError: "Radnja nije uspela. Pokušajte ponovo.",
  },
  tr: {
    title: "Önceki günlerden tamamlanmayanlar",
    intro: "Önceki günlük planlardan tamamlandı olarak işaretlenmeyen görevleri gözden geçirin.",
    noConfirmedPlanWarning: "Önceki görevleri doğrudan eklemek için önce bugünün planını oluşturun.",
    addToToday: "Bugüne Ekle",
    remindTomorrow: "Yarın Hatırlat",
    markComplete: "Tamamlandı İşaretle",
    dismiss: "Göz Ardı Et",
    minutesSuffix: "dk",
    from: "Tarih:",
    loading: "Önceki görevler yükleniyor…",
    empty: "Önceki günlerden kalan tamamlanmamış görev yok.",
    duplicateError: "Bu görev zaten bugünün planında var.",
    capacityExceededError: "Bu görevi eklemek bugünkü müsait süreyi aşacaktır.",
    capacityUnknownError: "Görev eklemeden önce lütfen müsait süreyi belirleyin.",
    generalError: "İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.",
  },
} as const;

export default function UnfinishedTasksSection({
  candidates,
  language,
  hasConfirmedPlanToday,
  isLoading,
  onAddToToday,
  onRemindTomorrow,
  onMarkComplete,
  onDismiss,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const t = COPY[language] || COPY.en;

  if (!isLoading && candidates.length === 0) {
    return null;
  }

  const handleAdd = async (candidate: UnfinishedRolloverCandidate) => {
    if (processingId) return;
    setProcessingId(candidate.id);
    setActionError(null);
    try {
      const err = await onAddToToday(candidate);
      if (err) {
        if (err === "duplicate") setActionError({ id: candidate.id, message: t.duplicateError });
        else if (err === "capacity_exceeded") setActionError({ id: candidate.id, message: t.capacityExceededError });
        else if (err === "capacity_unknown") setActionError({ id: candidate.id, message: t.capacityUnknownError });
        else setActionError({ id: candidate.id, message: t.generalError });
      }
    } catch {
      setActionError({ id: candidate.id, message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemind = async (candidate: UnfinishedRolloverCandidate) => {
    if (processingId) return;
    setProcessingId(candidate.id);
    setActionError(null);
    try {
      await onRemindTomorrow(candidate);
    } catch {
      setActionError({ id: candidate.id, message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (candidate: UnfinishedRolloverCandidate) => {
    if (processingId) return;
    setProcessingId(candidate.id);
    setActionError(null);
    try {
      await onMarkComplete(candidate);
    } catch {
      setActionError({ id: candidate.id, message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (candidate: UnfinishedRolloverCandidate) => {
    if (processingId) return;
    setProcessingId(candidate.id);
    setActionError(null);
    try {
      await onDismiss(candidate);
    } catch {
      setActionError({ id: candidate.id, message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="mx-auto mt-8 w-full max-w-[720px] px-5 sm:px-6" aria-labelledby="rollover-heading">
      <div className="app-a-surface overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 id="rollover-heading" className="text-[17px] font-semibold text-black dark:text-white sm:text-[19px]">
              {t.title}
            </h2>
            <span className="rounded-full bg-[#0071E3]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]">
              {candidates.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="app-a-focus-ring flex items-center gap-1.5 rounded-lg p-1.5 text-[13px] font-medium text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
            aria-expanded={isOpen}
            aria-controls="rollover-candidate-list"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <p className="mt-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
          {t.intro}
        </p>

        {!hasConfirmedPlanToday && (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[13px] text-amber-900 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{t.noConfirmedPlanWarning}</span>
          </div>
        )}

        {isOpen && (
          <div id="rollover-candidate-list" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[14px] text-[#6E6E73] dark:text-[#AEAEB2]">
                <Loader2 className="h-4 w-4 animate-spin text-[#0071E3]" />
                <span>{t.loading}</span>
              </div>
            ) : (
              candidates.map((candidate) => {
                const isItemProcessing = processingId === candidate.id;
                const hasError = actionError?.id === candidate.id;

                return (
                  <div
                    key={`${candidate.sourceLocalDate}_${candidate.id}`}
                    className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-black/20 sm:p-4.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                            <Calendar className="h-3 w-3" />
                            {candidate.sourceLocalDate}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                            <Clock className="h-3 w-3" />
                            {candidate.estimatedMinutes} {t.minutesSuffix}
                          </span>
                          {candidate.deadlineText && (
                            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-400">
                              {candidate.deadlineText}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-[15px] font-semibold text-black dark:text-white">
                          {candidate.title}
                        </h3>
                        {candidate.description && (
                          <p className="mt-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
                            {candidate.description}
                          </p>
                        )}
                        {candidate.priority?.explanation && (
                          <p className="mt-1 text-[12px] italic text-[#86868B] dark:text-[#86868B]">
                            {candidate.priority.explanation}
                          </p>
                        )}
                      </div>
                    </div>

                    {hasError && (
                      <div className="rounded-lg bg-red-500/10 p-2.5 text-[12px] text-red-600 dark:text-red-400">
                        {actionError.message}
                      </div>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => void handleAdd(candidate)}
                        disabled={isItemProcessing || !hasConfirmedPlanToday}
                        className="app-a-primary-button app-a-focus-ring gap-1.5 px-3 py-1.5 text-[12px] disabled:opacity-50"
                        title={!hasConfirmedPlanToday ? t.noConfirmedPlanWarning : undefined}
                      >
                        {isItemProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {t.addToToday}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRemind(candidate)}
                        disabled={isItemProcessing}
                        className="app-a-secondary-button app-a-focus-ring gap-1.5 px-3 py-1.5 text-[12px] disabled:opacity-50"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {t.remindTomorrow}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleComplete(candidate)}
                        disabled={isItemProcessing}
                        className="app-a-secondary-button app-a-focus-ring gap-1.5 px-3 py-1.5 text-[12px] disabled:opacity-50 hover:text-[#34C759] dark:hover:text-[#30D158]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t.markComplete}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDismiss(candidate)}
                        disabled={isItemProcessing}
                        className="app-a-focus-ring ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#86868B] hover:text-black dark:text-[#86868B] dark:hover:text-white disabled:opacity-50"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {t.dismiss}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
}
