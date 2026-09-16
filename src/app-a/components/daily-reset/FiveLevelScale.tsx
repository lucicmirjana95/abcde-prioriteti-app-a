import React from "react";
import { EnergyLevel, PleasantnessLevel } from "../../types";

interface Option {
  value: EnergyLevel | PleasantnessLevel;
  label: string;
}

interface Props {
  id: string;
  label: string;
  subtitle?: string;
  value: EnergyLevel | PleasantnessLevel | undefined;
  onChange: (val: any) => void;
  options: Option[];
  clearLabel: string;
  minLabel?: string;
  maxLabel?: string;
}

export default function FiveLevelScale({
  id,
  label,
  subtitle,
  value,
  onChange,
  options,
  clearLabel,
  minLabel,
  maxLabel,
}: Props) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <fieldset className="flex flex-col justify-between h-full gap-2.5">
      <legend className="flex flex-col gap-0.5">
        <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--app-a-text)" }}>
          {label}
        </span>
        {subtitle ? (
          <span className="text-[13px] leading-snug" style={{ color: "var(--app-a-text-secondary)" }}>
            {subtitle}
          </span>
        ) : null}
      </legend>

      <div className="flex flex-col gap-1.5 pt-1">
        <div className="grid grid-cols-5 gap-1.5">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <label
                key={opt.value}
                title={`${opt.value}: ${opt.label}`}
                className={`relative flex aspect-square cursor-pointer items-center justify-center rounded-full border text-center transition-all select-none ${
                  isSelected
                    ? "shadow-sm scale-105"
                    : "hover:border-[var(--app-a-border-strong)] active:opacity-75"
                }`}
                style={{
                  backgroundColor: isSelected
                    ? "var(--app-a-accent)"
                    : "var(--app-a-surface-secondary)",
                  borderColor: isSelected
                    ? "var(--app-a-accent)"
                    : "var(--app-a-border)",
                  color: isSelected ? "#FFFFFF" : "var(--app-a-text)",
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                <input
                  type="radio"
                  name={id}
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
                <span className="text-[14px] leading-none">{opt.value}</span>
              </label>
            );
          })}
        </div>
        {(minLabel || maxLabel) && (
          <div className="flex items-center justify-between px-0.5 text-[11px] select-none" style={{ color: "var(--app-a-text-tertiary)" }}>
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        )}
      </div>
    </fieldset>
  );
}
