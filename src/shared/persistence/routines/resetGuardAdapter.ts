import { isResetBlocked as realIsResetBlocked } from "../../../app-a/persistence/resetGuard";

export const resetGuardAdapter = {
  isResetBlocked: realIsResetBlocked,
};
