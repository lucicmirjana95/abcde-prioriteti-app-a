import { useMemo } from "react";
import type { InboxAdapter } from "./inboxAdapter";
import { productionInboxAdapter } from "./inboxAdapter";

export function useInboxAdapter(customAdapter?: InboxAdapter): InboxAdapter {
  return useMemo(() => {
    return customAdapter || productionInboxAdapter;
  }, [customAdapter]);
}
