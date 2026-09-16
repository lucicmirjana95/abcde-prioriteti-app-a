import type { RoutineCompletion, SharedRoutine } from "../../domain/routines";
import {
  validateRoutineCompletion,
  validateSharedRoutine,
} from "../../domain/routines";

export type RoutineDocument = SharedRoutine;
export type RoutineCompletionDocument = RoutineCompletion;

export function isRoutineDocument(value: unknown): value is RoutineDocument {
  return validateSharedRoutine(value).valid;
}

export function isRoutineCompletionDocument(
  value: unknown,
): value is RoutineCompletionDocument {
  return validateRoutineCompletion(value).valid;
}

