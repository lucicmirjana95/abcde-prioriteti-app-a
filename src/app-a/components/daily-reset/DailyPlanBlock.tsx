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
  onEditSave: (itemId: string, updates: { title: string; description?: string; estimatedMinutes: number }) => { success: boolean; error?: string };
}

export default function DailyPlanBlock({
  block,
  items,
  language,
  onMoveToBlock,
  onMoveOutside,
  onEditSave,
}: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  // Empty blocks are omitted
  if (!items || items.length === 0) {
    return null;
  }

  const getTitleAndStyle = () => {
    switch (block) {
      case "first_focus":
        return {
          title: t.firstFocusTitle,
          subtitle: undefined,
          containerClass:
            "border border-[#0A84FF]/25 bg-[#0A84FF]/[0.055] dark:bg-[#0A84FF]/10 p-4 sm:p-5 rounded-[18px] mb-5",
          badgeClass: "bg-[#0A84FF]/12 text-[#0071E3] dark:text-[#0A84FF]",
        };
      case "later_today":
        return {
          title: t.laterTodayTitle,
          subtitle: undefined,
          containerClass:
            "border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 rounded-[18px] mb-5",
          badgeClass: "bg-black/[0.06] text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]",
        };
      case "if_capacity_remains":
        return {
          title: t.ifCapacityRemainsTitle,
          subtitle: t.ifCapacityRemainsDesc,
          containerClass:
            "border border-dashed border-black/20 dark:border-white/20 bg-transparent p-4 sm:p-5 rounded-[18px] mb-5",
          badgeClass: "bg-black/[0.06] text-[#6E6E73] dark:bg-white/10 dark:text-[#AEAEB2]",
        };
    }
  };

  const { title, subtitle, containerClass, badgeClass } = getTitleAndStyle();

  return (
    <section data-testid={`plan-block-${block}`} className={containerClass}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[19px] font-semibold tracking-[-0.015em] text-black dark:text-white">
            {title}
          </h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${badgeClass}`}>
            {items.length}
          </span>
        </div>
      </div>

      {subtitle && (
        <p className="text-[13px] text-[#3C3C43]/80 dark:text-[#EBEBF5]/70 mb-3">
          {subtitle}
        </p>
      )}

      <div className="space-y-2 mt-3">
        {items.map((item) => (
          <DailyPlanItemRow
            key={item.id}
            item={item}
            language={language}
            onMoveToBlock={onMoveToBlock}
            onMoveOutside={onMoveOutside}
            onEditSave={onEditSave}
          />
        ))}
      </div>
    </section>
  );
}
