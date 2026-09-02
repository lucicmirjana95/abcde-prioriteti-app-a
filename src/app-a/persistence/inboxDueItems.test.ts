import assert from "node:assert/strict";
import type { AppAInboxItem } from "../domain/inbox/contracts";
import { dueScheduledInboxItems } from "./inboxRepository";

const base: AppAInboxItem = { id: "one", title: "Task", kind: "task", horizon: "later", status: "scheduled", scheduledLocalDate: "2026-09-02", source: "manual", language: "en", createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z" };
const result = dueScheduledInboxItems([
  base,
  { ...base, id: "overdue", scheduledLocalDate: "2026-09-01" },
  { ...base, id: "future", scheduledLocalDate: "2026-09-03" },
  { ...base, id: "ordinary", status: "inbox" },
], "2026-09-02");
assert.deepEqual(result.map((item) => item.id), ["one", "overdue"]);
console.log("Due Inbox item tests passed.");
