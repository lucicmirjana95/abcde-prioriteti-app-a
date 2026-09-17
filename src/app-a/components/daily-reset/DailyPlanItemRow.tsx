import React, { useState } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { DailyPlanItem, PlanBlock, RequiredEnergy } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";
import InputCopyButton from "../common/InputCopyButton";

interface Props {
  item: DailyPlanItem;
  language: AppALanguage;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveToBlock: (itemId: string, block: PlanBlock) => void;
  onMoveOutside: (itemId: string, targetHorizon: "this_week" | "later" | "long_term_idea" | "no_action") => void;
  onReorder?: (itemId: string, direction: "up" | "down") => void;
  onEditSave: (itemId: string, updates: { title: string; description?: string; estimatedMinutes: number }) => { success: boolean; error?: string };
  onDeleteItem?: (itemId: string) => void;
}

export default function DailyPlanItemRow({
  item,
  language,
  isFirst,
  isLast,
  onMoveToBlock,
  onMoveOutside,
  onReorder,
  onEditSave,
  onDeleteItem,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description || "");
  const [editMinutes, setEditMinutes] = useState(String(item.estimatedMinutes));
  const [editError, setEditError] = useState<string | null>(null);

  const [showWhy, setShowWhy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  React.useEffect(() => {
    if (!showMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMenu(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showMenu]);

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
      <div
        className="my-2 rounded-2xl border p-4 text-left shadow-sm"
        style={{
          backgroundColor: "var(--app-a-surface)",
          borderColor: "var(--app-a-accent)",
        }}
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label
              className="mb-1 block text-[13px] font-medium"
              style={{ color: "var(--app-a-text)" }}
            >
              {t.itemTitleLabel} <span style={{ color: "var(--app-a-danger)" }}>*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="app-a-field w-full p-2.5 pr-10 text-[16px]"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <InputCopyButton text={editTitle} language={language} size="sm" />
              </div>
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-[13px] font-medium"
              style={{ color: "var(--app-a-text)" }}
            >
              {t.itemDescLabel}
            </label>
            <div className="relative">
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="app-a-field w-full p-2.5 pb-9 text-[16px]"
              />
              <div className="absolute right-2 bottom-2 flex items-center">
                <InputCopyButton text={editDesc} language={language} size="sm" />
              </div>
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-[13px] font-medium"
              style={{ color: "var(--app-a-text)" }}
            >
              {t.itemDurationLabel} <span style={{ color: "var(--app-a-danger)" }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value)}
              className="app-a-field w-28 p-2.5 text-[16px]"
            />
          </div>

          {editError && (
            <p
              className="text-[14px] font-medium"
              style={{ color: "var(--app-a-danger)" }}
            >
              {editError}
            </p>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              className="app-a-primary-button app-a-focus-ring min-h-[44px] px-5 py-2 text-[14px]"
            >
              {t.saveBtn}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="app-a-secondary-button app-a-focus-ring min-h-[44px] px-5 py-2 text-[14px]"
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
      className="my-1.5 rounded-[14px] border p-4 text-left"
      style={{
        backgroundColor: "var(--app-a-surface)",
        borderColor: "var(--app-a-border)",
        color: "var(--app-a-text)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4
              className="text-[16px] font-semibold leading-snug tracking-[-0.01em]"
              style={{ color: "var(--app-a-text)" }}
            >
              {item.title}
            </h4>

            {item.needsCheck && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold"
                style={{
                  backgroundColor: "var(--app-a-warning-soft)",
                  color: "var(--app-a-warning-text)",
                }}
              >
                {t.checkLabel}
              </span>
            )}
          </div>

          {item.description && (
            <p
              className="mb-2 text-[14px] leading-relaxed"
              style={{ color: "var(--app-a-text-secondary)" }}
            >
              {item.description}
            </p>
          )}

          <div
            className="flex items-center gap-3 text-[13px] flex-wrap mt-2"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            <span className="font-semibold" style={{ color: "var(--app-a-text)" }}>
              {item.estimatedMinutes} min
            </span>

            <span>•</span>

            <span>{getEnergyLabel(item.requiredEnergy)}</span>

            {(item.deadlineText || item.deadlineIso) && (
              <>
                <span>•</span>
                <span
                  className="font-medium"
                  style={{ color: "var(--app-a-warning-text)" }}
                >
                  {item.deadlineText || item.deadlineIso}
                </span>
              </>
            )}

            {goalOrProjectTitle && (
              <>
                <span>•</span>
                <span
                  className="font-medium"
                  style={{ color: "var(--app-a-accent)" }}
                >
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
                className="app-a-focus-ring inline-flex min-h-11 items-center text-[13px] font-medium transition-colors"
                style={{ color: "var(--app-a-accent)" }}
              >
                {t.whyLabel} {showWhy ? "▲" : "▼"}
              </button>
              {showWhy && (
                <p
                  className="mt-1 rounded-xl border p-2.5 text-[13px] leading-relaxed"
                  style={{
                    backgroundColor: "var(--app-a-surface-secondary)",
                    borderColor: "var(--app-a-border)",
                    color: "var(--app-a-text)",
                  }}
                >
                  {item.reasoning}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex shrink-0 items-center gap-2">
          {onReorder && item.capacityType !== "fixed" && (
            <div className="hidden sm:flex flex-col gap-0.5 mr-1">
              <button
                type="button"
                disabled={isFirst}
                onClick={() => onReorder(item.id, "up")}
                className="app-a-focus-ring flex h-[21px] w-8 items-center justify-center rounded-t-lg transition-colors bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-30 text-[#8E8E93]"
                aria-label={language === "sr" ? "Pomeri gore" : language === "tr" ? "Yukarı taşı" : "Move up"}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={() => onReorder(item.id, "down")}
                className="app-a-focus-ring flex h-[21px] w-8 items-center justify-center rounded-b-lg transition-colors bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-30 text-[#8E8E93]"
                aria-label={language === "sr" ? "Pomeri dole" : language === "tr" ? "Aşağı taşı" : "Move down"}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Action Menu Toggle */}
          <div className="relative">
            <button
              type="button"
              aria-label={t.actionsMenuLabel}
            aria-expanded={showMenu}
            onClick={() => setShowMenu(!showMenu)}
            className="app-a-focus-ring min-h-[44px] min-w-[44px] rounded-xl px-3 py-2 text-[14px] font-medium transition-colors"
            style={{
              backgroundColor: "var(--app-a-disabled-bg)",
              color: "var(--app-a-text)",
            }}
          >
            •••
          </button>

          {showMenu && (
            <>
              {/* Mobile Action Sheet Modal (z-50) */}
              <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden">
                {/* Backdrop overlay */}
                <div
                  className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
                  onClick={() => setShowMenu(false)}
                  aria-hidden="true"
                />

                {/* Sheet panel */}
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={item.title}
                  className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-[28px] border-t p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-200"
                  style={{
                    backgroundColor: "var(--app-a-surface-elevated)",
                    borderColor: "var(--app-a-border-strong)",
                    boxShadow: "var(--app-a-shadow-lg)",
                  }}
                >
                  {/* Drag handle pill */}
                  <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/20 dark:bg-white/20" />

                  {/* Task info header */}
                  <div className="mb-3 px-2 text-left">
                    <h4
                      className="text-[16px] font-semibold leading-snug tracking-[-0.01em]"
                      style={{ color: "var(--app-a-text)" }}
                    >
                      {item.title}
                    </h4>
                    <div
                      className="mt-1 flex items-center gap-2 text-[12px]"
                      style={{ color: "var(--app-a-text-secondary)" }}
                    >
                      <span>{item.estimatedMinutes} min</span>
                      <span>•</span>
                      <span>{getEnergyLabel(item.requiredEnergy)}</span>
                      {goalOrProjectTitle && (
                        <>
                          <span>•</span>
                          <span style={{ color: "var(--app-a-accent)" }}>{goalOrProjectTitle}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions list */}
                  <div
                    className="overflow-hidden rounded-2xl border divide-y"
                    style={{
                      backgroundColor: "var(--app-a-surface)",
                      borderColor: "var(--app-a-border)",
                    }}
                  >
                    {/* Schedule block reordering & moving */}
                    {onReorder && item.capacityType !== "fixed" && (
                      <div className="p-1">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => {
                            setShowMenu(false);
                            onReorder(item.id, "up");
                          }}
                          className="flex w-full min-h-[44px] items-center justify-between rounded-xl px-4 py-2.5 text-left text-[14px] font-medium transition-colors disabled:opacity-30"
                          style={{ color: "var(--app-a-text)" }}
                        >
                          <span>{language === "sr" ? "Premesti ranije" : language === "tr" ? "Daha erkene taşı" : "Move earlier"}</span>
                          <ChevronUp className="h-4 w-4 text-[#8E8E93]" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => {
                            setShowMenu(false);
                            onReorder(item.id, "down");
                          }}
                          className="flex w-full min-h-[44px] items-center justify-between rounded-xl px-4 py-2.5 text-left text-[14px] font-medium transition-colors disabled:opacity-30"
                          style={{ color: "var(--app-a-text)" }}
                        >
                          <span>{language === "sr" ? "Premesti kasnije" : language === "tr" ? "Daha sonraya taşı" : "Move later"}</span>
                          <ChevronDown className="h-4 w-4 text-[#8E8E93]" />
                        </button>
                      </div>
                    )}

                    <div className="p-1">
                      {item.block !== "first_focus" && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            onMoveToBlock(item.id, "first_focus");
                          }}
                          className="w-full text-left min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors"
                          style={{ color: "var(--app-a-text)" }}
                        >
                          {language === "sr" ? "Postavi kao sledeće" : t.moveToFirstFocus}
                        </button>
                      )}

                      {item.block !== "later_today" && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            onMoveToBlock(item.id, "later_today");
                          }}
                          className="w-full text-left min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors"
                          style={{ color: "var(--app-a-text)" }}
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
                          className="w-full text-left min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors"
                          style={{ color: "var(--app-a-text)" }}
                        >
                          {language === "sr" ? "Ako ostane kapaciteta" : t.moveToIfCapacityRemains}
                        </button>
                      )}
                    </div>

                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onMoveOutside(item.id, "this_week");
                        }}
                        className="w-full text-left min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors"
                        style={{ color: "var(--app-a-text)" }}
                      >
                        {t.moveToThisWeek}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onMoveOutside(item.id, "later");
                        }}
                        className="w-full text-left min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors"
                        style={{ color: "var(--app-a-text)" }}
                      >
                        {t.removeFromToday}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onMoveOutside(item.id, "long_term_idea");
                        }}
                        className="w-full text-left min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors"
                        style={{ color: "var(--app-a-text)" }}
                      >
                        {t.saveAsLongTermIdea}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onMoveOutside(item.id, "no_action");
                        }}
                        className="w-full text-left min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors"
                        style={{ color: "var(--app-a-text)" }}
                      >
                        {t.markAsNotAnAction}
                      </button>
                    </div>

                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setIsEditing(true);
                        }}
                        className="w-full text-left min-h-[44px] rounded-xl px-4 py-2.5 text-[14px] font-semibold transition-colors"
                        style={{ color: "var(--app-a-accent)" }}
                      >
                        {t.editItem}
                      </button>

                      {onDeleteItem && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            onDeleteItem(item.id);
                          }}
                          className="flex w-full min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-left text-[14px] font-semibold text-rose-600 transition-colors dark:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          {language === "sr" ? "Izbriši zadatak" : language === "tr" ? "Görevi sil" : "Delete task"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setShowMenu(false)}
                    className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition-colors active:scale-[0.99]"
                    style={{
                      backgroundColor: "var(--app-a-disabled-bg)",
                      color: "var(--app-a-text)",
                    }}
                  >
                    {language === "sr" ? "Zatvori" : language === "tr" ? "Kapat" : "Close"}
                  </button>
                </div>
              </div>

              {/* Desktop Floating Menu (hidden sm:block, z-50) */}
              <div className="hidden sm:block">
                {/* Backdrop click-away overlay */}
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setShowMenu(false)}
                  aria-hidden="true"
                />

                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border py-2 shadow-2xl"
                  style={{
                    backgroundColor: "var(--app-a-surface-elevated)",
                    borderColor: "var(--app-a-border-strong)",
                    boxShadow: "var(--app-a-shadow-lg)",
                  }}
                >
                  {onReorder && item.capacityType !== "fixed" && (
                    <>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => {
                          setShowMenu(false);
                          onReorder(item.id, "up");
                        }}
                        className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: "var(--app-a-text)" }}
                      >
                        {language === "sr" ? "Premesti ranije" : language === "tr" ? "Daha erkene taşı" : "Move earlier"}
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => {
                          setShowMenu(false);
                          onReorder(item.id, "down");
                        }}
                        className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: "var(--app-a-text)" }}
                      >
                        {language === "sr" ? "Premesti kasnije" : language === "tr" ? "Daha sonraya taşı" : "Move later"}
                      </button>
                      <hr className="my-1 border-t border-black/5 dark:border-white/5" />
                    </>
                  )}

                  {item.block !== "first_focus" && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onMoveToBlock(item.id, "first_focus");
                      }}
                      className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: "var(--app-a-text)" }}
                    >
                      {language === "sr" ? "Postavi kao sledeće" : t.moveToFirstFocus}
                    </button>
                  )}

                  {item.block !== "later_today" && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onMoveToBlock(item.id, "later_today");
                      }}
                      className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: "var(--app-a-text)" }}
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
                      className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: "var(--app-a-text)" }}
                    >
                      {language === "sr" ? "Ako ostane kapaciteta" : t.moveToIfCapacityRemains}
                    </button>
                  )}

                  <hr className="my-1 border-t border-black/5 dark:border-white/5" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onMoveOutside(item.id, "this_week");
                    }}
                    className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--app-a-text)" }}
                  >
                    {t.moveToThisWeek}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onMoveOutside(item.id, "later");
                    }}
                    className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--app-a-text)" }}
                  >
                    {t.removeFromToday}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onMoveOutside(item.id, "long_term_idea");
                    }}
                    className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--app-a-text)" }}
                  >
                    {t.saveAsLongTermIdea}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onMoveOutside(item.id, "no_action");
                    }}
                    className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--app-a-text)" }}
                  >
                    {t.markAsNotAnAction}
                  </button>

                  <hr className="my-1 border-t border-black/5 dark:border-white/5" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setIsEditing(true);
                    }}
                    className="w-full text-left min-h-[40px] px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--app-a-accent)" }}
                  >
                    {t.editItem}
                  </button>

                  {onDeleteItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onDeleteItem(item.id);
                      }}
                      className="flex w-full min-h-[40px] items-center gap-2 px-4 py-2 text-left text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                      {language === "sr" ? "Izbriši zadatak" : language === "tr" ? "Görevi sil" : "Delete task"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
