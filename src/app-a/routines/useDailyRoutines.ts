import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RoutineCompletion,
  RoutineExecutionStatus,
  SharedRoutine,
} from "../../shared/domain/routines";
import { isRoutineScheduledOnDate } from "../../shared/domain/routines";
import {
  clearRoutineCompletion,
  loadRoutines,
  loadRoutineCompletions,
  recordRoutineCompletion,
} from "../../shared/persistence/routines";
import { getLocalDateInTimeZone, getPastLocalDates } from "./date";
import { getEffectiveTimeZone, loadAppAPreferences } from '../settings/preferences';

export function useDailyRoutines(userId?: string | null) {
  const requestVersion = useRef(0);
  const writing = useRef(false);
  const [routines, setRoutines] = useState<SharedRoutine[]>([]);
  const [completions, setCompletions] = useState<RoutineCompletion[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [updatingRoutineId, setUpdatingRoutineId] = useState<string | null>(null);
  const [localDate, setLocalDate] = useState(() => getLocalDateInTimeZone(new Date(), getEffectiveTimeZone(loadAppAPreferences())));
  useEffect(() => {
    const refreshDate = () => setLocalDate(getLocalDateInTimeZone(new Date(), getEffectiveTimeZone(loadAppAPreferences())));
    const timer = window.setInterval(refreshDate, 15_000);
    window.addEventListener('focus', refreshDate);
    window.addEventListener('app-a-navigation', refreshDate);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshDate); window.removeEventListener('app-a-navigation', refreshDate); };
  }, []);
  const dates = useMemo(() => getPastLocalDates(localDate, 7), [localDate]);

  const refresh = useCallback(async () => {
    if (writing.current) return;
    const version = ++requestVersion.current;
    if (!userId) {
      setRoutines([]);
      setCompletions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextRoutines, nextCompletions] = await Promise.all([
        loadRoutines(userId),
        loadRoutineCompletions(userId, dates[0], dates[dates.length - 1]),
      ]);
      if (version !== requestVersion.current) return;
      setRoutines(nextRoutines);
      setCompletions(nextCompletions);
    } catch {
      if (version === requestVersion.current) setError("routine_load_failed");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [dates, userId]);

  useEffect(() => {
    void refresh();
    const reload = () => { void refresh(); };
    window.addEventListener('app-a-routines-changed', reload);
    window.addEventListener('app-a-navigation', reload);
    window.addEventListener('focus', reload);
    return () => {
      requestVersion.current++;
      window.removeEventListener('app-a-routines-changed', reload);
      window.removeEventListener('app-a-navigation', reload);
      window.removeEventListener('focus', reload);
    };
  }, [refresh]);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ completedScopes?: string[] }>;
      const completed = customEvent.detail?.completedScopes;
      if (!completed || completed.includes("routines_shared")) {
        void refresh();
      }
    };
    window.addEventListener("app-a-data-reset", handleReset);
    return () => window.removeEventListener("app-a-data-reset", handleReset);
  }, [refresh]);

  const todayRoutines = useMemo(
    () => routines.filter((routine) => {
      return routine.status === 'active' && isRoutineScheduledOnDate(routine, localDate);
    }),
    [routines, localDate],
  );

  const record = useCallback(
    async (routineId: string, status: RoutineExecutionStatus | "not_recorded") => {
      if (!userId || writing.current) return;
      const routine = routines.find((item) => item.id === routineId);
      if (!routine) return;
      writing.current = true;
      requestVersion.current++;
      setLoading(false);
      const completionDate = getLocalDateInTimeZone(new Date(), getEffectiveTimeZone(loadAppAPreferences()));
      const previous = completions;
      const now = new Date().toISOString();
      setUpdatingRoutineId(routineId);
      setError(null);
      try {
        if (status === "not_recorded") {
          setCompletions((items) =>
            items.filter((item) => !(item.routineId === routineId && item.localDate === completionDate)),
          );
          await clearRoutineCompletion(userId, routineId, completionDate);
        } else {
          const completion: RoutineCompletion = {
            routineId,
            localDate: completionDate,
            status,
            sourceApp: "app_a",
            recordedAt: now,
            completedAt: status === "full" || status === "minimum" ? now : undefined,
          };
          setCompletions((items) => [
            ...items.filter(
              (item) => !(item.routineId === routineId && item.localDate === completionDate),
            ),
            completion,
          ]);
          await recordRoutineCompletion(userId, completion);
        }
      } catch {
        setCompletions(previous);
        setError("routine_save_failed");
      } finally {
        writing.current = false;
        setUpdatingRoutineId(null);
        window.dispatchEvent(new Event('app-a-routines-changed'));
      }
    },
    [completions, routines, updatingRoutineId, userId],
  );

  return {
    routines,
    todayRoutines,
    completions,
    dates,
    localDate,
    loading,
    error,
    updatingRoutineId,
    refresh,
    record,
  };
}
