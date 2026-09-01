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
  return (
    <fieldset className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between mb-1">
        <legend className="text-[16px] font-medium" style={{ color: "var(--app-a-text)" }}>
          {label}
        </legend>
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="app-a-focus-ring min-h-[44px] rounded-lg px-2 text-[14px] font-medium transition-colors"
            style={{ color: "var(--app-a-accent)" }}
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div
          className="grid grid-cols-5 gap-1.5 rounded-[13px] p-1 border"
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
                title={opt.label}
                className="flex min-h-[46px] cursor-pointer items-center justify-center rounded-[10px] px-1.5 text-center transition-all focus-within:ring-2"
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
                <span className="text-[15px] sm:hidden">{opt.value}</span>
                <span className="hidden text-[13px] leading-tight sm:inline">{opt.label}</span>
              </label>
            );
          })}
        </div>
        {value !== undefined && (
          <p
            className="text-center text-[13px] sm:hidden"
            style={{ color: "var(--app-a-text-secondary)" }}
          >
            {options.find((option) => option.value === value)?.label}
          </p>
        )}
      </div>
    </fieldset>
  );
}
