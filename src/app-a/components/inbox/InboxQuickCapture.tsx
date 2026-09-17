import React from "react";
import { Loader2, Plus, AlertCircle, RefreshCw } from "lucide-react";
import VoiceInputButton from "../voice/VoiceInputButton";
import InputCopyButton from "../common/InputCopyButton";
import type { AppALanguage } from "../../types";

export interface InboxQuickCaptureProps {
  language: AppALanguage;
  draftTitle: string;
  onDraftTitleChange: (text: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  isSubmitting: boolean;
  draftError: string | null;
  translations: {
    add: string;
    placeholder: string;
    quickPrompt: string;
    error: string;
    retry?: string;
  };
}

const RETRY_LABELS = {
  en: "Try again",
  sr: "Pokušaj ponovo",
  tr: "Tekrar dene",
} as const;

export default function InboxQuickCapture({
  language,
  draftTitle,
  onDraftTitleChange,
  onSubmit,
  onRetry,
  isSubmitting,
  draftError,
  translations: t,
}: InboxQuickCaptureProps) {
  const retryLabel = t.retry || RETRY_LABELS[language];

  return (
    <section
      className="app-a-surface mb-5 rounded-[18px] border p-4 shadow-sm"
      style={{ borderColor: "var(--app-a-border)" }}
      aria-label={t.add}
    >
      <div className="relative">
        <textarea
          rows={3}
          className="app-a-field app-a-focus-ring w-full resize-none p-3 pb-12 text-[15px] sm:text-[16px] leading-relaxed"
          maxLength={500}
          value={draftTitle}
          onChange={(e) => onDraftTitleChange(e.target.value)}
          placeholder={t.placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              onSubmit();
            }
          }}
        />
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
          {draftTitle.length > 0 ? (
            <span
              className="text-[11px] tabular-nums mr-1"
              style={{ color: "var(--app-a-text-secondary)" }}
            >
              {draftTitle.length} / 500
            </span>
          ) : null}
          <InputCopyButton
            text={draftTitle}
            language={language}
            size="sm"
          />
          <VoiceInputButton
            language={language}
            value={draftTitle}
            onChange={onDraftTitleChange}
            maxLength={500}
            className="h-9 w-9 shrink-0"
          />
        </div>
      </div>

      {draftError ? (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-[13px] font-medium"
          style={{ background: "var(--app-a-danger-soft)", color: "var(--app-a-danger)" }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{draftError}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={isSubmitting}
            className="app-a-focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: "var(--app-a-danger)",
              color: "#fff",
            }}
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>{retryLabel}</span>
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px]" style={{ color: "var(--app-a-text-secondary)" }}>
          {t.quickPrompt}
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!draftTitle.trim() || isSubmitting}
          className="app-a-primary-button app-a-focus-ring min-h-[44px] px-4 text-[14px]"
        >
          {isSubmitting ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          <span>{t.add}</span>
        </button>
      </div>
    </section>
  );
}
