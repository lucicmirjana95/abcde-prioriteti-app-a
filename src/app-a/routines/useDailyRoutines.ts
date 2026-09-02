import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  RoutineCompletion,
  RoutineExecutionStatus,
  SharedRoutine,
} from "../../shared/domain/routines";
import { isRoutineScheduledOnDate } from "../../shared/domain/routines";
import {
  clearRoutineCompletion,
  loadActiveRoutines,
  loadRoutineCompletions,
  recordRoutineCompletion,
} from "../../shared/persistence/routines";
import { getLocalDateInTimeZone, getPastLocalDates } from "./date";

const DEFAULT_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function useDailyRoutines(userId?: string | null) {
  const [routines, setRoutines] = useState<SharedRoutine[]>([]);
  const [completions, setCompletions] = useState<RoutineCompletion[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [updatingRoutineId, setUpdatingRoutineId] = useState<string | null>(null);
  const localDate = getLocalDateInTimeZone(new Date(), DEFAULT_TIME_ZONE);
  const dates = useMemo(() => getPastLocalDates(localDate, 7), [localDate]);

  const refresh = useCallback(async () => {
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
        loadActiveRoutines(userId),
        loadRoutineCompletions(userId, dates[0], dates[dates.length - 1]),
      ]);
      setRoutines(nextRoutines);
      setCompletions(nextCompletions);
    } catch {
      setError("routine_load_failed");
    } finally {
      setLoading(false);
    }
  }, [dates, userId]);

  useEffect(() => {
    void refresh();
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
      const routineLocalDate = getLocalDateInTimeZone(new Date(), routine.timeZone);
      return isRoutineScheduledOnDate(routine, routineLocalDate);
    }),
    [routines],
  );

  const record = useCallback(
    async (routineId: string, status: RoutineExecutionStatus | "not_recorded") => {
      if (!userId || updatingRoutineId) return;
      const routine = routines.find((item) => item.id === routineId);
      if (!routine) return;
      const completionDate = getLocalDateInTimeZone(new Date(), routine.timeZone);
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
        setUpdatingRoutineId(null);
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
