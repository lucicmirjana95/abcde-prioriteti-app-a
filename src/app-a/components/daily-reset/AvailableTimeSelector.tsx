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
              className="app-a-focus-ring min-h-[44px] rounded-lg px-2 text-[14px] font-medium transition-colors"
              style={{ color: "var(--app-a-accent)" }}
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
              className="flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border px-3 text-center transition-all focus-within:ring-2"
              style={{
                borderColor: isSelected ? "var(--app-a-accent)" : "var(--app-a-border)",
                backgroundColor: isSelected ? "var(--app-a-accent-soft)" : "var(--app-a-surface)",
                color: isSelected ? "var(--app-a-accent)" : "var(--app-a-text)",
                fontWeight: isSelected ? 600 : 500,
              }}
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
          );
        })}
      </div>

      {value?.type === 'custom' && (
        <div className="flex items-center gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="custom-hours"
              className="text-[13px] font-medium"
              style={{ color: "var(--app-a-text-secondary)" }}
            >
              {t.timeCustomHours}
            </label>
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
            <label
              htmlFor="custom-mins"
              className="text-[13px] font-medium"
              style={{ color: "var(--app-a-text-secondary)" }}
            >
              {t.timeCustomMins}
            </label>
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
        <p
          className="text-[14px] font-medium mt-1"
          style={{ color: "var(--app-a-danger)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
