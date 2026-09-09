import React, { useState, useRef, useId } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import type { AppALanguage } from '../../types';
import { SHARE_APP_LOCALIZATION } from '../../settings/shareLocalization';
import { getAppACanonicalPublicUrl } from '../../settings/shareConfig';

export interface ShareAppCardProps {
  language: AppALanguage;
  customUrlOverride?: string;
  className?: string;
}

export type ShareFeedbackState = 'idle' | 'copied' | 'manual';

export default function ShareAppCard({
  language,
  customUrlOverride,
  className = '',
}: ShareAppCardProps) {
  const t = SHARE_APP_LOCALIZATION[language] || SHARE_APP_LOCALIZATION.en;
  const headingId = useId();
  const descriptionId = useId();
  const inputId = useId();

  const [feedbackState, setFeedbackState] = useState<ShareFeedbackState>('idle');
  const [isSharing, setIsSharing] = useState(false);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Derive the verified canonical URL
  const validationResult = getAppACanonicalPublicUrl(customUrlOverride);
  const isUrlAvailable = validationResult.isValid && Boolean(validationResult.sanitizedUrl);
  const shareableUrl = validationResult.sanitizedUrl || '';

  const handleShare = async () => {
    // Prevent duplicate rapid taps
    if (isSharing) {
      return;
    }

    if (!isUrlAvailable || !shareableUrl) {
      return;
    }

    setIsSharing(true);

    // 1. Attempt Native Web Share API if supported
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: t.sharePayloadTitle,
          text: t.sharePayloadDescription,
          url: shareableUrl,
        });

        // Completed successfully through native share sheet
        setFeedbackState('idle');
        setIsSharing(false);
        return;
      } catch (error: unknown) {
        // User cancellation must be treated as a normal cancellation, not an error
        if (
          error instanceof Error &&
          (error.name === 'AbortError' || error.name === 'NotAllowedError')
        ) {
          setIsSharing(false);
          return;
        }
        // Other errors fall through to clipboard fallback
      }
    }

    // 2. Clipboard Fallback
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(shareableUrl);
        setFeedbackState('copied');
        setIsSharing(false);
        return;
      } catch {
        // Clipboard write failed or blocked -> fall through to manual copy field
      }
    }

    // 3. Manual Copy Fallback
    setFeedbackState('manual');
    setIsSharing(false);

    // Focus and select the read-only field
    setTimeout(() => {
      if (manualInputRef.current) {
        manualInputRef.current.focus();
        manualInputRef.current.select();
      }
    }, 50);
  };

  const handleManualCopyAction = async () => {
    if (!shareableUrl) return;

    if (manualInputRef.current) {
      manualInputRef.current.focus();
      manualInputRef.current.select();
    }

    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(shareableUrl);
        setFeedbackState('copied');
        return;
      } catch {
        // Keep in manual mode with text selected
      }
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      className={`app-a-surface mt-6 overflow-hidden rounded-2xl p-5 ${className}`}
      id="share-app-card"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="text-[15px] font-semibold text-black dark:text-white"
        >
          {t.cardTitle}
        </h2>
        <p
          id={descriptionId}
          className="text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2] break-words"
        >
          {t.supportingText}
        </p>
      </div>

      <div className="mt-4">
        {isUrlAvailable ? (
          <>
            <button
              type="button"
              id="share-app-action-btn"
              onClick={handleShare}
              disabled={isSharing}
              aria-busy={isSharing}
              className="app-a-primary-button app-a-focus-ring flex min-h-[48px] w-full items-center justify-center gap-2.5 px-4 py-3 text-[15px] font-semibold transition-transform active:scale-[0.99] disabled:opacity-50"
            >
              <Share2
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
                role="img"
                aria-label={t.shareIconLabel}
              />
              <span>{t.shareAction}</span>
            </button>

            {/* Status Announcement: Copied confirmation */}
            {feedbackState === 'copied' && (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 flex min-h-[44px] items-center gap-2 rounded-xl border border-black/10 bg-black/5 px-3.5 py-2.5 text-[13px] font-medium text-black dark:border-white/15 dark:bg-white/10 dark:text-white"
              >
                <Check
                  className="h-4 w-4 shrink-0 text-[#0071E3] dark:text-[#2997ff]"
                  aria-hidden="true"
                />
                <span className="break-words">{t.linkCopied}</span>
              </div>
            )}

            {/* Manual Copy Field Fallback */}
            {feedbackState === 'manual' && (
              <div className="mt-3 space-y-2">
                <p
                  role="status"
                  aria-live="polite"
                  className="text-[13px] font-medium text-black dark:text-white"
                >
                  {t.copyManually}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={manualInputRef}
                    id={inputId}
                    type="text"
                    readOnly
                    value={shareableUrl}
                    aria-label={t.readOnlyFieldLabel}
                    onFocus={(e) => e.currentTarget.select()}
                    className="app-a-field app-a-focus-ring flex-1 min-h-[44px] px-3.5 py-2 text-[13px] font-mono select-all break-all text-[#1d1d1f] dark:text-[#f5f5f7]"
                  />
                  <button
                    type="button"
                    id="manual-copy-action-btn"
                    onClick={handleManualCopyAction}
                    className="app-a-secondary-button app-a-focus-ring min-h-[44px] shrink-0 gap-1.5 px-4 py-2 text-[13px] font-semibold"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span>{t.copyAction}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              id="share-app-action-btn-disabled"
              disabled
              aria-disabled="true"
              className="app-a-primary-button app-a-focus-ring flex min-h-[48px] w-full items-center justify-center gap-2.5 px-4 py-3 text-[15px] font-semibold opacity-50 cursor-not-allowed"
            >
              <Share2
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
                role="img"
                aria-label={t.shareIconLabel}
              />
              <span>{t.shareAction}</span>
            </button>
            <p
              role="status"
              aria-live="polite"
              className="text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2] break-words"
            >
              {t.notAvailableYet}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
