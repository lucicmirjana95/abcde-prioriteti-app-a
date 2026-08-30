import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion } from "motion/react";
import { translations, Language } from "../translations";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  isEvening: boolean;
  onGoogleSignIn: () => Promise<void>;
  onEmailSignUp: (email: string, pass: string, name: string) => Promise<void>;
  onEmailSignIn: (email: string, pass: string) => Promise<void>;
}

export default function AuthModal({
  isOpen,
  onClose,
  language,
  isEvening,
  onGoogleSignIn,
  onEmailSignUp,
  onEmailSignIn,
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg(
        language === "en" ? "Please fill in all fields" : language === "tr" ? "Lütfen tüm alanları doldurun" : "Molimo popunite sva polja",
      );
      return;
    }
    if (password.length < 6) {
      setErrorMsg(
        language === "en" ? "Password must be at least 6 characters" : language === "tr" ? "Şifre en az 6 karakter olmalıdır" : "Lozinka mora imati najmanje 6 karaktera",
      );
      return;
    }
    if (authMode === "signup" && !displayName.trim()) {
      setErrorMsg(
        language === "en" ? "Please enter your name" : language === "tr" ? "Lütfen adınızı girin" : "Molimo unesite vaše ime",
      );
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (authMode === "signup") {
        await onEmailSignUp(email.trim(), password, displayName.trim());
        setSuccessMsg(
          language === "en" ? "Account created successfully!" : language === "tr" ? "Hesap başarıyla oluşturuldu!" : "Nalog je uspešno kreiran!",
        );
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        await onEmailSignIn(email.trim(), password);
        setSuccessMsg(
          language === "en" ? "Welcome back!" : language === "tr" ? "Tekrar hoşgeldiniz!" : "Dobrodošli nazad!",
        );
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let translatedError = err.message;
      if (
        err.code === "auth/email-already-in-use" ||
        err.message?.includes("email-already-in-use")
      ) {
        translatedError =
          language === "en" ? "Email is already registered" : language === "tr" ? "E-posta zaten kayıtlı" : "Ova email adresa je već registrovana";
      } else if (
        err.code === "auth/weak-password" ||
        err.message?.includes("weak-password")
      ) {
        translatedError =
          language === "en" ? "Weak password. Min 6 characters required" : language === "tr" ? "Zayıf şifre. En az 6 karakter gerekli" : "Lozinka je previše slaba. Potrebno je bar 6 karaktera";
      } else if (
        err.code === "auth/invalid-email" ||
        err.name === "auth/invalid-email" ||
        err.message?.includes("invalid-email")
      ) {
        translatedError =
          language === "en" ? "Invalid email address format" : language === "tr" ? "Geçersiz e-posta adresi biçimi" : "Neispravan format email adrese";
      } else if (
        err.code === "auth/wrong-password" ||
        err.message?.includes("wrong-password") ||
        err.message?.includes("invalid-credential")
      ) {
        translatedError =
          language === "en" ? "Incorrect email or password" : language === "tr" ? "Yanlış e-posta veya şifre" : "Netačan email ili lozinka";
      } else if (
        err.code === "auth/user-not-found" ||
        err.message?.includes("user-not-found")
      ) {
        translatedError =
          language === "en" ? "No account found with this email" : language === "tr" ? "Bu e-postaya ait hesap bulunamadı" : "Nije pronađen nalog sa ovom email adresom";
      }
      setErrorMsg(translatedError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await onGoogleSignIn();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      id="auth-modal-overlay"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1C1C1E]/60 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className={`relative w-full max-w-md rounded-xl border p-6 sm:p-8 overflow-hidden transition-all duration-300 ${
          isEvening
            ? "bg-[#1C1C1E] border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
            : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-black dark:text-white"
        }`}
        id="auth-modal-card"
      >
        {/* Glow effect on dark mode */}
        {isEvening && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#007AFF]/10 rounded-full blur-2xl pointer-events-none" />
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full cursor-pointer active:scale-95 transition-all ${
            isEvening
              ? "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-black/5 dark:bg-white/5 hover:text-white"
              : "text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:bg-[#E5E5EA] dark:bg-[#3A3A3C] hover:text-black dark:text-white"
          }`}
          aria-label="Close"
          id="btn-close-auth-modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header content */}
        <div className="text-center mb-6">
          <div
            className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
              isEvening
                ? "bg-[#1C1C1E] text-[#0A84FF] border border-black/5 dark:border-white/5"
                : "bg-[#007AFF]/10 text-[#007AFF]"
            }`}
          >
            <Sparkles className="w-6 h-6 transition-opacity" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold">
            {authMode === "signin"
              ? (t as any).authModalTitleSignIn
              : (t as any).authModalTitleSignUp}
          </h2>
          <p className="text-xs text-[#3C3C43] dark:text-[#EBEBF5]/80 mt-1.5 px-4">
            {language === "en" ? "Gain secure cross-device synchronization and durable backup for your ABCDE priorities." : language === "tr" ? "ABCDE öncelikleriniz için güvenli cihazlar arası senkronizasyon ve dayanıklı yedekleme elde edin." : "Dobijte bezbednu sinhronizaciju i trajno čuvanje svojih ABCDE prioriteta na svim uređajima."}
          </p>
        </div>

        {/* Message Banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-[#FF3B30] dark:bg-[#FF453A]/10 border border-[#FF3B30] dark:border-[#FF453A]/20 text-[#FF3B30] dark:text-[#FF453A] text-xs font-semibold flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-[#34C759] dark:bg-[#30D158]/10 border border-[#34C759] dark:border-[#30D158]/20 text-[#34C759] dark:text-[#30D158] text-xs font-semibold flex items-start gap-2 transition-opacity"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === "signup" && (
            <div className="space-y-1 text-left">
              <label className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block pl-1">
                {(t as any).authNameLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3C3C43] dark:text-[#EBEBF5]/80">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder={(t as any).authNamePlaceholder}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-[14px] font-medium border outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all ${
                    isEvening
                      ? "bg-[#1C1C1E] border border-white/5 text-white placeholder:text-[#EBEBF5]/40"
                      : "bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                  }`}
                />
              </div>
            </div>
          )}

          <div className="space-y-1 text-left">
            <label className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block pl-1">
              {(t as any).authEmailLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3C3C43] dark:text-[#EBEBF5]/80">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder={(t as any).authEmailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-[14px] font-medium border outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all ${
                  isEvening
                    ? "bg-[#1C1C1E] border border-white/5 text-white placeholder:text-[#EBEBF5]/40"
                    : "bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                }`}
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[13px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/80 block pl-1">
              {(t as any).authPasswordLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3C3C43] dark:text-[#EBEBF5]/80">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder={(t as any).authPasswordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-[14px] font-medium border outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] shadow-sm transition-all ${
                  isEvening
                    ? "bg-[#1C1C1E] border border-white/5 text-white placeholder:text-[#EBEBF5]/40"
                    : "bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#1C1C1E] text-black dark:text-[#EBEBF5]/90 placeholder:text-[#3C3C43]/60 dark:placeholder:text-[#EBEBF5]/40"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#3C3C43] dark:text-[#EBEBF5]/80 hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 dark:hover:text-[#3C3C43] dark:text-[#EBEBF5]/80 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Form Action Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-xs font-semibold active:scale-98 transition-all cursor-pointer ${
              loading
                ? "bg-black/5 dark:bg-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80 pointer-events-none opacity-50"
                : "bg-[#007AFF] text-white active:opacity-70 transition-opacity"
            }`}
            id="btn-auth-form-submit"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>{language === "en" ? "Processing..." : language === "tr" ? "İşleme..." : "Obrada..."}</span>
              </span>
            ) : (
              <span>
                {authMode === "signin"
                  ? (t as any).authActionSignIn
                  : (t as any).authActionSignUp}
              </span>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === "signin" ? "signup" : "signin");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`text-xs font-medium underline cursor-pointer hover:text-[#007AFF] transition-colors ${
              isEvening ? "text-[#0A84FF]" : "text-[#007AFF]"
            }`}
          >
            {authMode === "signin"
              ? (t as any).authSwitchToSignUp
              : (t as any).authSwitchToSignIn}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center my-5 text-[#3C3C43] dark:text-[#EBEBF5]/80 text-[13px] font-semibold">
          <div className="flex-1 border-t border-black/5 dark:border-white/5" />
          <span className="px-3">{(t as any).authOrDivider}</span>
          <div className="flex-1 border-t border-black/5 dark:border-white/5" />
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleClick}
          className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-semibold border cursor-pointer active:scale-98 transition-all hover:bg-[#F2F2F7] dark:bg-[#1C1C1E] dark:hover:bg-white/10 dark:bg-white/5 ${
            isEvening
              ? "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-white"
              : "bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
          }`}
          id="btn-google-auth-secondary"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{(t as any).googleSignIn}</span>
        </button>

        {/* Step-by-step guidance banner for Firebase Admin */}
        <div
          className={`mt-5 p-3 rounded-xl border text-left text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed relative ${
            isEvening
              ? "bg-black/40 border-black/5 dark:border-white/5 text-[#3C3C43] dark:text-[#EBEBF5]/80"
              : "bg-[#007AFF]/10 border-black/5 dark:border-white/5 text-[#007AFF] dark:text-[#0A84FF]"
          }`}
        >
          <div className="flex gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#007AFF]" />
            <div className="space-y-1">
              <span className="font-semibold tracking-wide block text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80">
                {language === "en" ? "Console Checklist" : language === "tr" ? "Konsol Kontrol Listesi" : "Uputstvo za Firebase konzolu"}
              </span>
              <p className="opacity-95">{(t as any).authFirebaseWarning}</p>
              <ol className="list-decimal pl-4 space-y-0.5 opacity-80 font-medium">
                <li>
                  {language === "en" ? "Go to Firebase Console" : language === "tr" ? "Firebase Konsoluna gidin" : "Otvorite Firebase konzolu"}
                </li>
                <li>
                  {language === "en" ? "Authentication -> Sign-in method" : language === "tr" ? "Kimlik doğrulama -> Oturum açma yöntemi" : "Idite na Authentication -> Sign-in method"}
                </li>
                <li>
                  {language === "en" ? "Add new provider -> Email/Password" : language === "tr" ? "Yeni sağlayıcı ekle -> E-posta/Şifre" : "Dodajte novog provajdera -> Email/Password"}
                </li>
                <li>
                  {language === "en" ? "Enable it and click Save" : language === "tr" ? "Etkinleştirin ve Kaydet'e tıklayın" : "Omogućite ga i sačuvajte izmene"}
                </li>
              </ol>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
