import { AlertCircle, LogIn } from "lucide-react";
import type { AppALanguage } from "../types";

const COPY = {
  en: {
    signInTitle: "Your plans stay private",
    signInText: "Sign in to see items saved from your daily plans.",
    signIn: "Continue with Google",
    loading: "Loading your plans…",
    error: "Your saved plans could not be loaded. Please try again later.",
    retry: "Try again",
  },
  sr: {
    signInTitle: "Vaši planovi ostaju privatni",
    signInText: "Prijavite se da biste videli stavke sačuvane iz dnevnih planova.",
    signIn: "Nastavi pomoću Google naloga",
    loading: "Učitavamo vaše planove…",
    error: "Sačuvane planove trenutno nije moguće učitati. Pokušajte ponovo kasnije.",
    retry: "Pokušaj ponovo",
  },
  tr: {
    signInTitle: "Planlarınız gizli kalır",
    signInText: "Günlük planlarınızdan kaydedilen öğeleri görmek için giriş yapın.",
    signIn: "Google ile devam et",
    loading: "Planlarınız yükleniyor…",
    error: "Kaydedilmiş planlarınız yüklenemedi. Lütfen daha sonra tekrar deneyin.",
    retry: "Tekrar dene",
  },
} as const;

interface Props {
  language: AppALanguage;
  state: "sign_in" | "loading" | "error";
  onSignIn?: () => void;
}

export default function PlanHistoryState({ language, state, onSignIn }: Props) {
  const t = COPY[language] || COPY.en;
  if (state === "loading") {
    return (
      <div role="status" className="app-a-surface mx-5 flex min-h-[180px] items-center justify-center p-6 text-[15px] text-[#6E6E73] sm:mx-6 md:mx-auto md:max-w-[760px] dark:text-[#AEAEB2]">
        {t.loading}
      </div>
    );
  }
  if (state === "error") {
    return (
      <div role="alert" className="app-a-surface mx-5 flex min-h-[180px] flex-col items-center justify-center gap-3 p-6 text-center sm:mx-6 md:mx-auto md:max-w-[760px]">
        <AlertCircle className="h-6 w-6 text-red-500" aria-hidden="true" />
        <p className="max-w-sm text-[15px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.error}</p>
        {onSignIn ? <button type="button" onClick={onSignIn} className="app-a-secondary-button app-a-focus-ring mt-2 px-5">{t.retry}</button> : null}
      </div>
    );
  }
  return (
    <div className="app-a-surface mx-5 flex min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center sm:mx-6 sm:p-8 md:mx-auto md:max-w-[760px]">
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]">
        <LogIn className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="text-[19px] font-semibold text-black dark:text-white">{t.signInTitle}</h2>
      <p className="max-w-sm text-[15px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{t.signInText}</p>
      <button type="button" onClick={onSignIn} className="app-a-primary-button app-a-focus-ring mt-2 px-6">
        {t.signIn}
      </button>
    </div>
  );
}
