import { Clock } from "lucide-react";
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
  // If user never set an explicit available time limit, do not show any capacity warning
  if (!draft.availableMinutes || draft.availableMinutes <= 0) return null;

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
  const remainingHours = (load.remainingMinutes / 60).toLocaleString(locale, { maximumFractionDigits: 1 });
  const capacityHours = (load.availableMinutes / 60).toLocaleString(locale, { maximumFractionDigits: 1 });

  const intro =
    language === "sr"
      ? `Predloženi plan sadrži oko ${remainingHours} h obaveza (tvoj okvir je bio ${capacityHours} h).`
      : language === "tr"
        ? `Önerilen plan yaklaşık ${remainingHours} saatlik görev içeriyor (hedefiniz ${capacityHours} saatti).`
        : `Your suggested plan has around ${remainingHours}h of commitments (your target was ${capacityHours}h).`;

  const moveText =
    language === "sr"
      ? "Za laganiji tempo, ove stavke možeš prebaciti u opcione"
      : language === "tr"
        ? "Daha dengeli bir gün için isteğe bağlıya taşınabilir"
        : "To keep a calm pace, consider keeping these optional";
  const review = language === "sr" ? "Prilagodi plan" : language === "tr" ? "Planı düzenle" : "Adjust plan";

  return (
    <div
      role="status"
      className="mb-5 rounded-[16px] border p-4 text-[14px] backdrop-blur-md transition-all"
      style={{
        backgroundColor: "var(--app-a-wash-apricot, rgba(239, 177, 123, 0.12))",
        borderColor: "rgba(239, 177, 123, 0.28)",
        color: "var(--app-a-text)",
      }}
    >
      <div className="flex items-start gap-3">
        <Clock
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="font-medium text-[13px] leading-relaxed opacity-90">{intro}</p>
          {load.suggestedMoves.length ? (
            <p className="mt-1 text-[13px] opacity-75">
              {moveText}: <span className="font-medium">{load.suggestedMoves.map((item) => item.title).join(", ")}</span>.
            </p>
          ) : null}
          {onReview ? (
            <button
              type="button"
              onClick={onReview}
              className="app-a-secondary-button app-a-focus-ring mt-2.5 px-3 py-1 text-[12px] font-medium"
            >
              {review}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

