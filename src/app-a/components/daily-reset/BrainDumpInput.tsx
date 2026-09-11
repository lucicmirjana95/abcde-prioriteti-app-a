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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="brain-dump" className="text-[15px] font-medium" style={{ color: "var(--app-a-text)" }}>
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
          className="app-a-field h-[170px] min-h-[160px] max-h-[240px] w-full resize-y p-3.5 pb-7 text-[16px] leading-relaxed transition-shadow"
          style={{
            borderColor: error ? "var(--app-a-danger)" : "var(--app-a-border)",
          }}
        />
        <div
          className="absolute bottom-2 right-2.5 text-[11px] font-medium select-none pointer-events-none"
          style={{
            color: "var(--app-a-text-tertiary)",
          }}
        >
          {value.length} / {MAX_CHARS}
        </div>
      </div>

      {error && (
        <p
          id="brain-dump-error"
          className="text-[13px] font-medium"
          style={{ color: "var(--app-a-danger)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
