import React from "react";
import { SafeIntervention } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";

interface Props {
  intervention: SafeIntervention;
  language: AppALanguage;
  onOpenReset?: () => void;
}

export default function SafeInterventionCard({ intervention, language, onOpenReset }: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;

  return (
    <div
      data-testid="safe-intervention-card"
      className="my-6 rounded-2xl border p-4 text-left"
      style={{
        backgroundColor: "var(--app-a-accent-soft)",
        borderColor: "var(--app-a-accent)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[13px] font-bold tracking-wide uppercase"
          style={{ color: "var(--app-a-accent)" }}
        >
          {t.optionalInterventionTitle}
        </span>
        <span
          className="text-[13px] font-medium"
          style={{ color: "var(--app-a-text-secondary)" }}
        >
          {intervention.estimatedMinutes} min
        </span>
      </div>
      <h4
        className="mb-1 text-[16px] font-semibold"
        style={{ color: "var(--app-a-text)" }}
      >
        {intervention.title}
      </h4>
      <p
        className="mb-2 text-[14px] leading-relaxed"
        style={{ color: "var(--app-a-text)" }}
      >
        {intervention.description}
      </p>
      {intervention.reason && (
        <p
          className="text-[13px] italic"
          style={{ color: "var(--app-a-text-secondary)" }}
        >
          "{intervention.reason}"
        </p>
      )}
      {onOpenReset && (intervention.type === "breathing" || intervention.type === "rest" || intervention.type === "focus") ? (
        <button type="button" onClick={onOpenReset} className="app-a-secondary-button app-a-focus-ring mt-3 px-3 text-[13px]">
          {language === "sr" ? "Otvori sesije za predah" : language === "tr" ? "Mola oturumlarını aç" : "Open reset sessions"}
        </button>
      ) : null}
    </div>
  );
}
