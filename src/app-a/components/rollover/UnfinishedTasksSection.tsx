import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Calendar,
  EyeOff,
  Plus,
  AlertCircle,
  Loader2,
  Inbox,
  CalendarDays,
  Bell,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import type { AppALanguage } from "../../types";
import {
  shiftLocalDate,
  type UnfinishedRolloverCandidate,
} from "../../domain/rollover/contracts";

interface Props {
  candidates: UnfinishedRolloverCandidate[];
  language: AppALanguage;
  hasConfirmedPlanToday: boolean;
  isLoading: boolean;
  onAddToToday?: (candidate: UnfinishedRolloverCandidate) => Promise<string | null>;
  onBulkAddToToday?: (candidates: UnfinishedRolloverCandidate[]) => Promise<void>;
  onMoveToInbox: (candidate: UnfinishedRolloverCandidate) => Promise<void>;
  onSnoozeThisWeek: (candidate: UnfinishedRolloverCandidate) => Promise<void>;
  onScheduleDate: (candidate: UnfinishedRolloverCandidate, targetDate: string) => Promise<void>;
  onSendReminder?: (candidate: UnfinishedRolloverCandidate) => Promise<void>;
  onMarkComplete: (candidate: UnfinishedRolloverCandidate) => Promise<void>;
  onDismiss: (candidate: UnfinishedRolloverCandidate) => Promise<void>;
  onSelectForReset?: (candidate: UnfinishedRolloverCandidate) => void;
  onSelectAllForReset?: (candidates: UnfinishedRolloverCandidate[]) => void;
  onReevaluateWithSelected?: (candidates: UnfinishedRolloverCandidate[]) => void;
  selectedForResetIds?: string[];
  mode?: "form_selection" | "execution";
}

function getHeaderNotice(count: number, language: AppALanguage): string {
  if (language === "sr") {
    if (count === 1) {
      return "Ostao je 1 nezavršen zadatak. Uključićemo ga u današnju procenu, ali ništa nećemo preneti bez tvoje potvrde.";
    }
    if (count >= 2 && count <= 4) {
      return `Ostala su ${count} nezavršena zadatka. Uključićemo ih u današnju procenu, ali ništa nećemo preneti bez tvoje potvrde.`;
    }
    return `Ostalo je ${count} nezavršenih zadataka. Uključićemo ih u današnju procenu, ali ništa nećemo preneti bez tvoje potvrde.`;
  }
  if (language === "tr") {
    return `${count} tamamlanmamış görev kaldı. Bunları bugünkü değerlendirmeye dahil edeceğiz, ancak onayınız olmadan hiçbir şey aktarılmayacaktır.`;
  }
  if (count === 1) {
    return "There is 1 unfinished task. We'll include it in today's evaluation, but nothing will be transferred without your confirmation.";
  }
  return `There are ${count} unfinished tasks. We'll include them in today's evaluation, but nothing will be transferred without your confirmation.`;
}

