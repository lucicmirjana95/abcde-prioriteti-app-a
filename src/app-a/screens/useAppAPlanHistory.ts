import { useEffect, useState, useRef } from "react";
import { useAppAAuth } from "../auth/useAppAAuth";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";
import { loadRecentDailyPlans } from "../persistence/dailyPlanRepository";
import { useDataRefresh } from '../persistence/useDataRefresh';

export function useAppAPlanHistory(maximum = 30) {
  const refreshVersion = useDataRefresh();
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const [plans, setPlans] = useState<AppADailyPlanDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const loadedUser = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    const targetUserId = user?.uid || "guest";

    let cancelled = false;
    if (loadedUser.current !== targetUserId) setLoading(true);
    setError(false);
    void loadRecentDailyPlans(targetUserId, maximum)
      .then((nextPlans) => {
        if (!cancelled) {
          loadedUser.current = targetUserId;
          setPlans(nextPlans);
        }
      })
      .catch(() => {
        // Keep already loaded history usable when only a background refresh fails.
        if (!cancelled && loadedUser.current !== targetUserId) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, maximum, reloadKey, user, refreshVersion]);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ completedScopes?: string[] }>;
      const completed = customEvent.detail?.completedScopes;
      if (!completed || completed.includes("app_a_daily")) {
        setPlans([]);
        setReloadKey((value) => value + 1);
      }
    };
    window.addEventListener("app-a-data-reset", handleReset);
    return () => window.removeEventListener("app-a-data-reset", handleReset);
  }, []);

  const signIn = async () => {
    setError(false);
    try {
      await signInWithGoogle();
    } catch {
      setError(true);
    }
  };

  return {
    user,
    authReady,
    plans,
    loading,
    error,
    signIn,
    retry: () => setReloadKey((value) => value + 1),
  };
}
