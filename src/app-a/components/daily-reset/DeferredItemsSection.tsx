import React, { useState } from "react";
import { ClassifiedBrainDumpItem, PlanBlock } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";

interface GroupedOutsideItems {
  thisWeek: ClassifiedBrainDumpItem[];
  later: ClassifiedBrainDumpItem[];
  longTermIdeas: ClassifiedBrainDumpItem[];
  noAction: ClassifiedBrainDumpItem[];
}

interface Props {
  grouped: GroupedOutsideItems;
  language: AppALanguage;
  onPromote: (itemId: string, block: PlanBlock) => { success: boolean; error?: string };
  onMoveHorizon: (itemId: string, horizon: "this_week" | "later" | "long_term_idea" | "no_action") => void;
}

export default function DeferredItemsSection({
  grouped,
  language,
  onPromote,
  onMoveHorizon,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const totalOutsideCount =
    grouped.thisWeek.length +
    grouped.later.length +
    grouped.longTermIdeas.length +
    grouped.noAction.length;

  if (totalOutsideCount === 0) {
    return null;
  }

  const handleTryPromote = (item: ClassifiedBrainDumpItem, targetBlock: PlanBlock) => {
    setActiveMenuId(null);

    // Check if missing planning data
    if (!item.estimatedMinutes || item.estimatedMinutes <= 0) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: t.missingDataExplanation,
      }));
      return;
    }

    const res = onPromote(item.id, targetBlock);
    if (!res.success && res.error) {
      if (res.error === "missing_planning_data") {
        setItemErrors((prev) => ({
          ...prev,
          [item.id]: t.missingDataExplanation,
        }));
      } else if (res.error === "first_focus_limit_exceeded") {
        setItemErrors((prev) => ({
          ...prev,
          [item.id]: t.firstFocusLimitError,
        }));
      }
    } else {
      // Clear error on success
      setItemErrors((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const renderItemRow = (item: ClassifiedBrainDumpItem) => {
    const errorMsg = itemErrors[item.id];
    const isMenuOpen = activeMenuId === item.id;

    return (
      <div
        key={item.id}
        data-testid={`classified-item-row-${item.id}`}
        className="my-2 rounded-xl border p-3 text-left"
        style={{
          backgroundColor: "var(--app-a-surface)",
          borderColor: "var(--app-a-border)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[15px] font-semibold" style={{ color: "var(--app-a-text)" }}>
                {item.suggestedAction || item.originalText}
              </span>

              {item.needsCheck && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                  style={{
                    backgroundColor: "var(--app-a-warning-soft)",
                    color: "var(--app-a-warning-text)",
                  }}
                >
                  {t.checkLabel}
                </span>
              )}
            </div>

            {item.suggestedAction && item.suggestedAction !== item.originalText && (
              <p
                className="mb-1 text-[13px]"
                style={{ color: "var(--app-a-text-secondary)" }}
              >
                "{item.originalText}"
              </p>
            )}

            <div
              className="flex items-center gap-2 text-[12px] flex-wrap mt-1"
              style={{ color: "var(--app-a-text-secondary)" }}
            >
              {item.estimatedMinutes ? (
                <span className="font-medium" style={{ color: "var(--app-a-text)" }}>
                  {item.estimatedMinutes} min
                </span>
              ) : (
                <span
                  className="font-medium"
                  style={{ color: "var(--app-a-warning-text)" }}
                >
                  {t.missingDataExplanation}
                </span>
              )}

              {(item.deadlineText || item.deadlineIso) && (
                <>
                  <span>•</span>
                  <span style={{ color: "var(--app-a-warning-text)" }}>
                    {item.deadlineText || item.deadlineIso}
                  </span>
                </>
              )}
            </div>

            {errorMsg && (
              <p className="mt-2 text-[13px] font-medium" style={{ color: "var(--app-a-danger)" }}>
                {errorMsg}
              </p>
            )}
          </div>

          {/* Action dropdown for classified item */}
          <div className="relative">
            <button
              type="button"
              aria-label={t.actionsMenuLabel}
              aria-expanded={isMenuOpen}
              onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
              className="app-a-focus-ring min-h-[44px] min-w-[44px] rounded-xl px-3 py-2 text-[14px] font-medium transition-colors"
              style={{
                backgroundColor: "var(--app-a-disabled-bg)",
                color: "var(--app-a-text)",
              }}
            >
              •••
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border py-2 shadow-lg"
                style={{
                  backgroundColor: "var(--app-a-surface-elevated)",
                  borderColor: "var(--app-a-border-strong)",
                  boxShadow: "var(--app-a-shadow-lg)",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleTryPromote(item, "first_focus")}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                  style={{ color: "var(--app-a-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {t.moveToFirstFocus}
                </button>

                <button
                  type="button"
                  onClick={() => handleTryPromote(item, "later_today")}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                  style={{ color: "var(--app-a-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {t.moveToLaterToday}
                </button>

                <button
                  type="button"
                  onClick={() => handleTryPromote(item, "if_capacity_remains")}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                  style={{ color: "var(--app-a-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {t.moveToIfCapacityRemains}
                </button>

                <hr
                  className="my-1 border-t"
                  style={{ borderColor: "var(--app-a-border)" }}
                />

                {item.timeHorizon !== "this_week" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuId(null);
                      onMoveHorizon(item.id, "this_week");
                    }}
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                    style={{ color: "var(--app-a-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {t.moveToThisWeek}
                  </button>
                )}

                {item.timeHorizon !== "later" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuId(null);
                      onMoveHorizon(item.id, "later");
                    }}
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                    style={{ color: "var(--app-a-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {t.moveToLater}
                  </button>
                )}

                {item.timeHorizon !== "long_term_idea" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuId(null);
                      onMoveHorizon(item.id, "long_term_idea");
                    }}
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                    style={{ color: "var(--app-a-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {t.saveAsLongTermIdea}
                  </button>
                )}

                {item.timeHorizon !== "no_action" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuId(null);
                      onMoveHorizon(item.id, "no_action");
                    }}
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                    style={{ color: "var(--app-a-text)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {t.markAsNotAnAction}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGroup = (title: string, items: ClassifiedBrainDumpItem[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-4">
        <h4
          className="mb-2 text-[15px] font-semibold"
          style={{ color: "var(--app-a-text)" }}
        >
          {title} ({items.length})
        </h4>
        <div className="space-y-1">{items.map(renderItemRow)}</div>
      </div>
    );
  };

  return (
    <section
      data-testid="deferred-items-section"
      className="mt-8 rounded-2xl border p-4 text-left"
      style={{
        backgroundColor: "var(--app-a-surface-secondary)",
        borderColor: "var(--app-a-border)",
      }}
    >
      <h3 className="mb-4 text-[18px] font-bold" style={{ color: "var(--app-a-text)" }}>
        {t.outsideTodayHeading} ({totalOutsideCount})
      </h3>

      {renderGroup(t.thisWeekHeading, grouped.thisWeek)}
      {renderGroup(t.laterHeading, grouped.later)}
      {renderGroup(t.longTermIdeasHeading, grouped.longTermIdeas)}
      {renderGroup(t.noActionHeading, grouped.noAction)}
    </section>
  );
}
