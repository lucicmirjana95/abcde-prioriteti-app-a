import type { AppALanguage } from "../../types";

export const SPEECH_LANGUAGE: Record<AppALanguage, string> = {
  en: "en-US",
  sr: "sr-RS",
  tr: "tr-TR",
};

export const VOICE_INPUT_COPY = {
  en: {
    start: "Use voice",
    stop: "Stop listening",
    listening: "Listening… Speak naturally.",
    unavailable: "Voice input is not supported in this browser. You can continue typing.",
    denied: "Microphone access was not allowed. Enable it in browser settings or continue typing.",
    noSpeech: "I didn’t hear anything. Try again or continue typing.",
    error: "Voice input could not start. Try again or continue typing.",
  },
  sr: {
    start: "Koristi glas",
    stop: "Zaustavi slušanje",
    listening: "Slušam… Govorite prirodno.",
    unavailable: "Ovaj pregledač ne podržava glasovni unos. Možete nastaviti da kucate.",
    denied: "Pristup mikrofonu nije dozvoljen. Omogućite ga u podešavanjima pregledača ili nastavite da kucate.",
    noSpeech: "Nisam čuo/la govor. Pokušajte ponovo ili nastavite da kucate.",
    error: "Glasovni unos nije mogao da se pokrene. Pokušajte ponovo ili nastavite da kucate.",
  },
  tr: {
    start: "Sesle yaz",
    stop: "Dinlemeyi durdur",
    listening: "Dinliyorum… Doğal biçimde konuşun.",
    unavailable: "Bu tarayıcı sesli girişi desteklemiyor. Yazmaya devam edebilirsiniz.",
    denied: "Mikrofon erişimine izin verilmedi. Tarayıcı ayarlarından etkinleştirin veya yazmaya devam edin.",
    noSpeech: "Herhangi bir konuşma duymadım. Tekrar deneyin veya yazmaya devam edin.",
    error: "Sesli giriş başlatılamadı. Tekrar deneyin veya yazmaya devam edin.",
  },
} as const;

export function appendVoiceTranscript(current: string, transcript: string, maxLength: number): string {
  const spoken = transcript.trim();
  if (!spoken) return current.slice(0, maxLength);
  const separator = current.length > 0 && !/\s$/.test(current) ? " " : "";
  return `${current}${separator}${spoken}`.slice(0, maxLength);
}

export function voiceErrorMessageKey(error: string): "denied" | "noSpeech" | "error" {
  if (error === "not-allowed" || error === "service-not-allowed") return "denied";
  if (error === "no-speech") return "noSpeech";
  return "error";
}
