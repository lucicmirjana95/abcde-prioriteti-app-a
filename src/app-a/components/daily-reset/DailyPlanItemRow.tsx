import React, { useState } from "react";
import { DailyPlanItem, PlanBlock, RequiredEnergy } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";

interface Props {
  item: DailyPlanItem;
  language: AppALanguage;
  onMoveToBlock: (itemId: string, block: PlanBlock) => void;
  onMoveOutside: (itemId: string, targetHorizon: "this_week" | "later" | "long_term_idea" | "no_action") => void;
  onEditSave: (itemId: string, updates: { title: string; description?: string; estimatedMinutes: number }) => { success: boolean; error?: string };
}

export default function DailyPlanItemRow({
  item,
  language,
  onMoveToBlock,
  onMoveOutside,
  onEditSave,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description || "");
  const [editMinutes, setEditMinutes] = useState(String(item.estimatedMinutes));
  const [editError, setEditError] = useState<string | null>(null);

  const [showWhy, setShowWhy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const getEnergyLabel = (energy?: RequiredEnergy): string => {
    switch (energy) {
      case 1:
        return t.energyDesc1;
      case 2:
        return t.energyDesc2;
      case 3:
        return t.energyDesc3;
      case 4:
        return t.energyDesc4;
      case 5:
        return t.energyDesc5;
      default:
        return t.energyDesc3;
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const mins = parseInt(editMinutes, 10);
    const result = onEditSave(item.id, {
      title: editTitle,
      description: editDesc,
      estimatedMinutes: mins,
    });

    if (!result.success && result.error) {
      if (result.error === "invalid_title") {
        setEditError(t.emptyTitleError);
      } else if (result.error === "invalid_duration") {
        setEditError(t.invalidDurationError);
      } else {
        setEditError(result.error);
      }
      return;
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditMinutes(String(item.estimatedMinutes));
    setEditError(null);
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-white dark:bg-[#1C1C1E] border border-[#007AFF] rounded-2xl my-2 text-left shadow-sm">
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
              {t.itemTitleLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-[16px] p-2.5 rounded-xl border border-[#C7C7CC] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
              {t.itemDescLabel}
            </label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="w-full text-[16px] p-2.5 rounded-xl border border-[#C7C7CC] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-1">
              {t.itemDurationLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value)}
              className="w-28 text-[16px] p-2.5 rounded-xl border border-[#C7C7CC] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          {editError && (
            <p className="text-[14px] font-medium text-red-500">{editError}</p>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 bg-[#007AFF] text-white font-medium rounded-xl hover:bg-[#007AFF]/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
            >
              {t.saveBtn}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-[44px] px-5 py-2 bg-[#8E8E93]/20 text-[#3C3C43] dark:text-[#EBEBF5] font-medium rounded-xl hover:bg-[#8E8E93]/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8E8E93]"
            >
              {t.cancelBtn}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const goalOrProjectTitle =
    item.goalRelationship?.goalTitle || item.goalRelationship?.projectTitle;

  return (
    <div
      data-testid={`plan-item-row-${item.id}`}
      className="my-1.5 rounded-[14px] border border-black/[0.08] bg-white p-4 text-left dark:border-white/10 dark:bg-[#242426]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-[16px] font-semibold leading-snug tracking-[-0.01em] text-black dark:text-white">
              {item.title}
            </h4>

            {item.needsCheck && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                {t.checkLabel}
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-[14px] text-[#3C3C43] dark:text-[#EBEBF5]/80 mb-2 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-[13px] text-[#8E8E93] dark:text-[#8E8E93] flex-wrap mt-2">
            <span className="font-medium text-black dark:text-white">
              {item.estimatedMinutes} min
            </span>

            <span>•</span>

            <span>{getEnergyLabel(item.requiredEnergy)}</span>

            {(item.deadlineText || item.deadlineIso) && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {item.deadlineText || item.deadlineIso}
                </span>
              </>
            )}

            {goalOrProjectTitle && (
              <>
                <span>•</span>
                <span className="text-[#007AFF] font-medium">
                  {goalOrProjectTitle}
                </span>
              </>
            )}
          </div>

          {item.reasoning && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowWhy(!showWhy)}
                className="text-[13px] font-medium text-[#007AFF] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] min-h-[32px] inline-flex items-center"
              >
                {t.whyLabel} {showWhy ? "▲" : "▼"}
              </button>
              {showWhy && (
                <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/90 mt-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] p-2.5 rounded-xl border border-[#E5E5EA] dark:border-[#38383A]">
                  {item.reasoning}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Menu Toggle */}
        <div className="relative">
          <button
            type="button"
            aria-label={t.actionsMenuLabel}
            aria-expanded={showMenu}
            onClick={() => setShowMenu(!showMenu)}
            className="app-a-focus-ring min-h-[44px] min-w-[44px] rounded-xl bg-black/[0.045] px-3 py-2 text-[14px] font-medium text-black transition-colors hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.13]"
          >
            •••
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded-2xl shadow-lg z-20 py-2">
              {item.block !== "first_focus" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onMoveToBlock(item.id, "first_focus");
                  }}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  {t.moveToFirstFocus}
                </button>
              )}

              {item.block !== "later_today" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onMoveToBlock(item.id, "later_today");
                  }}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  {t.moveToLaterToday}
                </button>
              )}

              {item.block !== "if_capacity_remains" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onMoveToBlock(item.id, "if_capacity_remains");
                  }}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  {t.moveToIfCapacityRemains}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onMoveOutside(item.id, "this_week");
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                {t.moveToThisWeek}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onMoveOutside(item.id, "later");
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                {t.moveToLater}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onMoveOutside(item.id, "long_term_idea");
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                {t.saveAsLongTermIdea}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onMoveOutside(item.id, "no_action");
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                {t.markAsNotAnAction}
              </button>

              <hr className="my-1 border-[#E5E5EA] dark:border-[#38383A]" />

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setIsEditing(true);
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] font-medium text-[#007AFF] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                {t.editItem}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
