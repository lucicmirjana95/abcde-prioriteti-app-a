import { useState } from "react";
import type { SavedVisionStrategy } from "../../../shared/domain/vision";
import type { AppALanguage } from "../../types";

const COPY = {
  en: {
    text: (idea: string) => `A similar vision is archived: ${idea}. Restore and connect?`,
    restore: "Restore",
    dismiss: "Dismiss",
  },
  sr: {
    text: (idea: string) => `Slična vizija je arhivirana: ${idea}. Vrati i poveži?`,
    restore: "Vrati",
    dismiss: "Odbaci",
  },
  tr: {
    text: (idea: string) => `Benzer bir vizyon arşivlendi: ${idea}. Geri yükle ve bağla?`,
    restore: "Geri yükle",
    dismiss: "Kapat",
  },
};

export default function ArchivedVisionLink({
  archivedVision,
  onConnect,
  language,
}: {
  archivedVision: SavedVisionStrategy;
  onConnect: () => void;
  language: AppALanguage;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const t = COPY[language];

  return (
    <div role="status" className="flex flex-col gap-2 rounded-lg bg-black/5 p-3 dark:bg-white/10 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[14px] text-black dark:text-white">
        {t.text(archivedVision.idea)}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-[44px] rounded-lg px-3 text-[14px] font-medium text-[#6E6E73] hover:bg-black/5 dark:text-[#AEAEB2] dark:hover:bg-white/10"
        >
          {t.dismiss}
        </button>
        <button
          type="button"
          onClick={onConnect}
          className="min-h-[44px] rounded-lg bg-[#0071E3] px-4 text-[14px] font-medium text-white hover:bg-[#0077ED] dark:bg-[#0A84FF] dark:hover:bg-[#0071E3]"
        >
          {t.restore}
        </button>
      </div>
    </div>
  );
}
