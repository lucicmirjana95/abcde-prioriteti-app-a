import { useState, useEffect } from "react";
import { SupportedLanguage } from "../../domain/daily-reset/contracts";
import GrowthPathArt from "../GrowthPathArt";

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
      title: "Composing a realistic plan for today",
      subtitle: "Taking into account your input, energy, and comfort.",
      phase_0_4: "Sorting items…",
      phase_4_9: "Checking priorities…",
      phase_9_16: "Aligning the plan with your state…",
      phase_16_plus: "Processing is taking a bit longer than usual. Your input is saved and safe.",
      loading_saved: "Loading today’s saved plan...",
      loadingSubtitle: "This should only take a moment.",
      cancel: "Cancel",
    },
    sr: {
      title: "Sastavljamo realan plan za danas",
      subtitle: "Uzimamo u obzir tvoj unos, energiju i prijatnost.",
      phase_0_4: "Razvrstavamo stavke…",
      phase_4_9: "Proveravamo prioritete…",
      phase_9_16: "Usklađujemo plan sa tvojim stanjem…",
      phase_16_plus: "Obrada traje malo duže nego obično. Tvoj unos je sačuvan i bezbedan.",
      loading_saved: "Učitavamo sačuvani plan za danas...",
      loadingSubtitle: "Ovo bi trebalo da traje samo trenutak.",
      cancel: "Otkaži",
    },
    tr: {
      title: "Bugün için gerçekçi bir plan hazırlanıyor",
      subtitle: "Girişinizi, enerjinizi ve rahatlığınızı göz önünde bulunduruyoruz.",
      phase_0_4: "Maddeler düzenleniyor…",
      phase_4_9: "Öncelikler kontrol ediliyor…",
      phase_9_16: "Plan durumunuza uyarlanıyor…",
      phase_16_plus: "İşlem normalden biraz daha uzun sürüyor. Girişiniz kaydedildi ve güvende.",
      loading_saved: "Bugünkü kayıtlı planınız yükleniyor...",
      loadingSubtitle: "Bu yalnızca kısa bir süre almalıdır.",
      cancel: "İptal",
    },
  };

  const t = texts[language] || texts.en;

  let title = "";
  let subtitle: string | undefined = undefined;
  let statusMessage: string | undefined = undefined;

  if (phase === "loading_saved") {
    title = t.loading_saved;
    subtitle = t.loadingSubtitle;
  } else {
    title = t.title;
    subtitle = t.subtitle;
    if (elapsedSeconds < 4) {
      statusMessage = t.phase_0_4;
    } else if (elapsedSeconds < 9) {
      statusMessage = t.phase_4_9;
    } else if (elapsedSeconds < 16) {
      statusMessage = t.phase_9_16;
    } else {
      statusMessage = t.phase_16_plus;
    }
  }

  return (
    <div className="mx-auto flex min-h-[48vh] max-w-md flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {/* Central visual: Authentic Growth Path watercolor illustration with gentle drift glow */}
      <GrowthPathArt variant="loading" size={300} aria-hidden="true" className="my-1" />

      <div className="flex flex-col gap-2.5 max-w-sm">
        <h3
          className="text-[18px] sm:text-[20px] font-semibold tracking-tight"
          style={{ color: "var(--app-a-text)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
            {subtitle}
          </p>
        )}
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mt-2 text-[14px] font-medium transition-opacity duration-300 px-3 py-1.5 rounded-full inline-block self-center"
            style={{
              color: "var(--app-a-accent)",
              backgroundColor: "var(--app-a-accent-soft)",
            }}
          >
            {statusMessage}
          </div>
        )}
      </div>
      {onCancel && phase !== "loading_saved" && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 min-h-[44px] min-w-[44px] rounded-full px-6 py-2.5 text-[14px] font-semibold transition-colors hover:opacity-80 active:opacity-60 app-a-focus-ring"
          style={{
            color: "var(--app-a-text-secondary)",
            backgroundColor: "var(--app-a-surface-secondary)",
            border: "1px solid var(--app-a-border)",
          }}
        >
          {t.cancel}
        </button>
      )}
    </div>
  );
}
