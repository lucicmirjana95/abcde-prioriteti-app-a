import React from 'react';
import { AvailableTimeValue, AvailableTimeType } from '../../types';

interface Props {
  value: AvailableTimeValue | undefined;
  onChange: (val: AvailableTimeValue | undefined) => void;
  t: any;
  error?: string;
}

export default function AvailableTimeSelector({ value, onChange, t, error }: Props) {
  const options: { type: AvailableTimeType, label: string }[] = [
    { type: '30m', label: t.time30m },
    { type: '1h', label: t.time1h },
    { type: '2h', label: t.time2h },
    { type: '4h', label: t.time4h },
    { type: 'most_day', label: t.timeMost },
    { type: 'custom', label: t.timeCustom },
  ];

  const handleSelect = (type: AvailableTimeType) => {
    if (type === 'custom') {
      onChange({ type: 'custom', customHours: 0, customMinutes: 0 });
    } else {
      onChange({ type });
    }
  };

  const handleCustomChange = (field: 'h' | 'm', numStr: string) => {
    const parsed = parseInt(numStr, 10);
    const num = isNaN(parsed) ? 0 : parsed;
    onChange({
      type: 'custom',
      customHours: field === 'h' ? num : (value?.customHours || 0),
      customMinutes: field === 'm' ? num : (value?.customMinutes || 0),
    });
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <div className={value !== undefined ? "flex min-h-[44px] items-center justify-end" : "h-0"}>
         <legend className="sr-only">{t.sectionTime}</legend>
         {value !== undefined && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="app-a-focus-ring min-h-[44px] rounded-lg px-2 text-[14px] font-medium text-[#0071E3] dark:text-[#0A84FF]"
            >
              {t.clearSelection}
            </button>
         )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((opt) => {
          const isSelected = value?.type === opt.type;
          return (
            <label
              key={opt.type}
              className={`flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border px-3 text-center transition-colors focus-within:ring-2 focus-within:ring-[#0A84FF] ${
                isSelected 
                  ? "border-[#0A84FF] bg-[#0A84FF]/10 text-[#0071E3] font-semibold dark:text-[#0A84FF]" 
                  : "border-black/10 bg-white text-black/70 hover:bg-black/[0.025] dark:border-white/10 dark:bg-[#1C1C1E] dark:text-white/70 dark:hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name="available-time"
                value={opt.type}
                checked={isSelected}
                onChange={() => handleSelect(opt.type)}
                className="sr-only"
              />
              <span className="text-[16px]">{opt.label}</span>
            </label>
          )
        })}
      </div>

      {value?.type === 'custom' && (
        <div className="flex items-center gap-4 mt-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-col gap-1">
            <label htmlFor="custom-hours" className="text-[12px] font-medium text-black/60 dark:text-white/60">{t.timeCustomHours}</label>
            <input 
              id="custom-hours"
              type="number"
              min="0"
              max="23"
              value={value.customHours || ""}
              onChange={(e) => handleCustomChange('h', e.target.value)}
              className="app-a-field min-h-[48px] w-24 px-3 text-[16px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="custom-mins" className="text-[12px] font-medium text-black/60 dark:text-white/60">{t.timeCustomMins}</label>
            <input 
              id="custom-mins"
              type="number"
              min="0"
              max="59"
              step="5"
              value={value.customMinutes || ""}
              onChange={(e) => handleCustomChange('m', e.target.value)}
              className="app-a-field min-h-[48px] w-24 px-3 text-[16px]"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-[14px] text-[#FF3B30] dark:text-[#FF453A] mt-1" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