const COPY = {
  en: {
    title: "Unfinished from earlier",
    noConfirmedPlanWarning: "Create today's plan first or choose items to evaluate in today's reset.",
    considerForToday: "Consider for today",
    considerAllForToday: "Consider all for today",
    moveToInbox: "Return to Inbox",
    snoozeThisWeek: "This week",
    schedule: "Schedule",
    scheduleNewTime: "Schedule new time",
    markComplete: "Mark Complete",
    noLongerNeeded: "No longer needed",
    removeFromActive: "Remove from active obligations",
    sendReminder: "Send reminder",
    confirmDismissTitle: "Is this task no longer needed?",
    confirmDismissDesc: "This will remove the item from rollover without adding it to today or inbox.",
    confirmReminderTitle: "Create a reminder action?",
    confirmReminderDesc: "This will create an actionable reminder task for you today.",
    confirmButton: "Confirm",
    cancelButton: "Cancel",
    saveDateButton: "Save date",
    minutesSuffix: "min",
    from: "From",
    deadlinePassed: "Deadline passed",
    pastFixedObligation: "Past scheduled event (time slot not carried)",
    waitingFor: "Waiting on external response",
    loading: "Loading earlier tasks…",
    empty: "No unfinished tasks from previous days.",
    olderTasksTitle: "Older unfinished",
    duplicateError: "This task is already in today's plan.",
    capacityExceededError: "Adding this task would exceed today's available time.",
    capacityUnknownError: "This task could not be added safely.",
    generalError: "Could not perform action. Please try again.",
    selectedForEvaluation: "Selected for today's reset",
    selectToEvaluate: "Include in today's reset",
    reevaluateWithSelected: "Re-evaluate plan with AI",
    selectedCount: "Selected for evaluation: ",
  },
  sr: {
    title: "Nezavršeno od ranije",
    noConfirmedPlanWarning: "Prvo kreirajte današnji plan ili izaberite stavke za procenu u današnjem resetu.",
    considerForToday: "Razmotri za danas",
    considerAllForToday: "Razmotri sve za danas",
    moveToInbox: "Vrati u Inbox",
    snoozeThisWeek: "Ove nedelje",
    schedule: "Zakaži",
    scheduleNewTime: "Zakaži novi termin",
    markComplete: "Označi kao završeno",
    noLongerNeeded: "Više nije potrebno",
    removeFromActive: "Ukloni iz aktivnih obaveza",
    sendReminder: "Pošalji podsetnik",
    confirmDismissTitle: "Da li ovaj zadatak više nije potreban?",
    confirmDismissDesc: "Ovo će trajno ukloniti zadatak iz rollover-a bez dodavanja u današnji plan ili Inbox.",
    confirmReminderTitle: "Kreirati zadatak podsetnika?",
    confirmReminderDesc: "Ovo će kreirati konkretan zadatak za slanje podsetnika.",
    confirmButton: "Potvrdi",
    cancelButton: "Otkaži",
    saveDateButton: "Sačuvaj datum",
    minutesSuffix: "min",
    from: "Od",
    deadlinePassed: "Rok je prošao",
    pastFixedObligation: "Fiksna obaveza sa prošlom satnicom (satnica nije preneta)",
    waitingFor: "Čeka se odgovor / ishod",
    loading: "Učitavanje ranijih zadataka…",
    empty: "Nema nezavršenih zadataka iz prethodnih dana.",
    olderTasksTitle: "Starije nezavršene",
    duplicateError: "Ovaj zadatak je već u današnjem planu.",
    capacityExceededError: "Dodavanje ovog zadatka premašuje raspoloživo vreme za danas.",
    capacityUnknownError: "Zadatak nije mogao bezbedno da se doda.",
    generalError: "Radnja nije uspela. Pokušajte ponovo.",
    selectedForEvaluation: "Uključeno u današnji reset",
    selectToEvaluate: "Uključi u današnji reset",
    reevaluateWithSelected: "Preispitaj plan uz AI",
    selectedCount: "Izabrano za procenu: ",
  },
  tr: {
    title: "Önceki günlerden tamamlanmayanlar",
    noConfirmedPlanWarning: "Önce bugünün planını oluşturun veya bugünkü reset değerlendirmesine ekleyin.",
    considerForToday: "Bugün için değerlendir",
    considerAllForToday: "Tümünü bugün için değerlendir",
    moveToInbox: "Inbox'a aktar",
    snoozeThisWeek: "Bu hafta",
    schedule: "Zamanla",
    scheduleNewTime: "Yeni saat belirle",
    markComplete: "Tamamlandı işaretle",
    noLongerNeeded: "Artık gerekli değil",
    removeFromActive: "Aktif görevlerden çıkar",
    sendReminder: "Hatırlatma gönder",
    confirmDismissTitle: "Bu görev artık gerekli değil mi?",
    confirmDismissDesc: "Bu işlem görevi devir listesinden kaldıracaktır.",
    confirmReminderTitle: "Hatırlatma görevi oluşturulsun mu?",
    confirmReminderDesc: "Bugün için bir takip görevi oluşturulacaktır.",
    confirmButton: "Onayla",
    cancelButton: "İptal",
    saveDateButton: "Tarihi kaydet",
    minutesSuffix: "dk",
    from: "Tarih:",
    deadlinePassed: "Süresi geçti",
    pastFixedObligation: "Geçmiş sabit saatli etkinlik (saat aktarılmadı)",
    waitingFor: "Yanıt bekleniyor",
    loading: "Önceki görevler yükleniyor…",
    empty: "Önceki günlerden kalan tamamlanmamış görev yok.",
    olderTasksTitle: "Daha eski tamamlanmayanlar",
    duplicateError: "Bu görev zaten bugünün planında var.",
    capacityExceededError: "Bu görevi eklemek bugünkü müsait süreyi aşacaktır.",
    capacityUnknownError: "Bu görev güvenli biçimde eklenemedi.",
    generalError: "İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.",
    selectedForEvaluation: "Bugünkü resete dahil edildi",
    selectToEvaluate: "Bugünkü resete ekle",
    reevaluateWithSelected: "Planı AI ile yeniden değerlendir",
    selectedCount: "Değerlendirme için seçildi: ",
  },
} as const;

