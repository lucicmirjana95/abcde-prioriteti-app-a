import { useEffect, useState } from "react";
import { useAppAAuth } from "../auth/useAppAAuth";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";
import { loadRecentDailyPlans } from "../persistence/dailyPlanRepository";

export function useAppAPlanHistory(maximum = 30) {
  const { user, authReady, signInWithGoogle } = useAppAAuth();
  const [plans, setPlans] = useState<AppADailyPlanDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setPlans([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    void loadRecentDailyPlans(user.uid, maximum)
      .then((nextPlans) => {
        if (!cancelled) setPlans(nextPlans);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, maximum, reloadKey, user]);

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
