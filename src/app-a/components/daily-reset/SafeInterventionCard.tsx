import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { SafeIntervention } from "../../domain/daily-reset/contracts";
import { AppALanguage, APP_A_TRANSLATIONS } from "../../types";

interface Props {
  intervention: SafeIntervention;
  language: AppALanguage;
  onOpenReset?: () => void;
  onDismiss?: () => void;
}

export default function SafeInterventionCard({ intervention, language, onOpenReset, onDismiss }: Props) {
  const t = APP_A_TRANSLATIONS[language] || APP_A_TRANSLATIONS.en;
  const cardRef = useRef<HTMLDivElement>(null);

  const dismissLabel = language === "sr" ? "Skloni predlog" : language === "tr" ? "Öneriyi kaldır" : "Dismiss suggestion";
  const notNowLabel = language === "sr" ? "Ne sada" : language === "tr" ? "Şimdi değil" : "Not now";

  useEffect(() => {
    if (!onDismiss) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && cardRef.current && cardRef.current.contains(document.activeElement)) {
        onDismiss();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  return (
    <div
      ref={cardRef}
      data-testid="safe-intervention-card"
      className="relative my-6 rounded-2xl border p-4 text-left"
      style={{
        backgroundColor: "var(--app-a-accent-soft)",
        borderColor: "var(--app-a-accent)",
      }}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <span
          className="text-[13px] font-bold tracking-wide uppercase pr-2"
          style={{ color: "var(--app-a-accent)" }}
        >
          {t.optionalInterventionTitle}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="text-[13px] font-medium mr-1"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            {intervention.estimatedMinutes} min
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={dismissLabel}
              className="app-a-focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#86868B] transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:opacity-60"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <h4
        className="mb-1 text-[16px] font-semibold pr-10"
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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onOpenReset && (intervention.type === "breathing" || intervention.type === "rest" || intervention.type === "focus") ? (
          <button type="button" onClick={onOpenReset} className="app-a-secondary-button app-a-focus-ring px-3 text-[13px]">
            {language === "sr" ? "Otvori sesije za predah" : language === "tr" ? "Mola oturumlarını aç" : "Open reset sessions"}
          </button>
        ) : null}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="app-a-secondary-button app-a-focus-ring px-3 text-[13px]"
          >
            {notNowLabel}
          </button>
        )}
      </div>
    </div>
  );
}
