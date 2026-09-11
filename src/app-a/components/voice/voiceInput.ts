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
    denied: "Microphone access is not enabled.",
    deniedDetails: "Tap 'Enable microphone' to grant access, or check your phone/browser settings if previously blocked.",
    enableMic: "Enable microphone",
    howToSettings: "How to enable in Settings",
    safariGuideTitle: "iPhone / iPad (Safari):",
    safariGuideText: "Tap the page icon (AA) in the address bar ➔ Website Settings ➔ Microphone ➔ Set to 'Allow'. Or go to iOS Settings ➔ Safari ➔ Microphone.",
    chromeGuideTitle: "Android / Chrome:",
    chromeGuideText: "Tap the lock/tune icon beside the web address ➔ Permissions ➔ Microphone ➔ Allow.",
    noSpeech: "No speech was detected. Try speaking again.",
    error: "Voice input could not start. Try again.",
    close: "Got it",
  },
  sr: {
    start: "Koristi glas",
    stop: "Zaustavi slušanje",
    listening: "Slušam… Govorite prirodno.",
    unavailable: "Ovaj pregledač ne podržava glasovni unos. Možete nastaviti sa kucanjem.",
    denied: "Pristup mikrofonu nije omogućen.",
    deniedDetails: "Dodirnite 'Omogući mikrofon' da biste odobrili pristup, ili proverite podešavanja telefona ako je mikrofon ranije blokiran.",
    enableMic: "Omogući mikrofon",
    howToSettings: "Kako podesiti u telefonu",
    safariGuideTitle: "iPhone / iPad (Safari):",
    safariGuideText: "1. Dodirnite ikonicu (AA) u adresnoj traci ➔ Podešavanja veb-sajta (Website Settings) ➔ Mikrofon ➔ 'Dozvoli' (Allow).\n2. Ili otvorite Podešavanja telefona (Settings) ➔ Safari ➔ Mikrofon ➔ Dozvoli.",
    chromeGuideTitle: "Android / Chrome:",
    chromeGuideText: "Dodirnite ikonicu pored adrese sajta ➔ Dozvole (Permissions) ➔ Mikrofon ➔ Uključi / Dozvoli.",
    noSpeech: "Nije detektovan govor. Pokušajte ponovo.",
    error: "Glasovni unos nije mogao da se pokrene. Pokušajte ponovo.",
    close: "U redu",
  },
  tr: {
    start: "Sesle yaz",
    stop: "Dinlemeyi durdur",
    listening: "Dinliyorum… Doğal biçimde konuşun.",
    unavailable: "Bu tarayıcı sesli girişi desteklemiyor. Yazmaya devam edebilirsiniz.",
    denied: "Mikrofon erişimi etkin değil.",
    deniedDetails: "Erişim vermek için 'Mikrofonu etkinleştir'e dokunun veya daha önce engellendiyse telefon ayarlarınızı kontrol edin.",
    enableMic: "Mikrofonu etkinleştir",
    howToSettings: "Ayarlardan nasıl açılır",
    safariGuideTitle: "iPhone / iPad (Safari):",
    safariGuideText: "Adres çubuğundaki (AA) simgesine dokunun ➔ Web Sitesi Ayarları ➔ Mikrofon ➔ 'İzin Ver' seçin. Veya iOS Ayarları ➔ Safari ➔ Mikrofon.",
    chromeGuideTitle: "Android / Chrome:",
    chromeGuideText: "Adres yanındaki kilit/ayar simgesine dokunun ➔ İzinler ➔ Mikrofon ➔ İzin Ver.",
    noSpeech: "Herhangi bir konuşma algılanmadı. Tekrar konuşmayı deneyin.",
    error: "Sesli giriş başlatılamadı. Tekrar deneyin.",
    close: "Tamam",
  },
} as const;

export function appendVoiceTranscript(current: string, transcript: string, maxLength: number): string {
  const spoken = transcript.trim();
  if (!spoken) return current.slice(0, maxLength);
  const separator = current.length > 0 && !/\s$/.test(current) ? " " : "";
  return `${current}${separator}${spoken}`.slice(0, maxLength);
}

export function voiceErrorMessageKey(error: string): "denied" | "noSpeech" | "error" {
  if (error === "not-allowed" || error === "service-not-allowed" || error === "permission-denied") return "denied";
  if (error === "no-speech") return "noSpeech";
  return "error";
}
