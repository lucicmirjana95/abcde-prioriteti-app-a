import { useState } from "react";
import { LogIn, UserRound } from "lucide-react";
import type { AppALanguage } from "../types";
import { useAppAAuth } from "../auth/useAppAAuth";

const COPY = {
  en: { loading: "Checking account…", guest: "Guest mode", signedIn: "Signed in", signedOut: "Not signed in", signIn: "Sign in", connectGoogle: "Sync with Google", retry: "Try again", error: "Sign-in was not completed." },
  sr: { loading: "Provera naloga…", guest: "Gost profil", signedIn: "Prijavljeni ste", signedOut: "Niste prijavljeni", signIn: "Prijavi se", connectGoogle: "Poveži Google", retry: "Pokušaj ponovo", error: "Prijava nije završena." },
  tr: { loading: "Hesap kontrol ediliyor…", guest: "Misafir modu", signedIn: "Giriş yapıldı", signedOut: "Giriş yapılmadı", signIn: "Giriş yap", connectGoogle: "Google ile Senkronize Et", retry: "Tekrar dene", error: "Giriş tamamlanmadı." },
} as const;

export default function AccountStatus({ language, compact = false }: { language: AppALanguage; compact?: boolean }) {
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const [signInError, setSignInError] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const t = COPY[language] || COPY.en;
  const isAnon = user?.isAnonymous;
  const label = !authReady ? t.loading : user ? (user.displayName || (isAnon ? t.guest : t.signedIn)) : t.signedOut;
  const startSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    setSignInError(false);
    try { await signInWithGoogle(); }
    catch { setSignInError(true); }
    finally { setSigningIn(false); }
  };
  if (compact) {
    return user && !isAnon ? (
      <span
        role="status"
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/15"
        aria-label={`${t.signedIn}: ${label}`}
        title={label}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover rounded-full" />
        ) : (
          <UserRound className="h-4 w-4" />
        )}
      </span>
    ) : (
      <button
        type="button"
        disabled={!authReady || signingIn}
        onClick={() => void startSignIn()}
        className="app-a-focus-ring inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[var(--app-a-text-secondary)] hover:text-[var(--app-a-text)]"
        style={signInError ? { color: "var(--app-a-danger)" } : undefined}
        aria-label={signInError ? `${t.error} ${t.retry}` : isAnon ? t.connectGoogle : t.signIn}
        title={isAnon ? t.connectGoogle : t.signIn}
      >
        <LogIn className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{signInError ? t.retry : isAnon ? t.connectGoogle : t.signIn}</span>
      </button>
    );
  }
  return <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--app-a-border)" }}>
    <div className="flex items-center gap-3 rounded-xl px-3 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: "var(--app-a-disabled-bg)" }}>
        {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[12px] font-semibold">{label}</p>
        {user && !isAnon && label !== t.signedIn ? <p className="text-[11px]" style={{ color: "var(--app-a-text-tertiary)" }}>{t.signedIn}</p> : null}
        {isAnon ? <p className="text-[11px]" style={{ color: "var(--app-a-text-tertiary)" }}>{t.guest}</p> : null}
      </div>
      {(!user || isAnon) && authReady ? (
        <button
          type="button"
          disabled={signingIn}
          onClick={() => void startSignIn()}
          className="app-a-focus-ring rounded-lg px-2 py-1 text-[11px] font-semibold"
          style={{ color: signInError ? "var(--app-a-danger)" : "var(--app-a-accent)" }}
        >
          {signInError ? t.retry : isAnon ? t.connectGoogle : t.signIn}
        </button>
      ) : null}
    </div>
    {signInError ? <p role="alert" className="px-3 pb-1 text-[11px]" style={{ color: "var(--app-a-danger)" }}>{t.error}</p> : null}
  </div>;
}
