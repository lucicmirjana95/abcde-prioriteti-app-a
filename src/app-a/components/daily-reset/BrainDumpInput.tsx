import React, { useRef, useEffect } from "react";
import type { AppALanguage } from "../../types";
import VoiceInputButton from "../voice/VoiceInputButton";
import InputCopyButton from "../common/InputCopyButton";

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
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <label htmlFor="brain-dump" className="text-[17px] font-semibold tracking-tight" style={{ color: "var(--app-a-text)" }}>
          {t.brainDumpLabel}
        </label>
        {t.brainDumpSubtitle ? (
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--app-a-text-secondary)" }}>
            {t.brainDumpSubtitle}
          </p>
        ) : null}
      </div>

      <div
        className="relative rounded-[18px] border p-3.5 pb-12 transition-shadow"
        style={{
          backgroundColor: "var(--app-a-surface-secondary)",
          borderColor: error ? "var(--app-a-danger)" : "var(--app-a-border)",
        }}
      >
        <textarea
          ref={textareaRef}
          id="brain-dump"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
          placeholder={t.brainDumpPlaceholder}
          aria-invalid={!!error}
          aria-errormessage={error ? "brain-dump-error" : undefined}
          className="w-full bg-transparent resize-y outline-none border-0 p-0 text-[16px] leading-relaxed text-[var(--app-a-text)] placeholder:text-[var(--app-a-text-tertiary)] min-h-[110px] max-h-[300px]"
        />

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
          <InputCopyButton text={value} language={language} />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-a-surface-elevated)] shadow-sm border border-[var(--app-a-border)]">
            <VoiceInputButton language={language} value={value} onChange={onChange} maxLength={MAX_CHARS} describedBy="brain-dump-voice-status" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <div
          className="text-[12px] font-medium select-none"
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
