import React from "react";
import { SafeIntervention } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";

interface Props {
  intervention: SafeIntervention;
  language: AppALanguage;
}

export default function SafeInterventionCard({ intervention, language }: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  return (
    <div
      data-testid="safe-intervention-card"
      className="p-4 my-6 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 rounded-2xl border border-[#007AFF]/20 text-left"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold tracking-wide uppercase text-[#007AFF]">
          {t.optionalInterventionTitle}
        </span>
        <span className="text-[13px] text-[#3C3C43]/70 dark:text-[#EBEBF5]/60 font-medium">
          {intervention.estimatedMinutes} min
        </span>
      </div>
      <h4 className="text-[16px] font-semibold text-black dark:text-white mb-1">
        {intervention.title}
      </h4>
      <p className="text-[14px] text-[#3C3C43] dark:text-[#EBEBF5]/90 mb-2 leading-relaxed">
        {intervention.description}
      </p>
      {intervention.reason && (
        <p className="text-[13px] italic text-[#3C3C43]/80 dark:text-[#EBEBF5]/70">
          "{intervention.reason}"
        </p>
      )}
    </div>
  );
}
