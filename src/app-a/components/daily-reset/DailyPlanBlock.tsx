import React from "react";
import { DailyPlanItem, PlanBlock } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";
import DailyPlanItemRow from "./DailyPlanItemRow";

interface Props {
  block: PlanBlock;
  items: DailyPlanItem[];
  language: AppALanguage;
  onMoveToBlock: (itemId: string, block: PlanBlock) => void;
  onMoveOutside: (itemId: string, targetHorizon: "this_week" | "later" | "long_term_idea" | "no_action") => void;
  onReorder?: (itemId: string, direction: "up" | "down") => void;
  onEditSave: (itemId: string, updates: { title: string; description?: string; estimatedMinutes: number }) => { success: boolean; error?: string };
}

export default function DailyPlanBlock({
  block,
  items,
  language,
  onMoveToBlock,
  onMoveOutside,
  onReorder,
  onEditSave,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  // Empty blocks are omitted
  if (!items || items.length === 0) {
    return null;
  }

  const getBlockConfig = () => {
    switch (block) {
      case "first_focus":
        return {
          title: t.firstFocusTitle,
          subtitle: undefined,
          blockClass: "app-a-block-first-focus",
          badgeClass: "app-a-badge-first-focus",
        };
      case "later_today":
        return {
          title: t.laterTodayTitle,
          subtitle: undefined,
          blockClass: "app-a-block-later-today",
          badgeClass: "app-a-badge-later-today",
        };
      case "if_capacity_remains":
        return {
          title: t.ifCapacityRemainsTitle,
          subtitle: t.ifCapacityRemainsDesc,
          blockClass: "app-a-block-if-capacity",
          badgeClass: "app-a-badge-if-capacity",
        };
    }
  };

  const { title, subtitle, blockClass, badgeClass } = getBlockConfig();

  return (
    <section
      data-testid={`plan-block-${block}`}
      className={`mb-5 rounded-[20px] p-4 sm:p-5 ${blockClass}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[19px] font-semibold tracking-[-0.015em]" style={{ color: "var(--app-a-text)" }}>
            {title}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${badgeClass}`}
          >
            {items.length}
          </span>
        </div>
      </div>

      {subtitle && (
        <p className="mb-3 text-[13px]" style={{ color: "var(--app-a-text-secondary)" }}>
          {subtitle}
        </p>
      )}

      <div className="space-y-2 mt-3">
        {items.map((item, index) => (
          <DailyPlanItemRow
            key={item.id}
            item={item}
            language={language}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onMoveToBlock={onMoveToBlock}
            onMoveOutside={onMoveOutside}
            onReorder={onReorder}
            onEditSave={onEditSave}
          />
        ))}
      </div>
    </section>
  );
}
