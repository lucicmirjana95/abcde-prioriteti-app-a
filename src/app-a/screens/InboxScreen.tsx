import { CalendarClock, Clock3, Inbox } from "lucide-react";
import PlanHistoryState from "../components/PlanHistoryState";
import type { AppALanguage } from "../types";
import { formatHistoryDate, getInboxItems } from "./planHistory";
import { useAppAPlanHistory } from "./useAppAPlanHistory";

const COPY = {
  en: { eyebrow: "From your plans", title: "Inbox", intro: "Things that are not for today stay here, without competing for your attention.", empty: "Nothing is waiting here yet.", waiting: "Waiting for", week: "This week", later: "Later", saved: "Saved", minutes: "min" },
  sr: { eyebrow: "Iz vaših planova", title: "Inboks", intro: "Ono što nije za danas ostaje ovde, bez borbe za vašu pažnju.", empty: "Ovde još ništa ne čeka.", waiting: "Čekam", week: "Ove nedelje", later: "Kasnije", saved: "Sačuvano", minutes: "min" },
  tr: { eyebrow: "Planlarınızdan", title: "Gelen kutusu", intro: "Bugün için olmayanlar, dikkatinizi dağıtmadan burada kalır.", empty: "Burada henüz bekleyen bir şey yok.", waiting: "Bekleniyor", week: "Bu hafta", later: "Daha sonra", saved: "Kaydedildi", minutes: "dk" },
} as const;

export default function InboxScreen({ language }: { language: AppALanguage }) {
  const history = useAppAPlanHistory();
  const t = COPY[language];
  if (!history.authReady || history.loading) return <PlanHistoryState language={language} state="loading" />;
  if (history.error) return <PlanHistoryState language={language} state="error" onSignIn={history.user ? history.retry : () => void history.signIn()} />;
  if (!history.user) return <PlanHistoryState language={language} state="sign_in" onSignIn={() => void history.signIn()} />;

  const entries = getInboxItems(history.plans);
  const groups = [
    { label: t.waiting, items: entries.filter(({ item }) => item.kind === "waiting_for") },
    { label: t.week, items: entries.filter(({ item }) => item.kind !== "waiting_for" && item.timeHorizon === "this_week") },
    { label: t.later, items: entries.filter(({ item }) => item.kind !== "waiting_for" && item.timeHorizon !== "this_week") },
  ].filter((group) => group.items.length > 0);

  return <div className="mx-auto w-full max-w-[760px] px-5 pb-8 sm:px-6">
    <header className="mb-7"><p className="app-a-eyebrow">{t.eyebrow}</p><h1 className="app-a-page-title">{t.title}</h1><p className="app-a-page-intro">{t.intro}</p></header>
    {groups.length === 0 ? <div className="app-a-surface flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center"><Inbox className="h-6 w-6 text-[#0071E3] dark:text-[#0A84FF]" aria-hidden="true" /><p className="text-[15px] text-[#6E6E73] dark:text-[#AEAEB2]">{t.empty}</p></div> :
      <div className="space-y-7">{groups.map((group, groupIndex) => <section key={group.label} aria-labelledby={`inbox-group-${groupIndex}`}><h2 id={`inbox-group-${groupIndex}`} className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#AEAEB2]">{group.label}</h2><div className="app-a-surface divide-y divide-black/5 overflow-hidden dark:divide-white/10">{group.items.map(({ key, localDate, item }) => <article key={key} className="px-4 py-4 sm:px-5"><h3 className="text-[16px] font-semibold leading-snug text-black dark:text-white">{item.suggestedAction || item.originalText}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#6E6E73] dark:text-[#AEAEB2]"><span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />{t.saved} {formatHistoryDate(localDate, language)}</span>{item.estimatedMinutes ? <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{item.estimatedMinutes} {t.minutes}</span> : null}{item.deadlineText ? <span>{item.deadlineText}</span> : null}</div></article>)}</div></section>)}</div>}
  </div>;
}
