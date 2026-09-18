import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RoutineAvailabilityResult,
  RoutineCompletion,
  RoutineExecutionStatus,
  SharedRoutine,
} from "../../shared/domain/routines";
import {
  getRoutineAvailabilityForDate,
  isRoutineDeterministicallyScheduledOnDate,
  isRoutineScheduledOnDate,
} from "../../shared/domain/routines";
import {
  clearRoutineCompletion,
  loadRoutines,
  loadRoutineCompletions,
  recordRoutineCompletion,
} from "../../shared/persistence/routines";
import {
  loadPlannedRoutineIds,
  togglePlannedRoutineForDate,
} from "../persistence/dailyPlanRepository";
import { getLocalDateInTimeZone, getPastLocalDates } from "./date";
import { getEffectiveTimeZone, getEffectiveDayResetHour, loadAppAPreferences } from "../settings/preferences";

export interface PlannedRoutinePersistence {
  load(userId: string, localDate: string): Promise<string[]>;
  toggle(userId: string, localDate: string, routineId: string, planned: boolean): Promise<string[]>;
}

const defaultPlannedRoutinePersistence: PlannedRoutinePersistence = {
  load: loadPlannedRoutineIds,
  toggle: togglePlannedRoutineForDate,
};

function getCurrentLocalDate(): string {
  const prefs = loadAppAPreferences();
  return getLocalDateInTimeZone(new Date(), getEffectiveTimeZone(prefs), getEffectiveDayResetHour(prefs));
}

