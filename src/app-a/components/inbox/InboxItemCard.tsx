import React, { useRef, useState } from "react";
import {
  CalendarPlus,
  Clock3,
  Compass,
  Ellipsis,
  FileText,
  Loader2,
} from "lucide-react";
import type { AppAInboxItem } from "../../domain/inbox/contracts";
import type { AppALanguage } from "../../types";
import type { SavedVisionStrategy } from "../../../shared/domain/vision";
import type { NoteClarification } from "../../api/noteClarificationApi";
import InboxOverflowMenu from "./InboxOverflowMenu";

export interface InboxItemCardProps {
  item: AppAInboxItem;
  language: AppALanguage;
  todayLocalDate: string;
  isProcessing: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onAddToday: (item: AppAInboxItem) => void;
  onUpdateStatus: (
    item: AppAInboxItem,
    status: AppAInboxItem["status"],
    extras?: { scheduledLocalDate?: string; waitingOn?: string; horizon?: AppAInboxItem["horizon"] }
  ) => void;
  onEditTitle: (item: AppAInboxItem, newTitle: string) => void;
  onDelete: (item: AppAInboxItem) => void;
  onConvertNote: (item: AppAInboxItem, actionTitle: string) => void;
  onDevelopVision: (item: AppAInboxItem) => void;
  onConnectVision: (item: AppAInboxItem, visionId: string) => void;
  onClarifyHelp: (noteText: string) => Promise<NoteClarification>;
  availableVisions: SavedVisionStrategy[];
  onError: (msg: string) => void;
  translations: {
    addToday: string;
    clarify: string;
    waitingOnLabel: string;
    waiting: string;
    waitingPrompt: string;
    waitingPlaceholder: string;
    saveWaiting: string;
    edit: string;
    editPlaceholder: string;
    saveEdit: string;
    cancel: string;
    more: string;
    sourceManual: string;
    sourceDailyReset: string;
    sourceRollover: string;
    note: string;
    minutes: string;
    scheduled: string;
    week: string;
    later: string;
    completed: string;
    archived: string;
    complete: string;
    archive: string;
    visionSelectPrompt: string;
    visionNone: string;
    schedule: string;
    scheduleAction: string;
    moveToWeek: string;
    markWaiting: string;
    restore: string;
    developVision: string;
    connectVision: string;
    delete: string;
    confirmDelete: string;
    confirmDeleteDesc: string;
    invalidDate: string;
    clarifyCopy: {
      clarify: string;
      prompt: string;
      save: string;
      help: string;
      keep: string;
      noSuggestion: string;
      retry: string;
    };
  };
}

