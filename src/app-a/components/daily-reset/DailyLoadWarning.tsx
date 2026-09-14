import { AlertTriangle } from "lucide-react";
import type { DailyPlanDraft } from "../../domain/daily-reset/contracts";
import type { RoutineCompletion, SharedRoutine } from "../../../shared/domain/routines/contracts";
import { assessDailyLoad } from "../../domain/daily-reset/dailyLoad";
import type { AppALanguage } from "../../types";

interface Props {
  draft: DailyPlanDraft;
  language: AppALanguage;
  completedItemIds?: string[];
  routines?: SharedRoutine[];
  routineCompletions?: RoutineCompletion[];
  plannedRoutineIds?: string[];
  localDate?: string;
  activeRoutinesMinutes?: number;
  onReview?: () => void;
}

export default function DailyLoadWarning({
  draft,
  language,
  completedItemIds = [],
  routines = [],
  routineCompletions = [],
  plannedRoutineIds = draft.plannedRoutineIds || [],
  localDate,
  activeRoutinesMinutes = 0,
  onReview,
}: Props) {
  const load = assessDailyLoad({
    draft,
    completedItemIds,
    routines,
    routineCompletions,
    plannedRoutineIds,
    localDate,
    activeRoutinesMinutes,
  });

  if (!load.isOverCapacity) return null;

  const locale = language === "sr" ? "sr-RS" : language === "tr" ? "tr-TR" : "en-US";
  const excessHours = (load.overCapacityMinutes / 60).toLocaleString(locale, { maximumFractionDigits: 1 });
  const remainingHours = (load.remainingMinutes / 60).toLocaleString(locale, { maximumFractionDigits: 1 });
  const capacityHours = (load.availableMinutes / 60).toLocaleString(locale, { maximumFractionDigits: 1 });

  const intro =
    language === "sr"
      ? `Dan je preopterećen za ${load.overCapacityMinutes} min (ukupno ${remainingHours} h obaveza naspram ${capacityHours} h kapaciteta).`
      : language === "tr"
        ? `Gün ${load.overCapacityMinutes} dk aşırı yüklü (${capacityHours} saat kapasiteye karşın ${remainingHours} saat yükümlülük).`
        : `The day is overloaded by ${load.overCapacityMinutes} min (${remainingHours}h remaining vs ${capacityHours}h capacity).`;

  const moveText = language === "sr" ? "Predlog za pomeranje" : language === "tr" ? "Taşıma önerisi" : "Suggested to move";
  const review = language === "sr" ? "Pregledaj plan" : language === "tr" ? "Planı incele" : "Review plan";

  return (
    <div role="status" className="app-a-panel-danger mb-5 p-4 text-[14px]">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{intro}</p>
          {load.suggestedMoves.length ? (
            <p className="mt-1">
              {moveText}: {load.suggestedMoves.map((item) => item.title).join(", ")}.
            </p>
          ) : null}
          {onReview ? (
            <button
              type="button"
              onClick={onReview}
              className="app-a-secondary-button app-a-focus-ring mt-3 px-3 text-[13px]"
            >
              {review}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
