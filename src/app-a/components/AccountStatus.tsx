import { useState } from "react";
import { LogIn, UserRound } from "lucide-react";
import type { AppALanguage } from "../types";
import { useAppAAuth } from "../auth/useAppAAuth";

const COPY = {
  en: { loading: "Checking account…", signedIn: "Signed in", signedOut: "Not signed in", signIn: "Sign in", retry: "Try again", error: "Sign-in was not completed." },
  sr: { loading: "Provera naloga…", signedIn: "Prijavljeni ste", signedOut: "Niste prijavljeni", signIn: "Prijavi se", retry: "Pokušaj ponovo", error: "Prijava nije završena." },
  tr: { loading: "Hesap kontrol ediliyor…", signedIn: "Giriş yapıldı", signedOut: "Giriş yapılmadı", signIn: "Giriş yap", retry: "Tekrar dene", error: "Giriş tamamlanmadı." },
} as const;

export default function AccountStatus({ language, compact = false }: { language: AppALanguage; compact?: boolean }) {
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const [signInError, setSignInError] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const t = COPY[language];
  const label = !authReady ? t.loading : user ? (user.displayName || t.signedIn) : t.signedOut;
  const startSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    setSignInError(false);
    try { await signInWithGoogle(); }
    catch { setSignInError(true); }
    finally { setSigningIn(false); }
  };
  if (compact) {
    return user ? <span role="status" className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full" aria-label={`${t.signedIn}: ${label}`} title={label}>
      {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
    </span> : <button type="button" disabled={!authReady || signingIn} onClick={() => void startSignIn()} className="app-a-focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold" style={signInError ? { color: "var(--app-a-danger)" } : undefined} aria-label={signInError ? `${t.error} ${t.retry}` : t.signIn}><LogIn className="h-4 w-4" />{signInError ? t.retry : t.signIn}</button>;
  }
  return <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--app-a-border)" }}>
    <div className="flex items-center gap-3 rounded-xl px-3 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: "var(--app-a-disabled-bg)" }}>
        {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1"><p className="break-words text-[12px] font-semibold">{label}</p>{user && label !== t.signedIn ? <p className="text-[11px]" style={{ color: "var(--app-a-text-tertiary)" }}>{t.signedIn}</p> : null}</div>
      {!user && authReady ? <button type="button" disabled={signingIn} onClick={() => void startSignIn()} className="app-a-focus-ring rounded-lg px-2 py-1 text-[12px] font-semibold" style={{ color: signInError ? "var(--app-a-danger)" : "var(--app-a-accent)" }}>{signInError ? t.retry : t.signIn}</button> : null}
    </div>
    {signInError ? <p role="alert" className="px-3 pb-1 text-[11px]" style={{ color: "var(--app-a-danger)" }}>{t.error}</p> : null}
  </div>;
}
