import React, { useState } from "react";
import { ClarificationQuestion, SupportedLanguage } from "../../domain/daily-reset/contracts";

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
    },
    sr: {
      title: "Nekoliko brzih pitanja",
      subtitle: "Da bismo kreirali precizan plan, AI-ju je potrebno još malo pojašnjenja.",
      placeholder: "Vaš odgovor...",
      submit: "Pošalji odgovore",
      backToEdit: "Nazad na izmenu",
      emptyError: "Molimo odgovorite na sva pitanja pre slanja.",
      contextLabel: "Kontekst:",
    },
    tr: {
      title: "Birkaç kısa soru",
      subtitle: "Doğru bir plan oluşturmak için AI'nın biraz daha açıklamaya ihtiyacı var.",
      placeholder: "Yanıtınız...",
      submit: "Yanıtları gönder",
      backToEdit: "Düzenlemeye dön",
      emptyError: "Lütfen göndermeden önce tüm soruları yanıtlayın.",
      contextLabel: "Bağlam:",
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
      <div className="flex flex-col gap-3 pb-2">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em] text-black sm:text-[36px] dark:text-white">{t.title}</h1>
        <p className="max-w-[560px] text-[16px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.subtitle}</p>
      </div>

      {validationError && (
        <div role="alert" className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[14px] rounded-xl font-medium">
          {validationError}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="app-a-surface flex flex-col gap-3 p-5 sm:p-6">
            <label htmlFor={`question-${q.id}`} className="text-[16px] font-semibold text-black dark:text-white">
              {idx + 1}. {q.question}
            </label>

            {q.context && (
              <p className="text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
                {t.contextLabel} {q.context}
              </p>
            )}

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
              className="app-a-field mt-1 min-h-[104px] w-full resize-y p-3.5 text-[16px] placeholder-black/35 transition-shadow dark:placeholder-white/35"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          className="app-a-primary-button app-a-focus-ring flex-1 px-6 transition-colors hover:bg-[#0077ED]"
        >
          {t.submit}
        </button>
        <button
          type="button"
          onClick={onBackToEdit}
          className="app-a-secondary-button app-a-focus-ring px-6 transition-colors hover:bg-black/10 dark:hover:bg-white/15"
        >
          {t.backToEdit}
        </button>
      </div>
    </form>
  );
}