export default function InboxItemCard({
  item,
  language,
  todayLocalDate,
  isProcessing,
  isMenuOpen,
  onToggleMenu,
  onAddToday,
  onUpdateStatus,
  onEditTitle,
  onDelete,
  onConvertNote,
  onDevelopVision,
  onConnectVision,
  onClarifyHelp,
  availableVisions,
  onError,
  translations: t,
}: InboxItemCardProps) {
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  // Card internal overlay modes
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [isWaitingPrompt, setIsWaitingPrompt] = useState(false);
  const [waitingOnText, setWaitingOnText] = useState(item.waitingOn || "");
  const [isConnectVision, setIsConnectVision] = useState(false);

  // Clarification state
  const [isClarifying, setIsClarifying] = useState(false);
  const [clarifiedAction, setClarifiedAction] = useState("");
  const [clarificationHelp, setClarificationHelp] = useState<NoteClarification | null>(null);
  const [clarificationLoading, setClarificationLoading] = useState(false);

  const isNote = item.kind === "note";
  const canAddToday = !isNote && (item.status === "inbox" || item.status === "waiting");

  const sourceLabel =
    item.source === "daily_reset"
      ? t.sourceDailyReset
      : item.source === "rollover"
      ? t.sourceRollover
      : t.sourceManual;

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title) {
      onEditTitle(item, trimmed);
    }
    setIsEditing(false);
  };

  const handleSaveWaiting = () => {
    onUpdateStatus(item, "waiting", { waitingOn: waitingOnText.trim() });
    setIsWaitingPrompt(false);
  };

  return (
    <article
      className="app-a-surface rounded-[16px] border p-4 transition-shadow"
      style={{ borderColor: "var(--app-a-border)" }}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                maxLength={500}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t.editPlaceholder}
                className="app-a-field app-a-focus-ring w-full px-3 py-2 text-[15px] font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setIsEditing(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="app-a-primary-button min-h-[38px] px-3 text-[13px]"
                >
                  {t.saveEdit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="app-a-secondary-button min-h-[38px] px-3 text-[13px]"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="break-words text-[16px] font-semibold leading-snug tracking-tight text-black dark:text-white">
                {item.title}
              </h2>
              {item.details ? (
                <p
                  className="mt-1 text-[13px] leading-relaxed break-words"
                  style={{ color: "var(--app-a-text-secondary)" }}
                >
                  {item.details}
                </p>
              ) : null}
              {item.waitingOn ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{t.waitingOnLabel} {item.waitingOn}</span>
                </p>
              ) : null}

              <div
                className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]"
                style={{ color: "var(--app-a-text-secondary)" }}
              >
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                  {sourceLabel}
                </span>

                {isNote ? (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {t.note}
                  </span>
                ) : (
                  <>
                    <span>
                      {item.status === "waiting"
                        ? t.waiting
                        : item.status === "scheduled"
                        ? `${t.scheduled}: ${item.scheduledLocalDate}`
                        : item.status === "completed"
                        ? t.completed
                        : item.status === "archived"
                        ? t.archived
                        : item.horizon === "this_week"
                        ? t.week
                        : t.later}
                    </span>
                    {item.estimatedMinutes ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {item.estimatedMinutes} {t.minutes}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Overflow Menu Trigger / Action Spinner */}
        <div className="relative shrink-0">
          {isProcessing ? (
            <div className="flex h-11 w-11 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-black/50 dark:text-white/50" />
            </div>
          ) : (
            <button
              ref={triggerButtonRef}
              type="button"
              aria-label={t.more}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              onClick={onToggleMenu}
              className="app-a-focus-ring flex h-11 w-11 items-center justify-center rounded-full border bg-black/[0.04] text-black transition-all hover:bg-black/[0.08] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
            >
              <Ellipsis className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Action Button */}
      {!isEditing && (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          {isNote ? (
            <button
              type="button"
              onClick={() => {
                setIsClarifying(true);
                setClarifiedAction("");
                setClarificationHelp(null);
              }}
              className="app-a-primary-button app-a-focus-ring min-h-[44px] px-3.5 text-[13px]"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              {t.clarifyCopy.clarify}
            </button>
          ) : canAddToday ? (
            <button
              type="button"
              onClick={() => onAddToday(item)}
              disabled={isProcessing}
              className="app-a-primary-button app-a-focus-ring min-h-[44px] px-3.5 text-[13px]"
            >
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              {t.addToday}
            </button>
          ) : item.status === "waiting" ? (
            <button
              type="button"
              onClick={() => {
                setIsWaitingPrompt(true);
                setWaitingOnText(item.waitingOn || "");
              }}
              className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-3.5 text-[13px]"
            >
              <Clock3 className="mr-1.5 h-4 w-4" />
              {t.waitingOnLabel} {item.waitingOn || t.waiting}
            </button>
          ) : null}
        </div>
      )}

      {/* Note Clarification Form */}
      {isClarifying ? (
        <div
          className="mt-3 rounded-xl border p-3.5"
          style={{
            borderColor: "var(--app-a-border)",
            background: "var(--app-a-surface-secondary)",
          }}
        >
          <label className="block text-[13px] font-semibold text-black dark:text-white">
            {t.clarifyCopy.prompt}
            <input
              autoFocus
              value={clarifiedAction}
              maxLength={500}
              onChange={(event) => setClarifiedAction(event.target.value)}
              className="app-a-field app-a-focus-ring mt-2 w-full px-3 py-2.5 text-[15px]"
            />
          </label>
          {clarificationHelp ? (
            <div
              className="mt-3 rounded-lg p-3 text-[13px]"
              style={{ background: "var(--app-a-surface)" }}
            >
              {clarificationHelp.questions.length ? (
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  {clarificationHelp.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              ) : null}
              {clarificationHelp.suggestions.length ? (
                <div className="flex flex-wrap gap-2">
                  {clarificationHelp.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setClarifiedAction(suggestion)}
                      className="app-a-secondary-button min-h-[40px] px-3 text-left text-[12px]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : !clarificationHelp.questions.length ? (
                <p style={{ color: "var(--app-a-text-secondary)" }}>
                  {t.clarifyCopy.noSuggestion}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={clarifiedAction.trim().length < 3 || isProcessing}
              onClick={() => {
                onConvertNote(item, clarifiedAction);
                setIsClarifying(false);
                setClarifiedAction("");
                setClarificationHelp(null);
              }}
              className="app-a-primary-button min-h-[44px] px-3.5 text-[13px]"
            >
              {t.clarifyCopy.save}
            </button>
            {!clarificationHelp ||
            (!clarificationHelp.questions.length && !clarificationHelp.suggestions.length) ? (
              <button
                type="button"
                disabled={clarificationLoading}
                onClick={() => {
                  setClarificationLoading(true);
                  onClarifyHelp(item.title)
                    .then(setClarificationHelp)
                    .catch(() => onError(t.invalidDate))
                    .finally(() => setClarificationLoading(false));
                }}
                className="app-a-secondary-button min-h-[44px] px-3.5 text-[13px]"
              >
                {clarificationLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                {clarificationHelp ? t.clarifyCopy.retry : t.clarifyCopy.help}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setIsClarifying(false);
                setClarificationHelp(null);
              }}
              className="app-a-secondary-button min-h-[44px] px-3.5 text-[13px]"
            >
              {clarifiedAction ? t.cancel : t.clarifyCopy.keep}
            </button>
          </div>
        </div>
      ) : null}

      {/* Waiting-for Input Dialog */}
      {isWaitingPrompt ? (
        <div
          className="mt-3 rounded-xl border p-3.5"
          style={{
            borderColor: "var(--app-a-border)",
            background: "var(--app-a-surface-secondary)",
          }}
        >
          <label className="block text-[13px] font-semibold text-black dark:text-white">
            {t.waitingPrompt}
            <input
              autoFocus
              value={waitingOnText}
              maxLength={300}
              onChange={(e) => setWaitingOnText(e.target.value)}
              placeholder={t.waitingPlaceholder}
              className="app-a-field app-a-focus-ring mt-2 w-full px-3 py-2 text-[14px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveWaiting();
                if (e.key === "Escape") setIsWaitingPrompt(false);
              }}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSaveWaiting}
              className="app-a-primary-button min-h-[44px] px-3.5 text-[13px]"
            >
              {t.saveWaiting}
            </button>
            <button
              type="button"
              onClick={() => setIsWaitingPrompt(false)}
              className="app-a-secondary-button min-h-[44px] px-3.5 text-[13px]"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {/* Connect Vision Picker */}
      {isConnectVision ? (
        <div
          className="mt-3 rounded-xl border p-3.5"
          style={{
            borderColor: "var(--app-a-border)",
            background: "var(--app-a-surface-secondary)",
          }}
        >
          <p className="text-[13px] font-semibold text-black dark:text-white">
            {t.visionSelectPrompt}
          </p>
          {availableVisions.length === 0 ? (
            <p className="mt-2 text-[12px]" style={{ color: "var(--app-a-text-secondary)" }}>
              {t.visionNone}
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {availableVisions.map((vis) => (
                <button
                  key={vis.id}
                  type="button"
                  onClick={() => {
                    onConnectVision(item, vis.id);
                    setIsConnectVision(false);
                  }}
                  className="app-a-focus-ring flex min-h-[44px] w-full items-center justify-between rounded-lg border p-2.5 text-left text-[13px] font-medium transition-all hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  style={{ borderColor: "var(--app-a-border)" }}
                >
                  <span className="font-semibold">{vis.idea}</span>
                  <Compass className="h-4 w-4 shrink-0 text-[#0071E3] dark:text-[#0A84FF]" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setIsConnectVision(false)}
              className="app-a-secondary-button min-h-[44px] px-3.5 text-[13px]"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {/* Overflow Menu with Escape focus return */}
      {isMenuOpen ? (
        <InboxOverflowMenu
          item={item}
          todayLocalDate={todayLocalDate}
          triggerRef={triggerButtonRef}
          onClose={onToggleMenu}
          onUpdateStatus={onUpdateStatus}
          onStartEdit={() => {
            setIsEditing(true);
            setEditTitle(item.title);
          }}
          onStartWaiting={() => {
            setIsWaitingPrompt(true);
            setWaitingOnText(item.waitingOn || "");
          }}
          onStartConnectVision={() => setIsConnectVision(true)}
          onDevelopVision={onDevelopVision}
          onDelete={onDelete}
          onError={onError}
          translations={t}
        />
      ) : null}
    </article>
  );
}
