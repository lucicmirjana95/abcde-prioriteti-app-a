import React, { useState } from "react";
import { ClarificationQuestion, SupportedLanguage } from "../../domain/daily-reset/contracts";
import VoiceInputButton from "../voice/VoiceInputButton";

interface Props {
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  onBackToEdit: () => void;
  language: SupportedLanguage;
}

export default function ClarificationForm({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  onBackToEdit,
  language,
}: Props) {
  const [validationError, setValidationError] = useState<string | null>(null);

  const labels = {
    en: {
      title: "A few quick questions",
      subtitle: "To build an accurate plan, AI needs a bit more clarity.",
      placeholder: "Your answer...",
      submit: "Submit answers",
      backToEdit: "Back to edit",
      emptyError: "Please answer all questions before submitting.",
      contextLabel: "Context:",
      unsure: "I’m not sure",
    },
    sr: {
      title: "Nekoliko brzih pitanja",
      subtitle: "Da bismo kreirali precizan plan, AI-ju je potrebno još malo pojašnjenja.",
      placeholder: "Vaš odgovor...",
      submit: "Pošalji odgovore",
      backToEdit: "Nazad na izmenu",
      emptyError: "Molimo odgovorite na sva pitanja pre slanja.",
      contextLabel: "Kontekst:",
      unsure: "Ne znam",
    },
    tr: {
      title: "Birkaç kısa soru",
      subtitle: "Doğru bir plan oluşturmak için AI'nın biraz daha açıklamaya ihtiyacı var.",
      placeholder: "Yanıtınız...",
      submit: "Yanıtları gönder",
      backToEdit: "Düzenlemeye dön",
      emptyError: "Lütfen göndermeden önce tüm soruları yanıtlayın.",
      contextLabel: "Bağlam:",
      unsure: "Bilmiyorum",
    },
  };

  const t = labels[language] || labels.en;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const hasMissing = questions.some(
      (q) => !answers[q.id] || !answers[q.id].trim()
    );

    if (hasMissing) {
      setValidationError(t.emptyError);
      return;
    }

    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-[680px] flex-col gap-6 py-2">
      <div className="app-a-flow-header flex flex-col gap-3">
        <p className="app-a-eyebrow mb-0">
          {language === "sr" ? "Još jedno pitanje" : language === "tr" ? "Bir soru daha" : "One more question"}
        </p>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em] sm:text-[36px]" style={{ color: "var(--app-a-text)" }}>
          {t.title}
        </h1>
        <p className="max-w-[560px] text-[16px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
          {t.subtitle}
        </p>
      </div>

      {validationError && (
        <div
          role="alert"
          className="p-3.5 border text-[14px] rounded-xl font-medium"
          style={{
            backgroundColor: "var(--app-a-danger-soft)",
            borderColor: "var(--app-a-danger)",
            color: "var(--app-a-danger-text)",
          }}
        >
          {validationError}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="app-a-surface flex flex-col gap-3 p-5 sm:p-6">
            <label
              htmlFor={`question-${q.id}`}
              className="text-[16px] font-semibold"
              style={{ color: "var(--app-a-text)" }}
            >
              {idx + 1}. {q.question}
            </label>

            {q.context && (
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
                {t.contextLabel} {q.context}
              </p>
            )}

            <div className="relative mt-1">
              <textarea
                id={`question-${q.id}`}
                rows={3}
                value={answers[q.id] || ""}
                aria-invalid={validationError ? true : undefined}
                onChange={(e) => {
                  onAnswerChange(q.id, e.target.value);
                  setValidationError(null);
                }}
                placeholder={t.placeholder}
                className="app-a-field min-h-[120px] w-full resize-y p-3.5 pb-14 pr-16 text-[16px] transition-shadow"
              />
              <div className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "var(--app-a-surface-secondary)" }}>
                <VoiceInputButton
                  language={language}
                  value={answers[q.id] || ""}
                  onChange={(value) => {
                    onAnswerChange(q.id, value);
                    setValidationError(null);
                  }}
                  maxLength={4000}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="app-a-focus-ring min-h-11 rounded-xl px-3 text-[13px] font-semibold"
                style={{ color: "var(--app-a-accent)" }}
                onClick={() => {
                  onAnswerChange(q.id, t.unsure);
                  setValidationError(null);
                }}
              >
                {t.unsure}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          className="app-a-primary-button app-a-focus-ring flex-1 px-6 transition-colors"
        >
          {t.submit}
        </button>
        <button
          type="button"
          onClick={onBackToEdit}
          className="app-a-secondary-button app-a-focus-ring px-6 transition-colors"
        >
          {t.backToEdit}
        </button>
      </div>
    </form>
  );
}
