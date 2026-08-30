import { ReactNode } from "react";
import { AppADestination, AppALanguage, APP_A_TRANSLATIONS } from "../types";
import { Sun, Inbox, Eye, TrendingUp, Sparkles } from "lucide-react";

interface Props {
  currentDestination: AppADestination;
  onNavigate: (dest: AppADestination) => void;
  language: AppALanguage;
  children: ReactNode;
}

export default function AppAShell({ currentDestination, onNavigate, language, children }: Props) {
  const t = APP_A_TRANSLATIONS[language];

  const navItems = [
    { id: "today" as const, label: t.today, icon: Sun },
    { id: "inbox" as const, label: t.inbox, icon: Inbox },
    { id: "vision" as const, label: t.vision, icon: Eye },
    { id: "progress" as const, label: t.progress, icon: TrendingUp },
  ];

  return (
    <div className="app-a-root flex min-h-[100dvh] flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-[calc(52px+env(safe-area-inset-top,0px))] items-end border-b border-black/10 bg-white/85 px-5 pb-3 backdrop-blur-xl dark:border-white/10 dark:bg-black/80">
        <h1 className="text-[17px] font-semibold tracking-[-0.01em]">
          {navItems.find((n) => n.id === currentDestination)?.label}
        </h1>
      </header>

      {/* Desktop/Tablet Sidebar */}
      <nav className="sticky top-0 hidden h-[100dvh] w-[224px] shrink-0 flex-col border-r border-black/10 bg-white/55 p-4 backdrop-blur-xl md:flex lg:w-[252px] dark:border-white/10 dark:bg-[#111113]/90">
        <div className="mb-8 flex items-center gap-3 px-3 pt-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#0A84FF] text-white shadow-sm">
            <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">{t.dailyResetTitle}</div>
            <div className="text-[12px] text-black/45 dark:text-white/45">App A</div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={currentDestination === item.id ? "page" : undefined}
                className={`app-a-focus-ring flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${
                  currentDestination === item.id
                    ? "bg-[#0A84FF]/12 text-[#0071E3] font-semibold dark:text-[#0A84FF]"
                    : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col pb-[calc(72px+env(safe-area-inset-bottom,0px))] md:pb-0">
        <div className="mx-auto w-full max-w-[880px] py-6 sm:py-8 md:px-8 lg:py-12">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label={`${t.today}, ${t.inbox}, ${t.vision}, ${t.progress}`}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/88 pb-[env(safe-area-inset-bottom,10px)] pt-1.5 backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-[#1C1C1E]/88"
      >
        <div className="flex h-[54px] items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={currentDestination === item.id ? "page" : undefined}
                className={`app-a-focus-ring flex h-[48px] min-w-[44px] w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                  currentDestination === item.id
                    ? "text-[#007AFF]"
                    : "text-black/60 dark:text-white/60"
                }`}
              >
                <Icon className={`w-6 h-6 shrink-0`} strokeWidth={currentDestination === item.id ? 2.5 : 2} />
                <span className="text-[12px] font-medium leading-none">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  );
}