export default function UnfinishedTasksSection({
  candidates,
  language,
  hasConfirmedPlanToday,
  isLoading,
  onAddToToday,
  onBulkAddToToday,
  onMoveToInbox,
  onSnoozeThisWeek,
  onScheduleDate,
  onSendReminder,
  onMarkComplete,
  onDismiss,
  onSelectForReset,
  onSelectAllForReset,
  onReevaluateWithSelected,
  selectedForResetIds = [],
  mode = "execution",
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const [dismissConfirmCandidate, setDismissConfirmCandidate] = useState<UnfinishedRolloverCandidate | null>(null);
  const [reminderConfirmCandidate, setReminderConfirmCandidate] = useState<UnfinishedRolloverCandidate | null>(null);
  const [schedulingCandidateId, setSchedulingCandidateId] = useState<string | null>(null);
  const [scheduledDateValue, setScheduledDateValue] = useState<string>("");

  const [isOlderOpen, setIsOlderOpen] = useState(false);
  const nowLocalDate = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = shiftLocalDate(nowLocalDate, -7);
  const recentCandidates = candidates.filter((c) => c.sourceLocalDate >= sevenDaysAgo);
  const olderCandidates = candidates.filter((c) => c.sourceLocalDate < sevenDaysAgo);

  const t = COPY[language] || COPY.en;

  if (!isLoading && candidates.length === 0) {
    return null;
  }

  const handleConsider = async (candidate: UnfinishedRolloverCandidate) => {
    if (processingId) return;
    if (onSelectForReset) {
      onSelectForReset(candidate);
      return;
    }
    if (onAddToToday) {
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
    }
  };

  const handleBulkConsider = async () => {
    if (processingId) return;
    const eligible = candidates.filter(
      (c) => !c.isPastFixedObligation && c.kind !== "waiting_for" && c.capacityType !== "fixed",
    );
    if (eligible.length === 0) return;
    if (onSelectAllForReset) {
      onSelectAllForReset(eligible);
      return;
    }
    if (!onBulkAddToToday) return;
    setProcessingId("bulk");
    setActionError(null);
    try {
      await onBulkAddToToday(eligible);
    } catch {
      setActionError({ id: "bulk", message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  const handleInbox = async (candidate: UnfinishedRolloverCandidate) => {
    if (processingId) return;
    setProcessingId(candidate.id);
    setActionError(null);
    try {
      await onMoveToInbox(candidate);
    } catch {
      setActionError({ id: candidate.id, message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSnoozeWeek = async (candidate: UnfinishedRolloverCandidate) => {
    if (processingId) return;
    setProcessingId(candidate.id);
    setActionError(null);
    try {
      await onSnoozeThisWeek(candidate);
    } catch {
      setActionError({ id: candidate.id, message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  const handleScheduleSubmit = async (candidate: UnfinishedRolloverCandidate) => {
    if (processingId || !scheduledDateValue) return;
    setProcessingId(candidate.id);
    setActionError(null);
    try {
      await onScheduleDate(candidate, scheduledDateValue);
      setSchedulingCandidateId(null);
      setScheduledDateValue("");
    } catch {
      setActionError({ id: candidate.id, message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkDone = async (candidate: UnfinishedRolloverCandidate) => {
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

  const handleConfirmedDismiss = async () => {
    if (!dismissConfirmCandidate || processingId) return;
    const candidate = dismissConfirmCandidate;
    setDismissConfirmCandidate(null);
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

  const handleConfirmedReminder = async () => {
    if (!reminderConfirmCandidate || processingId) return;
    const candidate = reminderConfirmCandidate;
    setReminderConfirmCandidate(null);
    if (!onSendReminder) return;
    setProcessingId(candidate.id);
    setActionError(null);
    try {
      await onSendReminder(candidate);
    } catch {
      setActionError({ id: candidate.id, message: t.generalError });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="mx-auto mt-6 w-full max-w-[720px] px-5 sm:px-6" aria-labelledby="rollover-heading">
      <div className="app-a-surface overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6 border border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 id="rollover-heading" className="text-[17px] font-semibold text-black dark:text-white sm:text-[19px]">
              {t.title}
            </h2>
            <span className="rounded-full bg-[#0071E3]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]">
              {candidates.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {candidates.length > 1 && (
              <button
                type="button"
                onClick={() => void handleBulkConsider()}
                disabled={Boolean(processingId) || (!hasConfirmedPlanToday && mode === "execution")}
                className="app-a-focus-ring flex items-center gap-1.5 rounded-lg bg-[#0071E3]/10 px-2.5 py-1 text-[12px] font-semibold text-[#0071E3] hover:bg-[#0071E3]/20 dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t.considerAllForToday}
              </button>
            )}
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
        </div>

        <p className="mt-2 text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
          {getHeaderNotice(candidates.length, language)}
        </p>

        {!hasConfirmedPlanToday && mode === "execution" && (
          <div className="app-a-panel-warning mt-3.5 flex items-start gap-2.5 text-[13px]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF9500] dark:text-[#FF9F0A]" />
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
              <>
                {recentCandidates.map((candidate) => {
                  const isItemProcessing = processingId === candidate.id;
                  const hasError = actionError?.id === candidate.id;
                  const isScheduling = schedulingCandidateId === candidate.id;
                  const isSelectedForReset = selectedForResetIds.includes(candidate.id);

                  return (
                    <div
                      key={`${candidate.sourceLocalDate}_${candidate.id}`}
                      className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-black/25 sm:p-4.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                              <Calendar className="h-3 w-3" />
                              {candidate.sourceLocalDate}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                              <Clock className="h-3 w-3" />
                              {candidate.estimatedMinutes} {t.minutesSuffix}
                            </span>
                            {candidate.isPastDeadline && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#FF3B30]/15 px-2 py-0.5 text-[11px] font-semibold text-[#D70015] dark:text-[#FF453A]">
                                <AlertTriangle className="h-3 w-3" />
                                {t.deadlinePassed}
                                {candidate.deadlineText ? ` (${candidate.deadlineText})` : ""}
                              </span>
                            )}
                            {!candidate.isPastDeadline && candidate.deadlineText && (
                              <span className="rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                                {candidate.deadlineText}
                              </span>
                            )}
                            {candidate.isPastFixedObligation && (
                              <span className="rounded-md bg-[#FF9500]/15 px-2 py-0.5 text-[11px] font-medium text-[#B25000] dark:text-[#FF9F0A]">
                                {t.pastFixedObligation}
                              </span>
                            )}
                            {candidate.kind === "waiting_for" && (
                              <span className="rounded-md bg-[#5856D6]/15 px-2 py-0.5 text-[11px] font-medium text-[#5856D6] dark:text-[#5E5CE6]">
                                {t.waitingFor}
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

                      {isScheduling && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-black/5 p-2.5 dark:bg-white/5">
                          <input
                            type="date"
                            value={scheduledDateValue}
                            onChange={(e) => setScheduledDateValue(e.target.value)}
                            className="app-a-input rounded-md px-2.5 py-1 text-[12px]"
                          />
                          <button
                            type="button"
                            onClick={() => void handleScheduleSubmit(candidate)}
                            disabled={!scheduledDateValue || isItemProcessing}
                            className="app-a-primary-button px-2.5 py-1 text-[12px] disabled:opacity-50"
                          >
                            {isItemProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : t.saveDateButton}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSchedulingCandidateId(null);
                              setScheduledDateValue("");
                            }}
                            className="app-a-secondary-button px-2.5 py-1 text-[12px]"
                          >
                            {t.cancelButton}
                          </button>
                        </div>
                      )}

                      {hasError && (
                        <div className="app-a-panel-danger p-2.5 text-[12px]">
                          {actionError.message}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                        {/* 1. Consider for Today */}
                        <button
                          type="button"
                          onClick={() => void handleConsider(candidate)}
                          disabled={isItemProcessing || (!hasConfirmedPlanToday && mode === "execution")}
                          className={`app-a-focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
                            isSelectedForReset
                              ? "bg-[#34C759] text-white hover:bg-[#34C759]/90"
                              : "app-a-primary-button"
                          }`}
                          title={!hasConfirmedPlanToday && mode === "execution" ? t.noConfirmedPlanWarning : undefined}
                        >
                          {isItemProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isSelectedForReset ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          {mode === "form_selection"
                            ? isSelectedForReset
                              ? t.selectedForEvaluation
                              : t.selectToEvaluate
                            : t.considerForToday}
                        </button>

                        {/* 2. Move to Inbox */}
                        <button
                          type="button"
                          onClick={() => void handleInbox(candidate)}
                          disabled={isItemProcessing}
                          className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] disabled:opacity-50"
                        >
                          <Inbox className="h-3.5 w-3.5" />
                          {t.moveToInbox}
                        </button>

                        {/* 3. Snooze This Week */}
                        <button
                          type="button"
                          onClick={() => void handleSnoozeWeek(candidate)}
                          disabled={isItemProcessing}
                          className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] disabled:opacity-50"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          {t.snoozeThisWeek}
                        </button>

                        {/* 4. Schedule */}
                        <button
                          type="button"
                          onClick={() => {
                            setSchedulingCandidateId(candidate.id);
                            setScheduledDateValue("");
                          }}
                          disabled={isItemProcessing}
                          className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] disabled:opacity-50"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          {candidate.isPastFixedObligation ? t.scheduleNewTime : t.schedule}
                        </button>

                        {/* 5. Waiting reminder */}
                        {candidate.kind === "waiting_for" && onSendReminder && (
                          <button
                            type="button"
                            onClick={() => setReminderConfirmCandidate(candidate)}
                            disabled={isItemProcessing}
                            className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] text-[#5856D6] dark:text-[#5E5CE6] disabled:opacity-50"
                          >
                            <Bell className="h-3.5 w-3.5" />
                            {t.sendReminder}
                          </button>
                        )}

                        {/* 6. Mark Complete */}
                        <button
                          type="button"
                          onClick={() => void handleMarkDone(candidate)}
                          disabled={isItemProcessing}
                          className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] hover:text-[#34C759] dark:hover:text-[#30D158] disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t.markComplete}
                        </button>

                        {/* 7. No longer needed (Dismiss with confirmation) */}
                        <button
                          type="button"
                          onClick={() => setDismissConfirmCandidate(candidate)}
                          disabled={isItemProcessing}
                          className="app-a-focus-ring ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#86868B] hover:text-black dark:text-[#86868B] dark:hover:text-white disabled:opacity-50"
                          title={candidate.isPastFixedObligation ? t.removeFromActive : t.noLongerNeeded}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          {candidate.isPastFixedObligation ? t.removeFromActive : t.noLongerNeeded}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Older Unfinished Group */}
                {olderCandidates.length > 0 && (
                  <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => setIsOlderOpen((prev) => !prev)}
                      className="app-a-focus-ring flex w-full items-center justify-between py-1 text-left text-[13px] font-medium text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <span>{t.olderTasksTitle}</span>
                        <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                          {olderCandidates.length}
                        </span>
                      </span>
                      {isOlderOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {isOlderOpen && (
                      <div className="mt-3 space-y-3">
                        {olderCandidates.map((candidate) => {
                          const isItemProcessing = processingId === candidate.id;
                          const hasError = actionError?.id === candidate.id;
                          const isScheduling = schedulingCandidateId === candidate.id;
                          const isSelectedForReset = selectedForResetIds.includes(candidate.id);

                          return (
                            <div
                              key={`${candidate.sourceLocalDate}_${candidate.id}`}
                              className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-black/25 sm:p-4.5"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                                      <Calendar className="h-3 w-3" />
                                      {candidate.sourceLocalDate}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                                      <Clock className="h-3 w-3" />
                                      {candidate.estimatedMinutes} {t.minutesSuffix}
                                    </span>
                                    {candidate.isPastDeadline && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FF3B30]/15 px-2 py-0.5 text-[11px] font-semibold text-[#D70015] dark:text-[#FF453A]">
                                        <AlertTriangle className="h-3 w-3" />
                                        {t.deadlinePassed}
                                        {candidate.deadlineText ? ` (${candidate.deadlineText})` : ""}
                                      </span>
                                    )}
                                    {!candidate.isPastDeadline && candidate.deadlineText && (
                                      <span className="rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]">
                                        {candidate.deadlineText}
                                      </span>
                                    )}
                                    {candidate.isPastFixedObligation && (
                                      <span className="rounded-md bg-[#FF9500]/15 px-2 py-0.5 text-[11px] font-medium text-[#B25000] dark:text-[#FF9F0A]">
                                        {t.pastFixedObligation}
                                      </span>
                                    )}
                                    {candidate.kind === "waiting_for" && (
                                      <span className="rounded-md bg-[#5856D6]/15 px-2 py-0.5 text-[11px] font-medium text-[#5856D6] dark:text-[#5E5CE6]">
                                        {t.waitingFor}
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

                              {isScheduling && (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-black/5 p-2.5 dark:bg-white/5">
                                  <input
                                    type="date"
                                    value={scheduledDateValue}
                                    onChange={(e) => setScheduledDateValue(e.target.value)}
                                    className="app-a-input rounded-md px-2.5 py-1 text-[12px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleScheduleSubmit(candidate)}
                                    disabled={!scheduledDateValue || isItemProcessing}
                                    className="app-a-primary-button px-2.5 py-1 text-[12px] disabled:opacity-50"
                                  >
                                    {isItemProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : t.saveDateButton}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSchedulingCandidateId(null);
                                      setScheduledDateValue("");
                                    }}
                                    className="app-a-secondary-button px-2.5 py-1 text-[12px]"
                                  >
                                    {t.cancelButton}
                                  </button>
                                </div>
                              )}

                              {hasError && (
                                <div className="app-a-panel-danger p-2.5 text-[12px]">
                                  {actionError.message}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                                {/* 1. Consider for Today */}
                                <button
                                  type="button"
                                  onClick={() => void handleConsider(candidate)}
                                  disabled={isItemProcessing || (!hasConfirmedPlanToday && mode === "execution")}
                                  className={`app-a-focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
                                    isSelectedForReset
                                      ? "bg-[#34C759] text-white hover:bg-[#34C759]/90"
                                      : "app-a-primary-button"
                                  }`}
                                  title={!hasConfirmedPlanToday && mode === "execution" ? t.noConfirmedPlanWarning : undefined}
                                >
                                  {isItemProcessing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : isSelectedForReset ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <Plus className="h-3.5 w-3.5" />
                                  )}
                                  {mode === "form_selection"
                                    ? isSelectedForReset
                                      ? t.selectedForEvaluation
                                      : t.selectToEvaluate
                                    : t.considerForToday}
                                </button>

                                {/* 2. Move to Inbox */}
                                <button
                                  type="button"
                                  onClick={() => void handleInbox(candidate)}
                                  disabled={isItemProcessing}
                                  className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] disabled:opacity-50"
                                >
                                  <Inbox className="h-3.5 w-3.5" />
                                  {t.moveToInbox}
                                </button>

                                {/* 3. Snooze This Week */}
                                <button
                                  type="button"
                                  onClick={() => void handleSnoozeWeek(candidate)}
                                  disabled={isItemProcessing}
                                  className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] disabled:opacity-50"
                                >
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {t.snoozeThisWeek}
                                </button>

                                {/* 4. Schedule */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSchedulingCandidateId(candidate.id);
                                    setScheduledDateValue("");
                                  }}
                                  disabled={isItemProcessing}
                                  className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] disabled:opacity-50"
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  {candidate.isPastFixedObligation ? t.scheduleNewTime : t.schedule}
                                </button>

                                {/* 5. Waiting reminder */}
                                {candidate.kind === "waiting_for" && onSendReminder && (
                                  <button
                                    type="button"
                                    onClick={() => setReminderConfirmCandidate(candidate)}
                                    disabled={isItemProcessing}
                                    className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] text-[#5856D6] dark:text-[#5E5CE6] disabled:opacity-50"
                                  >
                                    <Bell className="h-3.5 w-3.5" />
                                    {t.sendReminder}
                                  </button>
                                )}

                                {/* 6. Mark Complete */}
                                <button
                                  type="button"
                                  onClick={() => void handleMarkDone(candidate)}
                                  disabled={isItemProcessing}
                                  className="app-a-secondary-button app-a-focus-ring gap-1 px-2.5 py-1.5 text-[12px] hover:text-[#34C759] dark:hover:text-[#30D158] disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {t.markComplete}
                                </button>

                                {/* 7. No longer needed (Dismiss with confirmation) */}
                                <button
                                  type="button"
                                  onClick={() => setDismissConfirmCandidate(candidate)}
                                  disabled={isItemProcessing}
                                  className="app-a-focus-ring ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#86868B] hover:text-black dark:text-[#86868B] dark:hover:text-white disabled:opacity-50"
                                  title={candidate.isPastFixedObligation ? t.removeFromActive : t.noLongerNeeded}
                                >
                                  <EyeOff className="h-3.5 w-3.5" />
                                  {candidate.isPastFixedObligation ? t.removeFromActive : t.noLongerNeeded}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {selectedForResetIds.length > 0 && onReevaluateWithSelected && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0071E3]/20 bg-[#0071E3]/5 p-3 dark:border-[#0A84FF]/30 dark:bg-[#0A84FF]/10">
                    <span className="text-[13px] font-medium text-[#0071E3] dark:text-[#0A84FF]">
                      {t.selectedCount}{selectedForResetIds.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const selectedList = candidates.filter((c) => selectedForResetIds.includes(c.id));
                        onReevaluateWithSelected(selectedList);
                      }}
                      className="app-a-primary-button flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
                    >
                      <Sparkles className="h-4 w-4" />
                      {t.reevaluateWithSelected} ({selectedForResetIds.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for "No longer needed" */}
      {dismissConfirmCandidate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="app-a-surface w-full max-w-[420px] rounded-2xl p-5 shadow-2xl border border-black/10 dark:border-white/10">
            <h3 className="text-[16px] font-semibold text-black dark:text-white">
              {t.confirmDismissTitle}
            </h3>
            <p className="mt-2 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
              {t.confirmDismissDesc}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDismissConfirmCandidate(null)}
                className="app-a-secondary-button px-3 py-1.5 text-[13px]"
              >
                {t.cancelButton}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmedDismiss()}
                className="app-a-primary-button px-3 py-1.5 text-[13px] bg-[#D70015] hover:bg-[#B20010] text-white"
              >
                {t.confirmButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for "Send reminder" */}
      {reminderConfirmCandidate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="app-a-surface w-full max-w-[420px] rounded-2xl p-5 shadow-2xl border border-black/10 dark:border-white/10">
            <h3 className="text-[16px] font-semibold text-black dark:text-white">
              {t.confirmReminderTitle}
            </h3>
            <p className="mt-2 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]">
              {t.confirmReminderDesc}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReminderConfirmCandidate(null)}
                className="app-a-secondary-button px-3 py-1.5 text-[13px]"
              >
                {t.cancelButton}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmedReminder()}
                className="app-a-primary-button px-3 py-1.5 text-[13px]"
              >
                {t.confirmButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