export function useDailyRoutines(
  userId?: string | null,
  initialPlannedRoutineIds?: string[],
  plannedRoutinePersistence: PlannedRoutinePersistence = defaultPlannedRoutinePersistence,
) {
  const requestVersion = useRef(0);
  const writing = useRef(false);
  const planningWrite = useRef(false);
  const [routines, setRoutines] = useState<SharedRoutine[]>([]);
  const [completions, setCompletions] = useState<RoutineCompletion[]>([]);
  const [plannedRoutineIds, setPlannedRoutineIds] = useState<string[]>(
    initialPlannedRoutineIds || [],
  );
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [updatingRoutineId, setUpdatingRoutineId] = useState<string | null>(null);
  const [localDate, setLocalDate] = useState(() => getCurrentLocalDate());

  useEffect(() => {
    if (initialPlannedRoutineIds) {
      setPlannedRoutineIds(initialPlannedRoutineIds);
    }
  }, [initialPlannedRoutineIds]);

  useEffect(() => {
    const refreshDate = () => setLocalDate(getCurrentLocalDate());
    const timer = window.setInterval(refreshDate, 15_000);
    window.addEventListener("focus", refreshDate);
    window.addEventListener("app-a-navigation", refreshDate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshDate);
      window.removeEventListener("app-a-navigation", refreshDate);
    };
  }, []);

  const dates = useMemo(() => getPastLocalDates(localDate, 7), [localDate]);

  const refresh = useCallback(async () => {
    if (writing.current || planningWrite.current) return;
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
      const [nextRoutines, nextCompletions, nextPlannedIds] = await Promise.all([
        loadRoutines(userId),
        loadRoutineCompletions(userId, dates[0], dates[dates.length - 1]),
        plannedRoutinePersistence.load(userId, localDate).catch(() => []),
      ]);
      if (version !== requestVersion.current) return;
      setRoutines(nextRoutines);
      setCompletions(nextCompletions);
      if (!initialPlannedRoutineIds) {
        setPlannedRoutineIds(nextPlannedIds);
      }
    } catch {
      if (version === requestVersion.current) setError("routine_load_failed");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [dates, initialPlannedRoutineIds, localDate, plannedRoutinePersistence, userId]);

  useEffect(() => {
    void refresh();
    const reload = () => {
      void refresh();
    };
    window.addEventListener("app-a-routines-changed", reload);
    window.addEventListener("app-a-navigation", reload);
    window.addEventListener("focus", reload);
    return () => {
      requestVersion.current++;
      window.removeEventListener("app-a-routines-changed", reload);
      window.removeEventListener("app-a-navigation", reload);
      window.removeEventListener("focus", reload);
    };
  }, [refresh]);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ completedScopes?: string[] }>;
      const completed = customEvent.detail?.completedScopes;
      if (!completed || completed.includes("routines_shared") || completed.includes("app_a_daily")) {
        setPlannedRoutineIds([]);
        void refresh();
      }
    };
    window.addEventListener("app-a-data-reset", handleReset);
    return () => window.removeEventListener("app-a-data-reset", handleReset);
  }, [refresh]);

  const availabilityMap = useMemo(() => {
    const effectiveTimeZone = getEffectiveTimeZone(loadAppAPreferences());
    const map = new Map<string, RoutineAvailabilityResult>();
    const plannedSet = new Set(plannedRoutineIds);
    for (const r of routines) {
      const avail = getRoutineAvailabilityForDate({
        routine: r,
        localDate,
        timeZone: effectiveTimeZone,
        completions,
        isExplicitlyPlannedToday: plannedSet.has(r.id),
      });
      map.set(r.id, avail);
    }
    return map;
  }, [routines, localDate, completions, plannedRoutineIds]);

  const todayRoutines = useMemo(() => {
    return routines.filter((routine) => {
      if (routine.status !== "active") return false;
      const avail = availabilityMap.get(routine.id);
      return avail ? avail.isPlannedToday : isRoutineScheduledOnDate(routine, localDate);
    });
  }, [routines, availabilityMap, localDate]);

  const flexibleAvailableRoutines = useMemo(() => {
    return routines.filter((routine) => {
      if (routine.status !== "active") return false;
      const avail = availabilityMap.get(routine.id);
      return avail?.status === "available_flexible";
    });
  }, [routines, availabilityMap]);

  const togglePlannedRoutine = useCallback(
    async (routineId: string, planned?: boolean) => {
      if (!userId || planningWrite.current) return;

      const previous = plannedRoutineIds;
      const isCurrentlyPlanned = previous.includes(routineId);
      const shouldPlan = planned !== undefined ? planned : !isCurrentlyPlanned;
      const optimistic = shouldPlan
        ? Array.from(new Set([...previous, routineId]))
        : previous.filter((id) => id !== routineId);

      setUpdatingRoutineId(routineId);
      planningWrite.current = true;
      setError(null);
      setPlannedRoutineIds(optimistic);
      try {
        const persisted = await plannedRoutinePersistence.toggle(
          userId,
          localDate,
          routineId,
          shouldPlan,
        );
        setPlannedRoutineIds(persisted);
        window.dispatchEvent(new Event("app-a-routines-changed"));
      } catch {
        setPlannedRoutineIds(previous);
        setError("routine_save_failed");
      } finally {
        planningWrite.current = false;
        setUpdatingRoutineId(null);
      }
    },
    [localDate, plannedRoutineIds, plannedRoutinePersistence, userId],
  );

  const record = useCallback(
    async (routineId: string, status: RoutineExecutionStatus | "not_recorded") => {
      if (!userId || writing.current) return;
      const routine = routines.find((item) => item.id === routineId);
      if (!routine) return;
      writing.current = true;
      requestVersion.current++;
      setLoading(false);
      const effectiveTimeZone = getEffectiveTimeZone(loadAppAPreferences());
      const completionDate = getLocalDateInTimeZone(new Date(), effectiveTimeZone);
      const previous = completions;
      const now = new Date().toISOString();
      setUpdatingRoutineId(routineId);
      setError(null);
      try {
        if (status === "not_recorded") {
          setCompletions((items) =>
            items.filter(
              (item) => !(item.routineId === routineId && item.localDate === completionDate),
            ),
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
            timeZone: effectiveTimeZone,
          };
          setCompletions((items) => [
            ...items.filter(
              (item) => !(item.routineId === routineId && item.localDate === completionDate),
            ),
            completion,
          ]);
          await recordRoutineCompletion(userId, completion, effectiveTimeZone);
        }
      } catch {
        setCompletions(previous);
        setError("routine_save_failed");
      } finally {
        writing.current = false;
        setUpdatingRoutineId(null);
        window.dispatchEvent(new Event("app-a-routines-changed"));
      }
    },
    [completions, routines, userId],
  );

  return {
    routines,
    todayRoutines,
    flexibleAvailableRoutines,
    plannedRoutineIds,
    availabilityMap,
    completions,
    dates,
    localDate,
    loading,
    error,
    updatingRoutineId,
    refresh,
    record,
    togglePlannedRoutine,
  };
}
