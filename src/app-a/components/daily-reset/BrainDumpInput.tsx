import React, { useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  t: any;
  error?: string;
}

export default function BrainDumpInput({ value, onChange, t, error }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS = 10000;

  // Auto-focus if error changes to present
  useEffect(() => {
    if (error && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [error]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label htmlFor="brain-dump" className="text-[16px] font-medium text-black dark:text-white">
          {t.brainDumpLabel}
        </label>
        <button
          type="button"
          disabled
          aria-label={t.voiceLabel}
          className="flex min-h-[44px] cursor-not-allowed items-center gap-2 rounded-xl bg-black/5 px-3 py-1.5 text-black/35 dark:bg-white/5 dark:text-white/35"
        >
          <Mic className="w-5 h-5 shrink-0" />
          <span className="text-[14px] font-medium">{t.voicePlaceholder}</span>
        </button>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          id="brain-dump"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
          placeholder={t.brainDumpPlaceholder}
          aria-invalid={!!error}
          aria-errormessage={error ? "brain-dump-error" : undefined}
          className={`app-a-field min-h-[210px] w-full resize-y p-4 pb-10 text-[17px] leading-relaxed placeholder-black/30 transition-shadow dark:placeholder-white/30 md:min-h-[240px] ${
            error ? "border-[#FF3B30] dark:border-[#FF453A]" : "border-black/10 dark:border-white/10"
          }`}
        />
        <div className="absolute bottom-3 right-3 text-[12px] text-black/40 dark:text-white/40 bg-white/80 dark:bg-[#1C1C1E]/80 px-2 py-0.5 rounded pointer-events-none">
          {value.length} / {MAX_CHARS}
        </div>
      </div>

      {error && (
        <p id="brain-dump-error" className="text-[14px] text-[#FF3B30] dark:text-[#FF453A]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
