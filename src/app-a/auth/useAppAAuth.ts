import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

export function useAppAAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        try {
          const credential = await signInAnonymously(auth);
          setUser(credential.user);
        } catch (err) {
          console.warn("Anonymous auth initialization fallback:", err);
          setUser(null);
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
