import React from "react";

/**
 * Parses a string containing mild markdown elements (like **bold** and bullet points)
 * into a highly professional, well-spaced React JSX structure.
 * This completely gets rid of double asterisks and makes AI agent advice pristine.
 */
export function renderCleanText(
  text: string,
  isEn: boolean,
  isDarkMode: boolean = false,
): React.ReactNode {
  if (!text) return null;

  // Split into paragraphs by double newlines or structural line breaks
  const rawParagraphs = text.split(/\n\s*\n/);

  const textClass = isDarkMode
    ? "text-[#3C3C43]"
    : "text-[#3C3C43] dark:text-[#EBEBF5]/60";
  const bulletClass = isDarkMode ? "text-[#0A84FF]" : "text-[#007AFF]";
  const bulletTextClass = isDarkMode
    ? "text-[#3C3C43]"
    : "text-black dark:text-white";

  return (
    <div className="space-y-4 text-xs leading-relaxed">
      {rawParagraphs.map((paragraph, pIdx) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return null;

        // Is this entire paragraph a list of bullet points?
        const lines = trimmed.split("\n");
        const isList =
          lines.length > 1 &&
          lines.every((l) => {
            const t = l.trim();
            return (
              !t ||
              t.startsWith("- ") ||
              t.startsWith("* ") ||
              t.startsWith("• ") ||
              /^\d+\.\s+/.test(t)
            );
          });

        if (isList) {
          return (
            <ul key={pIdx} className="space-y-2.5 my-2.5 pl-1">
              {lines.map((line, lIdx) => {
                let cleanLine = line.trim();
                if (!cleanLine) return null;

                // Strip bullet marker
                let marker = "✦";
                if (
                  cleanLine.startsWith("- ") ||
                  cleanLine.startsWith("* ") ||
                  cleanLine.startsWith("• ")
                ) {
                  cleanLine = cleanLine.replace(/^[-*•]\s*/, "");
                } else {
                  const match = cleanLine.match(/^(\d+\.)\s+/);
                  if (match) {
                    marker = match[1];
                    cleanLine = cleanLine.replace(/^\d+\.\s*/, "");
                  }
                }

                return (
                  <li key={lIdx} className="flex gap-2.5 items-start">
                    <span
                      className={`font-semibold shrink-0 text-[13px] text-[#3C3C43] mt-0.5 select-none ${bulletClass}`}
                    >
                      {marker}
                    </span>
                    <span className={`flex-1 font-semibold ${bulletTextClass}`}>
                      {parseInlineBold(cleanLine, isDarkMode)}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Try checking single line bullet points
        const isSingleBullet =
          trimmed.startsWith("- ") ||
          trimmed.startsWith("* ") ||
          trimmed.startsWith("• ");
        if (isSingleBullet) {
          const cleanLine = trimmed.replace(/^[-*•]\s*/, "");
          return (
            <div key={pIdx} className="flex gap-2.5 items-start pl-1">
              <span
                className={`font-semibold shrink-0 text-[13px] text-[#3C3C43] mt-0.5 select-none ${bulletClass}`}
              >
                ✦
              </span>
              <span className={`flex-1 font-semibold ${bulletTextClass}`}>
                {parseInlineBold(cleanLine, isDarkMode)}
              </span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p
            key={pIdx}
            className={`text-[12px] font-semibold leading-relaxed tracking-wide ${textClass}`}
          >
            {parseInlineBold(trimmed, isDarkMode)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Inline parsing for bold markdown tag: **text**
 */
function parseInlineBold(text: string, isDarkMode: boolean): React.ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g);

  const boldStyle = isDarkMode
    ? "text-[#FF9500] dark:text-[#FF9F0A] bg-[#FF9500]/10 dark:bg-[#FF9F0A]/10 border-[#FF9500]/20 dark:border-[#FF9F0A]/20"
    : "text-[#007AFF] dark:text-[#0A84FF] bg-[#007AFF]/10 border-black/5 dark:border-white/10";

  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <strong
              key={index}
              className={`font-semibold px-1.5 py-0.5 rounded-md border inline-block my-0.2 relative ${boldStyle}`}
            >
              {part}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}
