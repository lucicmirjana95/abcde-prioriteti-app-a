import React, { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import GrowthPathArt from "../GrowthPathArt";
import type { MedallionType } from "../GrowthPathArt";

interface StepData {
  medallion: MedallionType;
  title: string;
  desc: string;
}

interface Props {
  language: "en" | "sr" | "tr";
}

const COPY: Record<string, { headerTitle: string; headerDesc: string; steps: StepData[] }> = {
  en: {
    headerTitle: "How is your plan created?",
    headerDesc: "Share what is on your mind, then review the plan before saving.",
    steps: [
      { medallion: "stones", title: "Get everything out of your head", desc: "Tasks, ideas, and worries can be mixed together." },
      { medallion: "waves", title: "Add how you feel", desc: "Energy and pleasantness help keep the plan realistic." },
      { medallion: "plant", title: "Review the suggestion", desc: "You can change everything before saving the plan." },
    ],
  },
  sr: {
    headerTitle: "Kako nastaje tvoj plan?",
    headerDesc: "Uneseš šta ti je na umu, a plan proveravaš pre čuvanja.",
    steps: [
      { medallion: "stones", title: "Izbaci sve iz glave", desc: "Zadaci, ideje i brige mogu biti pomešani." },
      { medallion: "waves", title: "Dodaj kako se osećaš", desc: "Energija i prijatnost pomažu da plan ostane realan." },
      { medallion: "plant", title: "Pregledaj predlog", desc: "Sve možeš promeniti pre nego što sačuvaš plan." },
    ],
  },
  tr: {
    headerTitle: "Planın nasıl oluşturulur?",
    headerDesc: "Aklındakileri paylaş, ardından kaydetmeden önce planı gözden geçir.",
    steps: [
      { medallion: "stones", title: "Aklındakileri boşalt", desc: "Görevler, fikirler ve endişeler karışık olabilir." },
      { medallion: "waves", title: "Nasıl hissettiğini ekle", desc: "Enerji ve hoşluk düzeyi planın gerçekçi kalmasına yardımcı olur." },
      { medallion: "plant", title: "Öneriyi gözden geçir", desc: "Planı kaydetmeden önce her şeyi değiştirebilirsin." },
    ],
  },
};

export default function PlanCreationDisclosure({ language }: Props) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const headerId = useId();
  const t = COPY[language] ?? COPY["en"];

  const toggle = () => setOpen((v) => !v);

  return (
    <div
      className="app-a-surface rounded-[20px] border overflow-hidden"
      style={{ borderColor: "var(--app-a-border)" }}
    >
      {/* Toggle Button */}
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className="app-a-focus-ring flex w-full items-center justify-between gap-3 min-h-[56px] px-4 py-3 text-left"
        style={{ background: "transparent" }}
      >
        <span className="flex flex-col gap-0.5 min-w-0">
          <span
            className="block text-[15px] font-semibold leading-tight"
            style={{ color: "var(--app-a-text)" }}
          >
            {t.headerTitle}
          </span>
          <span
            className="block text-[13px] leading-snug"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            {t.headerDesc}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={[
            "h-5 w-5 shrink-0",
            "transition-transform duration-[240ms] motion-reduce:transition-none",
            open ? "rotate-180" : "rotate-0",
          ].join(" ")}
          style={{ color: "var(--app-a-text-secondary)" }}
        />
      </button>

      {/* Expandable content */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: open
            ? "grid-template-rows 260ms ease-out, opacity 220ms ease-out"
            : "grid-template-rows 220ms ease-in, opacity 180ms ease-in",
        }}
        className="motion-reduce:[transition:none!important]"
      >
        <div style={{ overflow: "hidden" }}>
          <div className="relative px-4 pb-5 pt-2">
            {/* Decorative vertical connector line */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "calc(1rem + 19px)",
                top: "2.75rem",
                bottom: "6.5rem",
                width: "1px",
                background: "linear-gradient(to bottom, #8aaec4 0%, #8aaec4aa 60%, transparent 100%)",
                opacity: 0.35,
              }}
            />
            {/* Steps */}
            <ol className="flex flex-col gap-[16px] list-none m-0 p-0">
              {t.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <GrowthPathArt
                    variant="medallion"
                    medallionType={step.medallion}
                    size={40}
                    aria-hidden="true"
                    className="shrink-0 mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-[15px] font-semibold leading-tight"
                      style={{ color: "var(--app-a-text)" }}
                    >
                      {step.title}
                    </span>
                    <span
                      className="text-[14px] leading-relaxed"
                      style={{ color: "var(--app-a-text-secondary)" }}
                    >
                      {step.desc}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
