import type { AppALanguage } from "../../types";
import { computeDeterministicDigest128 } from "../rollover/contracts";

export type InboxItemKind = "task" | "waiting_for";
export type InboxItemHorizon = "this_week" | "later";
export type InboxItemStatus = "inbox" | "scheduled" | "waiting" | "completed" | "archived";
export type InboxItemSource = "manual" | "daily_reset" | "rollover";

export interface AppAInboxItem {
  id: string;
  title: string;
  details?: string;
  kind: InboxItemKind;
  horizon: InboxItemHorizon;
  status: InboxItemStatus;
  estimatedMinutes?: number;
  scheduledLocalDate?: string;
  waitingOn?: string;
  source: InboxItemSource;
  sourceLocalDate?: string;
  sourceItemId?: string;
  language: AppALanguage;
  createdAt: string;
  updatedAt: string;
}

export function createImportedInboxItemId(sourceLocalDate: string, sourceItemId: string): string {
  return `in_${computeDeterministicDigest128(`${sourceLocalDate}\u0000${sourceItemId}`)}`;
}

export function createManualInboxItemId(): string {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `in_manual_${random.slice(0, 48)}`;
}

export function isLocalDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isAppAInboxItem(value: unknown): value is AppAInboxItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AppAInboxItem>;
  return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 128
    && typeof item.title === "string" && item.title.trim().length >= 1 && item.title.length <= 500
    && (item.kind === "task" || item.kind === "waiting_for")
    && (item.horizon === "this_week" || item.horizon === "later")
    && ["inbox", "scheduled", "waiting", "completed", "archived"].includes(item.status || "")
    && ["manual", "daily_reset", "rollover"].includes(item.source || "")
    && (item.language === "en" || item.language === "sr" || item.language === "tr")
    && typeof item.createdAt === "string" && typeof item.updatedAt === "string"
    && (item.estimatedMinutes === undefined || (Number.isInteger(item.estimatedMinutes) && item.estimatedMinutes > 0 && item.estimatedMinutes <= 1440))
    && (item.scheduledLocalDate === undefined || isLocalDate(item.scheduledLocalDate));
}

export function normalizeInboxTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
