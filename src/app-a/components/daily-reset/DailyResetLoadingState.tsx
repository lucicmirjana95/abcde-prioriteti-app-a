import { SupportedLanguage } from "../../domain/daily-reset/contracts";

interface Props {
  phase: "submitting" | "resolving" | "loading_saved";
  language: SupportedLanguage;
}

export default function DailyResetLoadingState({ phase, language }: Props) {
  const texts = {
    en: {
      submitting: "Analyzing your thoughts and creating a realistic plan...",
      resolving: "Incorporating your answers and finalizing your plan...",
      loading_saved: "Loading today’s saved plan...",
      subtitle: "This usually takes 10–20 seconds.",
      loadingSubtitle: "This should only take a moment.",
    },
    sr: {
      submitting: "Analiziramo vaše misli i kreiramo realan plan...",
      resolving: "Uključujemo vaše odgovore i završavamo vaš plan...",
      loading_saved: "Učitavamo sačuvani plan za danas...",
      subtitle: "Ovo obično traje 10–20 sekundi.",
      loadingSubtitle: "Ovo bi trebalo da traje samo trenutak.",
    },
    tr: {
      submitting: "Düşünceleriniz analiz ediliyor ve gerçekçi bir plan oluşturuluyor...",
      resolving: "Yanıtlarınız ekleniyor ve planınız sonlandırılıyor...",
      loading_saved: "Bugünkü kayıtlı planınız yükleniyor...",
      subtitle: "Bu işlem genellikle 10–20 saniye sürer.",
      loadingSubtitle: "Bu yalnızca kısa bir süre almalıdır.",
    },
  };

  const t = texts[language] || texts.en;
  const message = t[phase];
  const subtitle = phase === "loading_saved" ? t.loadingSubtitle : t.subtitle;

  return (
    <div className="mx-auto flex min-h-[46vh] max-w-md flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#0A84FF]/15 border-t-[#0A84FF]" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h3 role="status" aria-live="polite" className="text-[18px] font-semibold text-black dark:text-white">
          {message}
        </h3>
        <p className="text-[14px] text-[#3C3C43]/70 dark:text-[#EBEBF5]/60">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
