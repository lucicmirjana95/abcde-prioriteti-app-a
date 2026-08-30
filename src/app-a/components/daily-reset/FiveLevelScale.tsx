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
        <legend className="text-[16px] font-medium text-black dark:text-white">
          {label}
        </legend>
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="app-a-focus-ring min-h-[44px] rounded-lg px-2 text-[14px] font-medium text-[#0071E3] dark:text-[#0A84FF]"
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-5 gap-1.5 rounded-[13px] bg-black/[0.045] p-1 dark:bg-white/[0.08]">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <label
                key={opt.value}
                title={opt.label}
                className={`flex min-h-[46px] cursor-pointer items-center justify-center rounded-[10px] px-1.5 text-center transition-all focus-within:ring-2 focus-within:ring-[#0A84FF] ${
                  isSelected 
                    ? "bg-white text-[#0071E3] font-semibold shadow-sm dark:bg-[#3A3A3C] dark:text-[#0A84FF]" 
                    : "text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white"
                }`}
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
            )
          })}
        </div>
        {value !== undefined && (
          <p className="text-center text-[13px] text-[#6E6E73] sm:hidden dark:text-[#AEAEB2]">
            {options.find((option) => option.value === value)?.label}
          </p>
        )}
      </div>
    </fieldset>
  );
}
