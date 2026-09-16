import React from "react";
import { Search, X } from "lucide-react";
import GrowthPathArt from "../GrowthPathArt";
import type { AppAInboxItem } from "../../domain/inbox/contracts";

export type InboxFilter =
  | "all"
  | "notes"
  | "this_week"
  | "waiting"
  | "scheduled"
  | "later"
  | "completed"
  | "archived";

export interface GroupedSections {
  notes: AppAInboxItem[];
  waiting: AppAInboxItem[];
  scheduled: AppAInboxItem[];
  thisWeek: AppAInboxItem[];
  later: AppAInboxItem[];
}

export interface InboxSectionsProps {
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  visibleItems: AppAInboxItem[];
  groupedSections: GroupedSections | null;
  renderItemCard: (item: AppAInboxItem) => React.ReactNode;
  hasLoadError?: boolean;
  translations: {
    all: string;
    notes: string;
    week: string;
    waiting: string;
    scheduled: string;
    later: string;
    completed: string;
    archived: string;
    search: string;
    emptyTitle: string;
    emptyDesc: string;
    sectionNeedsDecision: string;
    sectionWaiting: string;
    sectionScheduled: string;
    sectionThisWeek: string;
    sectionLater: string;
  };
}

export default function InboxSections({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  visibleItems,
  groupedSections,
  renderItemCard,
  hasLoadError,
  translations: t,
}: InboxSectionsProps) {
  const filterTabs: Array<[InboxFilter, string]> = [
    ["all", t.all],
    ["notes", t.notes],
    ["this_week", t.week],
    ["waiting", t.waiting],
    ["scheduled", t.scheduled],
    ["later", t.later],
    ["completed", t.completed],
    ["archived", t.archived],
  ];

  return (
    <div>
      {/* Filters and Search */}
      <div className="mb-5 space-y-3">
        {/* Filter Tabs */}
        <div
          className="flex overflow-x-auto rounded-[12px] p-1 bg-black/[0.05] dark:bg-white/[0.08] scrollbar-none"
          role="tablist"
        >
          {filterTabs.map(([tabKey, tabLabel]) => {
            const isSelected = filter === tabKey;
            return (
              <button
                key={tabKey}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onFilterChange(tabKey)}
                className={`app-a-focus-ring flex-1 whitespace-nowrap min-h-[38px] px-3 rounded-[9px] text-[13px] font-semibold transition-all ${
                  isSelected
                    ? "bg-white text-black shadow-sm dark:bg-[#3A3A3C] dark:text-white"
                    : "text-[#6E6E73] hover:text-black dark:text-[#AEAEB2] dark:hover:text-white"
                }`}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <label className="app-a-field flex min-h-[44px] min-w-0 items-center gap-2 px-3">
          <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          <input
            className="min-h-[44px] min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.search}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="p-1 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      </div>

      {/* Sections / Empty State */}
      {visibleItems.length === 0 && !hasLoadError ? (
        <div
          className="app-a-surface flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[20px] border p-8 text-center"
          style={{ borderColor: "var(--app-a-border)" }}
        >
          <GrowthPathArt variant="medallion" medallionType="plant" size={48} />
          <h2 className="text-[17px] font-semibold text-black dark:text-white">{t.emptyTitle}</h2>
          <p
            className="max-w-[420px] text-[13px] leading-relaxed"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            {t.emptyDesc}
          </p>
        </div>
      ) : groupedSections ? (
        <div className="space-y-6">
          {/* Notes: Needs clarification */}
          {groupedSections.notes.length > 0 ? (
            <section aria-labelledby="section-notes-heading">
              <h2
                id="section-notes-heading"
                className="mb-2.5 text-[13px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300"
              >
                {t.sectionNeedsDecision} ({groupedSections.notes.length})
              </h2>
              <div className="space-y-2.5">{groupedSections.notes.map(renderItemCard)}</div>
            </section>
          ) : null}

          {/* Waiting for response */}
          {groupedSections.waiting.length > 0 ? (
            <section aria-labelledby="section-waiting-heading">
              <h2
                id="section-waiting-heading"
                className="mb-2.5 text-[13px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--app-a-accent)" }}
              >
                {t.sectionWaiting} ({groupedSections.waiting.length})
              </h2>
              <div className="space-y-2.5">{groupedSections.waiting.map(renderItemCard)}</div>
            </section>
          ) : null}

          {/* Scheduled */}
          {groupedSections.scheduled.length > 0 ? (
            <section aria-labelledby="section-scheduled-heading">
              <h2
                id="section-scheduled-heading"
                className="mb-2.5 text-[13px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--app-a-text-secondary)" }}
              >
                {t.sectionScheduled} ({groupedSections.scheduled.length})
              </h2>
              <div className="space-y-2.5">{groupedSections.scheduled.map(renderItemCard)}</div>
            </section>
          ) : null}

          {/* This week */}
          {groupedSections.thisWeek.length > 0 ? (
            <section aria-labelledby="section-this-week-heading">
              <h2
                id="section-this-week-heading"
                className="mb-2.5 text-[13px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400"
              >
                {t.sectionThisWeek} ({groupedSections.thisWeek.length})
              </h2>
              <div className="space-y-2.5">{groupedSections.thisWeek.map(renderItemCard)}</div>
            </section>
          ) : null}

          {/* Later / Other saved items */}
          {groupedSections.later.length > 0 ? (
            <section aria-labelledby="section-later-heading">
              <h2
                id="section-later-heading"
                className="mb-2.5 text-[13px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--app-a-text-secondary)" }}
              >
                {t.sectionLater} ({groupedSections.later.length})
              </h2>
              <div className="space-y-2.5">{groupedSections.later.map(renderItemCard)}</div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2.5">{visibleItems.map(renderItemCard)}</div>
      )}
    </div>
  );
}
