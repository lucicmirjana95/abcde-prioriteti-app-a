import { useState, useEffect } from "react";
import { SupportedLanguage } from "../../domain/daily-reset/contracts";

interface Props {
  phase: "submitting" | "resolving" | "loading_saved";
  language: SupportedLanguage;
  onCancel?: () => void;
}

export default function DailyResetLoadingState({ phase, language, onCancel }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const texts = {
    en: {
      submitting_early: "Analyzing your thoughts and creating a realistic plan...",
      submitting_mid: "Still working — organizing priorities and checking your available time...",
      submitting_late: "This is taking a little longer than usual. Your input is still preserved.",
      resolving_early: "Incorporating your answers and finalizing your daily plan...",
      resolving_mid: "Still working — applying your details and checking the plan...",
      resolving_late: "This is taking a little longer than usual. Your answers are still preserved.",
      loading_saved: "Loading today’s saved plan...",
      loadingSubtitle: "This should only take a moment.",
      cancel: "Cancel",
    },
    sr: {
      submitting_early: "Analiziramo vaše misli i kreiramo realan plan...",
      submitting_mid: "Još uvek radimo — organizujemo prioritete i proveravamo raspoloživo vreme...",
      submitting_late: "Ovo traje malo duže nego obično. Vaš unos je sačuvan.",
      resolving_early: "Uključujemo vaše odgovore i završavamo vaš dnevni plan...",
      resolving_mid: "Još uvek radimo — primenjujemo vaše detalje i proveravamo plan...",
      resolving_late: "Ovo traje malo duže nego obično. Vaši odgovori su sačuvani.",
      loading_saved: "Učitavamo sačuvani plan za danas...",
      loadingSubtitle: "Ovo bi trebalo da traje samo trenutak.",
      cancel: "Otkaži",
    },
    tr: {
      submitting_early: "Düşünceleriniz analiz ediliyor ve gerçekçi bir plan oluşturuluyor...",
      submitting_mid: "Hala çalışıyor — öncelikleri düzenliyor ve uygun zamanınızı kontrol ediyoruz...",
      submitting_late: "Bu işlem normalden biraz daha uzun sürüyor. Girişiniz korunuyor.",
      resolving_early: "Yanıtlarınız ekleniyor ve günlük planınız sonlandırılıyor...",
      resolving_mid: "Hala çalışıyor — ayrıntılarınızı uyguluyor ve planı kontrol ediyoruz...",
      resolving_late: "Bu işlem normalden biraz daha uzun sürüyor. Yanıtlarınız korunuyor.",
      loading_saved: "Bugünkü kayıtlı planınız yükleniyor...",
      loadingSubtitle: "Bu yalnızca kısa bir süre almalıdır.",
      cancel: "İptal",
    },
  };

  const t = texts[language] || texts.en;

  let title = "";
  let subtitle: string | undefined = undefined;

  if (phase === "loading_saved") {
    title = t.loading_saved;
    subtitle = t.loadingSubtitle;
  } else if (phase === "submitting") {
    if (elapsedSeconds <= 12) {
      title = t.submitting_early;
    } else if (elapsedSeconds <= 25) {
      title = t.submitting_mid;
    } else {
      title = t.submitting_late;
    }
  } else if (phase === "resolving") {
    if (elapsedSeconds <= 12) {
      title = t.resolving_early;
    } else if (elapsedSeconds <= 25) {
      title = t.resolving_mid;
    } else {
      title = t.resolving_late;
    }
  }

  return (
    <div className="mx-auto flex min-h-[46vh] max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-[3px] motion-reduce:animate-none"
        style={{
          borderColor: "var(--app-a-accent-soft)",
          borderTopColor: "var(--app-a-accent)",
        }}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2">
        <h3
          role="status"
          aria-live="polite"
          className="text-[17px] font-semibold tracking-tight transition-opacity duration-300"
          style={{ color: "var(--app-a-text)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-[14px]" style={{ color: "var(--app-a-text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {onCancel && phase !== "loading_saved" && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-1 rounded-full px-5 py-1.5 text-[14px] font-medium transition-colors hover:opacity-80 active:opacity-60"
          style={{
            color: "var(--app-a-text-secondary)",
            backgroundColor: "var(--app-a-card-bg, rgba(0, 0, 0, 0.04))",
            border: "1px solid var(--app-a-border, rgba(0, 0, 0, 0.08))",
          }}
        >
          {t.cancel}
        </button>
      )}
    </div>
  );
}
