import { Lightbulb, Sparkles } from "lucide-react";
import PlanHistoryState from "../components/PlanHistoryState";
import type { AppALanguage } from "../types";
import { formatHistoryDate, getVisionItems } from "./planHistory";
import { useAppAPlanHistory } from "./useAppAPlanHistory";

const COPY = {
  en: { eyebrow: "Long-term direction", title: "Vision", intro: "Ideas worth keeping, separated from what needs your attention today.", empty: "Long-term ideas from your daily plans will appear here.", captured: "Captured" },
  sr: { eyebrow: "Dugoročni pravac", title: "Vizija", intro: "Ideje koje vredi sačuvati, odvojene od onoga što traži pažnju danas.", empty: "Dugoročne ideje iz dnevnih planova pojaviće se ovde.", captured: "Zabeleženo" },
  tr: { eyebrow: "Uzun vadeli yön", title: "Vizyon", intro: "Saklanmaya değer fikirler, bugün dikkatinizi isteyenlerden ayrı tutulur.", empty: "Günlük planlarınızdaki uzun vadeli fikirler burada görünür.", captured: "Kaydedildi" },
} as const;

export default function VisionScreen({ language }: { language: AppALanguage }) {
  const history = useAppAPlanHistory();
  const t = COPY[language];
  if (!history.authReady || history.loading) return <PlanHistoryState language={language} state="loading" />;
  if (history.error) return <PlanHistoryState language={language} state="error" onSignIn={history.user ? history.retry : () => void history.signIn()} />;
  if (!history.user) return <PlanHistoryState language={language} state="sign_in" onSignIn={() => void history.signIn()} />;
  const entries = getVisionItems(history.plans);
  return <div className="mx-auto w-full max-w-[760px] px-5 pb-8 sm:px-6">
    <header className="mb-7"><p className="app-a-eyebrow">{t.eyebrow}</p><h1 className="app-a-page-title">{t.title}</h1><p className="app-a-page-intro">{t.intro}</p></header>
    {entries.length === 0 ? <div className="app-a-surface flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center"><Lightbulb className="h-6 w-6 text-[#AF52DE]" aria-hidden="true" /><p className="max-w-sm text-[15px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.empty}</p></div> : <div className="grid gap-3 sm:grid-cols-2">{entries.map(({ key, localDate, item }) => <article key={key} className="app-a-surface p-5"><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#AF52DE]/10 text-[#AF52DE]"><Sparkles className="h-5 w-5" aria-hidden="true" /></span><h2 className="text-[17px] font-semibold leading-snug text-black dark:text-white">{item.suggestedAction || item.originalText}</h2>{item.goalRelationship?.relationshipExplanation ? <p className="mt-2 text-[14px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">{item.goalRelationship.relationshipExplanation}</p> : null}<p className="mt-4 text-[12px] font-medium text-[#8E8E93]">{t.captured} {formatHistoryDate(localDate, language)}</p></article>)}</div>}
  </div>;
}
