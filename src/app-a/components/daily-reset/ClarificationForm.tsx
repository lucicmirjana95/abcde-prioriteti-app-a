import React, { useState, useEffect, useRef } from "react";
import { ClarificationQuestion, SupportedLanguage } from "../../domain/daily-reset/contracts";
import type { ClarificationHistoryEntry } from "../../screens/todayFlow";
import type { AppALanguage } from "../../types";
import VoiceInputButton from "../voice/VoiceInputButton";
import InputCopyButton from "../common/InputCopyButton";
import FlowHeader from "./FlowHeader";
import { Compass, CheckCircle2, Bookmark, ArrowRight, RotateCcw } from "lucide-react";

interface Props {
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  unknowns?: Record<string, boolean>;
  history?: ClarificationHistoryEntry[];
  roundIndex?: number;
  showSummaryOptions?: boolean;
  onAnswerChange: (questionId: string, answer: string) => void;
  onMarkUnknown?: (questionId: string) => void;
  onSubmit: (action?: "submit" | "draft_now" | "continue_details") => void;
  onBackToEdit: () => void;
  onSaveLater?: () => void;
  language: SupportedLanguage;
}

export default function ClarificationForm({
  questions,
  answers,
  unknowns = {},
  history = [],
  roundIndex = 1,
  showSummaryOptions = false,
  onAnswerChange,
  onMarkUnknown,
  onSubmit,
  onBackToEdit,
  onSaveLater,
  language,
}: Props) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const firstInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    // Focus the first input field on mount or round transition
    firstInputRef.current?.focus();
  }, [questions]);

  const labels = {
    en: {
      eyebrow: roundIndex > 1 ? `ROUND ${roundIndex}` : "ONE MORE QUESTION",
      title: "Quick Clarification",
      subtitle: "To build an accurate plan, AI needs a bit more clarity.",
      placeholder: "Your answer...",
      submit: "Continue",
      submitting: "Submitting...",
      backToEdit: "Back to input",
      emptyError: "Please answer all questions or select 'I don't know' before continuing.",
      contextLabel: "Context:",
      unsure: "I don’t know",
      markedUnsure: "Marked: I don't know",
      summaryTitle: "What I understood so far",
      draftNow: "Draft plan now",
      continueDetailed: "Continue with more details",
      saveLater: "Save and continue later",
      savedNotice: "Progress saved. You can resume anytime.",
      answeredCount: "Questions clarified so far:",
    },
    sr: {
      eyebrow: roundIndex > 1 ? `RUNDA ${roundIndex}` : "JOŠ JEDNO PITANJE",
      title: "Brzo pojašnjenje",
      subtitle: "Da bismo kreirali tačan i realan plan, potrebno nam je malo više detalja.",
      placeholder: "Vaš odgovor...",
      submit: "Nastavi",
      submitting: "Šaljem...",
      backToEdit: "Vrati se na unos",
      emptyError: "Molimo odgovorite na sva pitanja ili označite 'Ne znam' pre nastavka.",
      contextLabel: "Kontekst:",
      unsure: "Ne znam",
      markedUnsure: "Označeno: Ne znam",
      summaryTitle: "Šta sam razumeo do sada",
      draftNow: "Napravi nacrt sada",
      continueDetailed: "Nastavi detaljnije",
      saveLater: "Sačuvaj i nastavi kasnije",
      savedNotice: "Napredak sačuvan. Možete nastaviti kasnije.",
      answeredCount: "Razjašnjeno pitanja do sada:",
    },
    tr: {
      eyebrow: roundIndex > 1 ? `TUR ${roundIndex}` : "BİR SORU DAHA",
      title: "Hızlı Açıklama",
      subtitle: "Doğru bir plan oluşturmak için AI'nın biraz daha açıklamaya ihtiyacı var.",
      placeholder: "Yanıtınız...",
      submit: "Devam et",
      submitting: "Gönderiliyor...",
      backToEdit: "Girişe dön",
      emptyError: "Lütfen devam etmeden önce tüm soruları yanıtlayın veya 'Bilmiyorum'u seçin.",
      contextLabel: "Bağlam:",
      unsure: "Bilmiyorum",
      markedUnsure: "İşaretlendi: Bilmiyorum",
      summaryTitle: "Şu ana kadar anladıklarım",
      draftNow: "Şimdi taslak oluştur",
      continueDetailed: "Daha ayrıntılı devam et",
      saveLater: "Kaydet ve sonra devam et",
      savedNotice: "İlerleme kaydedildi. Daha sonra devam edebilirsiniz.",
      answeredCount: "Şu ana kadar yanıtlanan sorular:",
    },
  };

  const t = labels[language] || labels.en;

  const handleSubmit = (e?: React.FormEvent, action?: "submit" | "draft_now" | "continue_details") => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;
    setValidationError(null);

    // If drafting directly from summary, skip current unanswered questions
    if (action === "draft_now") {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      onSubmit("draft_now");
      return;
    }

    const hasMissing = questions.some(
      (q) => !unknowns[q.id] && (!answers[q.id] || !answers[q.id].trim())
    );

    if (hasMissing) {
      setValidationError(t.emptyError);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    onSubmit(action || "submit");
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, "submit")} className="mx-auto flex max-w-[680px] flex-col gap-6 py-2">
      <FlowHeader
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.subtitle}
        className="mb-4 sm:mb-6"
      />

      {validationError && (
        <div
          role="alert"
          className="p-3.5 border text-[14px] rounded-2xl font-medium transition-all"
          style={{
            backgroundColor: "var(--app-a-danger-soft)",
            borderColor: "var(--app-a-danger)",
            color: "var(--app-a-danger-text)",
          }}
        >
          {validationError}
        </div>
      )}

      {/* Structured "Šta sam razumeo" Summary Banner after ~3 rounds */}
      {showSummaryOptions && history.length > 0 && (
        <section
          aria-label={t.summaryTitle}
          className="app-a-surface rounded-[24px] p-5 sm:p-6 border border-[var(--app-a-border)] flex flex-col gap-4 shadow-sm"
          style={{ background: "var(--app-a-surface-secondary)" }}
        >
          <div className="flex items-center gap-2.5">
            <Compass className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-[17px] sm:text-[18px] font-semibold text-black dark:text-white">
              {t.summaryTitle}
            </h2>
          </div>
          <p className="text-[13px] text-black/70 dark:text-white/70">
            {t.answeredCount} <span className="font-semibold">{history.length}</span>
          </p>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-[13px]">
            {history.map((h, i) => (
              <div
                key={`${h.question.id}-${i}`}
                className="rounded-xl p-3 border border-[var(--app-a-border)] bg-[var(--app-a-surface)]"
              >
                <p className="font-medium text-black dark:text-white">
                  Q: {h.question.question}
                </p>
                <p className="mt-1 text-black/70 dark:text-white/70">
                  A: {h.isUnknown ? <span className="italic font-medium text-amber-600 dark:text-amber-400">({t.unsure})</span> : h.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleSubmit(undefined, "draft_now")}
              disabled={isSubmitting}
              className="app-a-primary-button app-a-focus-ring min-h-[44px] px-4 rounded-xl text-[13px] font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t.draftNow}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(undefined, "continue_details")}
              disabled={isSubmitting}
              className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-4 rounded-xl text-[13px] font-semibold flex items-center gap-1.5"
            >
              <ArrowRight className="h-4 w-4" />
              {t.continueDetailed}
            </button>
            {onSaveLater && (
              <button
                type="button"
                onClick={onSaveLater}
                className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-4 rounded-xl text-[13px] font-semibold flex items-center gap-1.5"
              >
                <Bookmark className="h-4 w-4" />
                {t.saveLater}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Current Round Questions (1-3 questions) */}
      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => {
          const isUnknown = Boolean(unknowns[q.id]);
          const currentAnswer = isUnknown ? "" : answers[q.id] || "";

          return (
            <div
              key={q.id || idx}
              className="app-a-surface rounded-[24px] p-5 sm:p-6 shadow-sm border border-[var(--app-a-border)] flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`question-${q.id}`}
                  className="text-[17px] sm:text-[19px] font-semibold leading-snug tracking-tight"
                  style={{ color: "var(--app-a-text)" }}
                >
                  {questions.length > 1 ? `${idx + 1}. ${q.question}` : q.question}
                </label>

                {q.context && (
                  <p className="text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
                    {t.contextLabel} {q.context}
                  </p>
                )}
              </div>

              <div className="relative">
                <textarea
                  ref={idx === 0 ? firstInputRef : undefined}
                  id={`question-${q.id}`}
                  rows={4}
                  value={currentAnswer}
                  disabled={isUnknown}
                  aria-invalid={validationError && !isUnknown && !currentAnswer.trim() ? true : undefined}
                  onChange={(e) => {
                    onAnswerChange(q.id, e.target.value);
                    setValidationError(null);
                  }}
                  placeholder={isUnknown ? t.markedUnsure : t.placeholder}
                  className={`app-a-field min-h-[130px] w-full resize-y p-4 pb-14 pr-16 text-[16px] rounded-[18px] transition-shadow leading-relaxed ${
                    isUnknown ? "opacity-50 cursor-not-allowed bg-black/[0.02] dark:bg-white/[0.02]" : ""
                  }`}
                />
                {!isUnknown && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                    <InputCopyButton
                      text={currentAnswer}
                      language={language as AppALanguage}
                      size="sm"
                    />
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full shadow-sm"
                      style={{ background: "var(--app-a-surface-secondary)" }}
                    >
                      <VoiceInputButton
                        language={language}
                        value={currentAnswer}
                        onChange={(value) => {
                          onAnswerChange(q.id, value);
                          setValidationError(null);
                        }}
                        maxLength={4000}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  aria-pressed={isUnknown}
                  className="app-a-focus-ring min-h-[44px] min-w-[44px] px-4 rounded-xl text-[14px] font-semibold transition-colors"
                  style={{
                    color: isUnknown ? "var(--app-a-text)" : "var(--app-a-accent)",
                    backgroundColor: isUnknown ? "var(--app-a-surface-secondary)" : "var(--app-a-accent-soft)",
                  }}
                  onClick={() => {
                    if (isUnknown) {
                      // Toggle off unknown
                      onAnswerChange(q.id, "");
                    } else if (onMarkUnknown) {
                      onMarkUnknown(q.id);
                    } else {
                      onAnswerChange(q.id, "__UNKNOWN__");
                    }
                    setValidationError(null);
                  }}
                >
                  {isUnknown ? t.markedUnsure : t.unsure}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Action Controls */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="app-a-primary-button app-a-focus-ring min-h-[52px] flex-1 px-8 rounded-full text-[16px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>{isSubmitting ? t.submitting : t.submit}</span>
          {!isSubmitting && <ArrowRight className="h-4 w-4" />}
        </button>
        {showSummaryOptions && onSaveLater && (
          <button
            type="button"
            onClick={onSaveLater}
            disabled={isSubmitting}
            className="app-a-secondary-button app-a-focus-ring min-h-[52px] px-6 rounded-full text-[15px] font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Bookmark className="h-4 w-4" />
            <span>{t.saveLater}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onBackToEdit}
          disabled={isSubmitting}
          className="app-a-secondary-button app-a-focus-ring min-h-[52px] px-7 rounded-full text-[15px] font-semibold transition-colors"
        >
          {t.backToEdit}
        </button>
      </div>
    </form>
  );
}
