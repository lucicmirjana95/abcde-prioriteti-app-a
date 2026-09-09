import React from 'react';
import { EnergyLevel, PleasantnessLevel } from '../../types';

interface Option {
  value: EnergyLevel | PleasantnessLevel;
  label: string;
}

interface Props {
  id: string;
  label: string;
  value: EnergyLevel | PleasantnessLevel | undefined;
  onChange: (val: any) => void;
  options: Option[];
  clearLabel: string;
}

export default function FiveLevelScale({ id, label, value, onChange, options, clearLabel }: Props) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <fieldset className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between min-h-[28px]">
        <legend className="text-[14px] font-medium" style={{ color: "var(--app-a-text)" }}>
          <span>{label}</span>
          {selectedOption ? (
            <span className="ml-1.5 font-semibold text-[13px]" style={{ color: "var(--app-a-accent)" }}>
              — {selectedOption.label}
            </span>
          ) : null}
        </legend>
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="app-a-focus-ring min-h-[36px] rounded-lg px-2 text-[12px] font-medium transition-colors"
            style={{ color: "var(--app-a-accent)" }}
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div
        className="grid grid-cols-5 gap-1 rounded-[12px] p-1 border"
        style={{
          backgroundColor: "var(--app-a-disabled-bg)",
          borderColor: "var(--app-a-border)",
        }}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              title={`${opt.value}: ${opt.label}`}
              className="flex min-h-[44px] cursor-pointer flex-col items-center justify-center rounded-[8px] px-0.5 py-1 text-center transition-all focus-within:ring-2"
              style={{
                backgroundColor: isSelected ? "var(--app-a-surface-elevated)" : "transparent",
                color: isSelected ? "var(--app-a-accent)" : "var(--app-a-text-secondary)",
                fontWeight: isSelected ? 600 : 500,
                boxShadow: isSelected ? "var(--app-a-shadow)" : "none",
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
              <span className="text-[14px] font-semibold leading-none">{opt.value}</span>
              <span className="mt-0.5 max-w-full truncate text-[10px] leading-none opacity-85 select-none">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
