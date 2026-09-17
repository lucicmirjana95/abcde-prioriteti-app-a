import React, { useEffect, useRef, useState } from "react";
import {
  Archive,
  Check,
  Clock3,
  Compass,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import type { AppAInboxItem } from "../../domain/inbox/contracts";

export interface InboxOverflowMenuProps {
  item: AppAInboxItem;
  todayLocalDate: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onUpdateStatus: (
    item: AppAInboxItem,
    status: AppAInboxItem["status"],
    extras?: { scheduledLocalDate?: string; waitingOn?: string; horizon?: AppAInboxItem["horizon"] }
  ) => void;
  onStartEdit: (item: AppAInboxItem) => void;
  onStartWaiting: (item: AppAInboxItem) => void;
  onStartConnectVision: (item: AppAInboxItem) => void;
  onDevelopVision: (item: AppAInboxItem) => void;
  onDelete: (item: AppAInboxItem) => void;
  onError: (msg: string) => void;
  translations: {
    schedule: string;
    scheduleAction: string;
    moveToWeek: string;
    markWaiting: string;
    restore: string;
    developVision: string;
    connectVision: string;
    edit: string;
    complete: string;
    archive: string;
    delete: string;
    confirmDelete: string;
    confirmDeleteDesc: string;
    cancel: string;
    invalidDate: string;
  };
}

export default function InboxOverflowMenu({
  item,
  todayLocalDate,
  triggerRef,
  onClose,
  onUpdateStatus,
  onStartEdit,
  onStartWaiting,
  onStartConnectVision,
  onDevelopVision,
  onDelete,
  onError,
  translations: t,
}: InboxOverflowMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scheduleDate, setScheduleDate] = useState(item.scheduledLocalDate || "");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const isNote = item.kind === "note";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, triggerRef]);

  return (
    <div
      ref={containerRef}
      role="menu"
      className="mt-3 grid min-w-0 gap-2 border-t pt-3 min-[440px]:grid-cols-2"
      style={{ borderColor: "var(--app-a-border)" }}
    >
      {/* 1. Schedule date picker */}
      {!isNote && (
        <div className="app-a-field flex min-h-[44px] min-w-0 items-center gap-2 px-2.5">
          <input
            type="date"
            min={todayLocalDate}
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
            aria-label={t.schedule}
          />
          <button
            type="button"
            disabled={!scheduleDate || scheduleDate < todayLocalDate}
            onClick={() => {
              if (scheduleDate >= todayLocalDate) {
                onUpdateStatus(item, "scheduled", { scheduledLocalDate: scheduleDate });
                onClose();
              } else {
                onError(t.invalidDate);
              }
            }}
            className="shrink-0 text-[13px] font-semibold text-[#0071E3] dark:text-[#0A84FF] disabled:opacity-40"
          >
            {t.scheduleAction}
          </button>
        </div>
      )}

      {/* 2. Move to This Week */}
      {!isNote && item.horizon !== "this_week" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onUpdateStatus(item, item.status, { horizon: "this_week" });
            onClose();
          }}
          className="app-a-secondary-button app-a-focus-ring min-h-[44px] justify-start px-3 text-[13px]"
        >
          <Clock3 className="mr-1.5 h-4 w-4" />
          {t.moveToWeek}
        </button>
      ) : null}

      {/* 3. Waiting-for prompt trigger */}
      {!isNote && item.status !== "waiting" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onStartWaiting(item);
            onClose();
          }}
          className="app-a-secondary-button app-a-focus-ring min-h-[44px] justify-start px-3 text-[13px]"
        >
          <Clock3 className="mr-1.5 h-4 w-4" />
          {t.markWaiting}
        </button>
      ) : null}

      {/* 4. Restore to ordinary inbox */}
      {!isNote && item.status !== "inbox" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onUpdateStatus(item, "inbox", { horizon: "later" });
            onClose();
          }}
          className="app-a-secondary-button app-a-focus-ring min-h-[44px] justify-start px-3 text-[13px]"
        >
          <Undo2 className="mr-1.5 h-4 w-4" />
          {t.restore}
        </button>
      ) : null}

      {/* 5. Develop as Vision */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onDevelopVision(item);
          onClose();
        }}
        className="app-a-secondary-button app-a-focus-ring min-h-[44px] justify-start px-3 text-[13px]"
      >
        <Compass className="mr-1.5 h-4 w-4 text-purple-500" />
        {t.developVision}
      </button>

      {/* 6. Connect to Vision */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onStartConnectVision(item);
          onClose();
        }}
        className="app-a-secondary-button app-a-focus-ring min-h-[44px] justify-start px-3 text-[13px]"
      >
        <Compass className="mr-1.5 h-4 w-4" />
        {t.connectVision}
      </button>

      {/* 7. Edit title */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onStartEdit(item);
          onClose();
        }}
        className="app-a-secondary-button app-a-focus-ring min-h-[44px] justify-start px-3 text-[13px]"
      >
        <Pencil className="mr-1.5 h-4 w-4" />
        {t.edit}
      </button>

      {/* 8. Mark completed */}
      {!isNote && item.status !== "completed" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onUpdateStatus(item, "completed");
            onClose();
          }}
          className="app-a-secondary-button app-a-focus-ring min-h-[44px] justify-start px-3 text-[13px]"
        >
          <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
          {t.complete}
        </button>
      ) : null}

      {/* 9. Archive / No longer needed */}
      {item.status !== "archived" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onUpdateStatus(item, "archived");
            onClose();
          }}
          className="app-a-secondary-button app-a-focus-ring min-h-[44px] justify-start px-3 text-[13px]"
        >
          <Archive className="mr-1.5 h-4 w-4" />
          {t.archive}
        </button>
      ) : null}

      {/* 10. Permanent Delete */}
      {deleteConfirm ? (
        <div className="col-span-full rounded-xl p-3 bg-red-500/10 dark:bg-red-500/20">
          <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">
            {t.confirmDelete}
          </p>
          <p className="mt-1 text-[12px] text-red-600/80 dark:text-red-300">
            {t.confirmDeleteDesc}
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onDelete(item);
                setDeleteConfirm(false);
                onClose();
              }}
              className="app-a-focus-ring min-h-[44px] rounded-lg px-3.5 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="mr-1.5 inline h-4 w-4" />
              {t.delete}
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              className="app-a-secondary-button min-h-[44px] px-3.5 text-[13px]"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          role="menuitem"
          onClick={() => setDeleteConfirm(true)}
          className="app-a-focus-ring flex min-h-[44px] items-center justify-start rounded-xl px-3 text-left text-[13px] font-semibold transition-colors text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
        >
          <Trash2 className="mr-1.5 inline h-4 w-4" />
          {t.delete}
        </button>
      )}
    </div>
  );
}
