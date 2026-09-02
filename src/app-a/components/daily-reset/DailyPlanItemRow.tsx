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
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="app-a-field w-full p-2.5 text-[16px]"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-[13px] font-medium"
              style={{ color: "var(--app-a-text)" }}
            >
              {t.itemDescLabel}
            </label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="app-a-field w-full p-2.5 text-[16px]"
            />
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
                className="inline-flex min-h-[32px] items-center text-[13px] font-medium transition-colors"
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
            <div
              className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border py-2 shadow-lg"
              style={{
                backgroundColor: "var(--app-a-surface-elevated)",
                borderColor: "var(--app-a-border-strong)",
                boxShadow: "var(--app-a-shadow-lg)",
              }}
            >
              {item.block !== "first_focus" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onMoveToBlock(item.id, "first_focus");
                  }}
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                  style={{ color: "var(--app-a-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                  style={{ color: "var(--app-a-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
                  className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                  style={{ color: "var(--app-a-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                style={{ color: "var(--app-a-text)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {t.moveToThisWeek}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onMoveOutside(item.id, "later");
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                style={{ color: "var(--app-a-text)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {t.removeFromToday}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onMoveOutside(item.id, "long_term_idea");
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                style={{ color: "var(--app-a-text)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {t.saveAsLongTermIdea}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onMoveOutside(item.id, "no_action");
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] transition-colors"
                style={{ color: "var(--app-a-text)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {t.markAsNotAnAction}
              </button>

              <hr
                className="my-1 border-t"
                style={{ borderColor: "var(--app-a-border)" }}
              />

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setIsEditing(true);
                }}
                className="w-full text-left min-h-[44px] px-4 py-2.5 text-[14px] font-semibold transition-colors"
                style={{ color: "var(--app-a-accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
