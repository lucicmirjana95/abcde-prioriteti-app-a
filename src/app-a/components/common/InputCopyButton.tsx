import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { AppALanguage } from "../../types";

interface Props {
  text: string;
  language?: AppALanguage;
  className?: string;
  size?: "sm" | "md";
}

const LABELS = {
  sr: { copy: "Kopiraj tekst", copied: "Kopirano!" },
  en: { copy: "Copy text", copied: "Copied!" },
  tr: { copy: "Metni kopyala", copied: "Kopyalandı!" },
} as const;

export default function InputCopyButton({
  text,
  language = "sr",
  className = "",
  size = "sm",
}: Props) {
  const [copied, setCopied] = useState(false);
  const t = LABELS[language] || LABELS.sr;
  const hasText = Boolean(text && text.trim().length > 0);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasText) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for environments where clipboard API is constrained
      try {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        // Silent catch
      }
    }
  };

  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!hasText}
      aria-label={copied ? t.copied : t.copy}
      title={copied ? t.copied : t.copy}
      className={`app-a-focus-ring relative inline-flex items-center justify-center rounded-xl transition-all duration-150 ${
        isSmall ? "h-8 w-8 min-h-[32px] min-w-[32px]" : "h-9 w-9 min-h-[36px] min-w-[36px]"
      } ${
        copied
          ? "bg-emerald-50 text-emerald-600 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700 shadow-xs"
          : hasText
          ? "text-[var(--app-a-text-tertiary)] hover:text-[var(--app-a-text)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95"
          : "opacity-30 cursor-not-allowed text-[var(--app-a-text-tertiary)]"
      } ${className}`}
    >
      {copied ? (
        <Check className={isSmall ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2.5} />
      ) : (
        <Copy className={isSmall ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={1.8} />
      )}
    </button>
  );
}
