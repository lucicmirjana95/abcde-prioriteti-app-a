import { SupportedLanguage } from "../../domain/daily-reset/contracts";

interface ErrorInfo {
  message: string;
  code?: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
}

interface Props {
  error: ErrorInfo;
  onRetry: () => void;
  onBackToEdit: () => void;
  language: SupportedLanguage;
}

export default function DailyResetErrorPanel({
  error,
  onRetry,
  onBackToEdit,
  language,
}: Props) {
  const labels = {
    en: {
      title: "Unable to complete request",
      retry: "Try again",
      backToEdit: "Back to edit",
    },
    sr: {
      title: "Nije moguće završiti zahtev",
      retry: "Pokušaj ponovo",
      backToEdit: "Nazad na izmenu",
    },
    tr: {
      title: "İstek tamamlanamadı",
      retry: "Tekrar dene",
      backToEdit: "Düzenlemeye dön",
    },
  };

  const t = labels[language] || labels.en;

  return (
    <div className="app-a-surface mx-auto flex min-h-[360px] max-w-md flex-col items-center justify-center gap-6 p-6 text-center sm:p-8">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
        style={{
          backgroundColor: "var(--app-a-danger-soft)",
          color: "var(--app-a-danger)",
        }}
      >
        !
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-[19px] font-semibold" style={{ color: "var(--app-a-text)" }}>
          {t.title}
        </h3>
        <p className="text-[15px]" style={{ color: "var(--app-a-text-secondary)" }}>
          {error.message}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
        {error.retryable && (
          <button
            type="button"
            onClick={onRetry}
            className="app-a-primary-button app-a-focus-ring flex-1 px-6 text-[15px] transition-colors"
          >
            {t.retry}
          </button>
        )}
        <button
          type="button"
          onClick={onBackToEdit}
          className="app-a-secondary-button app-a-focus-ring flex-1 px-6 text-[15px] transition-colors"
        >
          {t.backToEdit}
        </button>
      </div>
    </div>
  );
}
