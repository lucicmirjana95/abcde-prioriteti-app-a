import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

function isLocalDevEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof import.meta !== "undefined" && Boolean(import.meta.env?.PROD)) return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

function getLocalPreviewUser(): User | null {
  if (!isLocalDevEnvironment()) return null;
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const isDemo = params.get("demo") !== null;
  const isPreview = params.get("preview") === "true";
  const hasLocalFlag = window.localStorage.getItem("app_a_local_preview") === "true";
  if (isDemo || isPreview || hasLocalFlag) {
    return {
      uid: "local_preview_user",
      email: "preview@localhost",
      displayName: "Local Preview",
    } as unknown as User;
  }
  return null;
}

export function useAppAAuth() {
  const [user, setUser] = useState<User | null>(() => {
    if (auth.currentUser) return auth.currentUser;
    if (typeof window !== "undefined" && window.localStorage.getItem("app_a_test_user_v1")) {
      return {
        uid: "test_user_app_a",
        email: "test@appa.local",
        displayName: "App A Tester",
      } as unknown as User;
    }
    const previewUser = getLocalPreviewUser();
    if (previewUser) return previewUser;
    return null;
  });
  const [authReady, setAuthReady] = useState(() => {
    if (auth.currentUser) return true;
    if (typeof window !== "undefined" && window.localStorage.getItem("app_a_test_user_v1")) {
      return true;
    }
    if (getLocalPreviewUser()) return true;
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("app_a_test_user_v1")) {
      setUser({
        uid: "test_user_app_a",
        email: "test@appa.local",
        displayName: "App A Tester",
      } as unknown as User);
      setAuthReady(true);
      return;
    }

    const previewUser = getLocalPreviewUser();
    if (previewUser) {
      setUser(previewUser);
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        try {
          const credential = await signInAnonymously(auth);
          setUser(credential.user);
        } catch (err) {
          console.warn("Anonymous auth initialization fallback:", err);
          if (isLocalDevEnvironment()) {
            setUser({
              uid: "local_dev_user",
              email: "dev@localhost",
              displayName: "Local Dev User",
            } as unknown as User);
          } else {
            setUser(null);
          }
        }
      } else {
        setUser(nextUser);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  };

  return { user, authReady, signInWithGoogle };
}
