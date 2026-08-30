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
        className="p-3 my-2 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[15px] font-medium text-black dark:text-white">
                {item.suggestedAction || item.originalText}
              </span>

              {item.needsCheck && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                  {t.checkLabel}
                </span>
              )}
            </div>

            {item.suggestedAction && item.suggestedAction !== item.originalText && (
              <p className="text-[13px] text-[#3C3C43]/70 dark:text-[#EBEBF5]/60 mb-1">
                "{item.originalText}"
              </p>
            )}

            <div className="flex items-center gap-2 text-[12px] text-[#8E8E93] flex-wrap mt-1">
              {item.estimatedMinutes ? (
                <span>{item.estimatedMinutes} min</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {t.missingDataExplanation}
                </span>
              )}

              {(item.deadlineText || item.deadlineIso) && (
                <>
                  <span>•</span>
                  <span>{item.deadlineText || item.deadlineIso}</span>
                </>
              )}
            </div>

            {errorMsg && (
              <p className="text-[13px] font-medium text-red-500 mt-2">{errorMsg}</p>
            )}
          </div>

          {/* Action dropdown for classified item */}
          <div className="relative">
            <button
              type="button"
              aria-label={t.actionsMenuLabel}
              aria-expanded={isMenuOpen}
              onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
              className="min-h-[44px] min-w-[44px] px-3 py-2 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white rounded-xl text-[14px] font-medium hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
            >
              •••
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-2xl shadow-lg z-20 py-2">
                <button
                  type="button"
                  onClick={() => handleTryPromote(item, "first_focus")}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  {t.moveToFirstFocus}
                </button>

                <button
                  type="button"
                  onClick={() => handleTryPromote(item, "later_today")}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  {t.moveToLaterToday}
                </button>

                <button
                  type="button"
                  onClick={() => handleTryPromote(item, "if_capacity_remains")}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  {t.moveToIfCapacityRemains}
                </button>

                <hr className="my-1 border-[#E5E5EA] dark:border-[#38383A]" />

                {item.timeHorizon !== "this_week" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuId(null);
                      onMoveHorizon(item.id, "this_week");
                    }}
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
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
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
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
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
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
                    className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
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
        <h4 className="text-[15px] font-semibold text-[#3C3C43] dark:text-[#EBEBF5]/90 mb-2">
          {title} ({items.length})
        </h4>
        <div className="space-y-1">{items.map(renderItemRow)}</div>
      </div>
    );
  };

  return (
    <section
      data-testid="deferred-items-section"
      className="mt-8 p-4 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-left"
    >
      <h3 className="text-[18px] font-bold text-black dark:text-white mb-4">
        {t.outsideTodayHeading} ({totalOutsideCount})
      </h3>

      {renderGroup(t.thisWeekHeading, grouped.thisWeek)}
      {renderGroup(t.laterHeading, grouped.later)}
      {renderGroup(t.longTermIdeasHeading, grouped.longTermIdeas)}
      {renderGroup(t.noActionHeading, grouped.noAction)}
    </section>
  );
}
