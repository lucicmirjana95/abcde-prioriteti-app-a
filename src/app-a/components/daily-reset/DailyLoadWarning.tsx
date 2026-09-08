import { AlertTriangle } from "lucide-react";
import type { DailyPlanDraft } from "../../domain/daily-reset/contracts";
import { assessDailyLoad } from "../../domain/daily-reset/dailyLoad";
import type { AppALanguage } from "../../types";

interface Props {
  draft: DailyPlanDraft;
  language: AppALanguage;
  completedItemIds?: string[];
  onReview?: () => void;
}

export default function DailyLoadWarning({ draft, language, completedItemIds = [], onReview }: Props) {
  const load = assessDailyLoad(draft, completedItemIds);
  if (!load.overloaded) return null;
  const locale = language === "sr" ? "sr-RS" : language === "tr" ? "tr-TR" : "en-US";
  const hours = (load.remainingMinutes / 60).toLocaleString(locale, { maximumFractionDigits: 1 });
  const intro = language === "sr"
    ? `Dan je preopterećen: preostalo je oko ${hours} h obaveza. Fiksne obaveze ostaju sačuvane.`
    : language === "tr"
      ? `Gün aşırı yüklü: yaklaşık ${hours} saat yükümlülük kaldı. Sabit yükümlülükler korunur.`
      : `The day is overloaded: about ${hours} hours of commitments remain. Fixed commitments stay protected.`;
  const moveText = language === "sr" ? "Predlog za pomeranje" : language === "tr" ? "Taşıma önerisi" : "Suggested to move";
  const review = language === "sr" ? "Pregledaj plan" : language === "tr" ? "Planı incele" : "Review plan";
  return <div role="status" className="app-a-panel-danger mb-5 p-4 text-[14px]">
    <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">{intro}</p>{load.suggestedMoves.length ? <p className="mt-1">{moveText}: {load.suggestedMoves.map((item) => item.title).join(", ")}.</p> : null}{onReview ? <button type="button" onClick={onReview} className="app-a-secondary-button app-a-focus-ring mt-3 px-3 text-[13px]">{review}</button> : null}</div></div>
  </div>;
}
