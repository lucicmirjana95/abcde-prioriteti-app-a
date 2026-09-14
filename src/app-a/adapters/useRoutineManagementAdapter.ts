import { useMemo } from "react";
import { RoutineManagementController } from "../domain/routines/RoutineManagementController";
import {
  createRoutine,
  updateRoutine,
  permanentDeleteRoutine
} from "../../shared/persistence/routines/routineRepository";

export function useRoutineManagementAdapter() {
  const controller = useMemo(() => {
    return new RoutineManagementController({
      createRoutine,
      updateRoutine,
      permanentDeleteRoutine,
    });
  }, []);

  return { controller };
}
