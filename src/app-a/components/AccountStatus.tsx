import { LogIn, UserRound } from "lucide-react";
import type { AppALanguage } from "../types";
import { useAppAAuth } from "../auth/useAppAAuth";

const COPY = {
  en: { loading: "Checking account…", signedIn: "Signed in", signedOut: "Not signed in", signIn: "Sign in" },
  sr: { loading: "Provera naloga…", signedIn: "Prijavljeni ste", signedOut: "Niste prijavljeni", signIn: "Prijavi se" },
  tr: { loading: "Hesap kontrol ediliyor…", signedIn: "Giriş yapıldı", signedOut: "Giriş yapılmadı", signIn: "Giriş yap" },
} as const;

export default function AccountStatus({ language, compact = false }: { language: AppALanguage; compact?: boolean }) {
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const t = COPY[language];
  const label = !authReady ? t.loading : user ? (user.displayName || user.email || t.signedIn) : t.signedOut;
  if (compact) {
    return user ? <button type="button" className="app-a-focus-ring flex h-9 w-9 items-center justify-center overflow-hidden rounded-full" aria-label={`${t.signedIn}: ${label}`} title={label}>
      {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
    </button> : <button type="button" disabled={!authReady} onClick={() => void signInWithGoogle()} className="app-a-focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold"><LogIn className="h-4 w-4" />{t.signIn}</button>;
  }
  return <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--app-a-border)" }}>
    <div className="flex items-center gap-3 rounded-xl px-3 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: "var(--app-a-disabled-bg)" }}>
        {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{label}</p><p className="text-[11px]" style={{ color: "var(--app-a-text-tertiary)" }}>{user ? t.signedIn : authReady ? t.signedOut : t.loading}</p></div>
      {!user && authReady ? <button type="button" onClick={() => void signInWithGoogle()} className="app-a-focus-ring rounded-lg px-2 py-1 text-[12px] font-semibold" style={{ color: "var(--app-a-accent)" }}>{t.signIn}</button> : null}
    </div>
  </div>;
}
