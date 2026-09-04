import React, { useRef, useEffect } from 'react';
import type { AppALanguage } from '../../types';
import VoiceInputButton from '../voice/VoiceInputButton';

interface Props {
  value: string;
  onChange: (val: string) => void;
  t: any;
  language: AppALanguage;
  error?: string;
}

export default function BrainDumpInput({ value, onChange, t, language, error }: Props) {
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
        <label htmlFor="brain-dump" className="text-[16px] font-medium" style={{ color: "var(--app-a-text)" }}>
          {t.brainDumpLabel}
        </label>
        <VoiceInputButton language={language} value={value} onChange={onChange} maxLength={MAX_CHARS} describedBy="brain-dump-voice-status" />
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
          className="app-a-field min-h-[210px] w-full resize-y p-4 pb-10 text-[17px] leading-relaxed transition-shadow md:min-h-[240px]"
          style={{
            borderColor: error ? "var(--app-a-danger)" : "var(--app-a-border)",
          }}
        />
        <div
          className="absolute bottom-3 right-3 text-[12px] px-2 py-0.5 rounded pointer-events-none"
          style={{
            backgroundColor: "var(--app-a-surface-secondary)",
            color: "var(--app-a-text-tertiary)",
          }}
        >
          {value.length} / {MAX_CHARS}
        </div>
      </div>

      {error && (
        <p
          id="brain-dump-error"
          className="text-[14px] font-medium"
          style={{ color: "var(--app-a-danger)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
