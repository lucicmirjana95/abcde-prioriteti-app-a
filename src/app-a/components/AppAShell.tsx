import { ReactNode, useEffect, useState } from "react";
import { AppADestination, AppALanguage, APP_A_TRANSLATIONS, type AppATheme } from "../types";
import { Sun, Inbox, Eye, TrendingUp, Sparkles, Settings } from "lucide-react";

interface Props {
  currentDestination: AppADestination;
  onNavigate: (dest: AppADestination) => void;
  language: AppALanguage;
  children: ReactNode;
  theme: AppATheme;
}

export default function AppAShell({ currentDestination, onNavigate, language, theme, children }: Props) {
  const t = APP_A_TRANSLATIONS[language];
  const [systemDark, setSystemDark] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const isDark = theme === "dark" || (theme === "system" && systemDark);

  const navItems = [
    { id: "today" as const, label: t.today, icon: Sun },
    { id: "inbox" as const, label: t.inbox, icon: Inbox },
    { id: "vision" as const, label: t.vision, icon: Eye },
    { id: "progress" as const, label: t.progress, icon: TrendingUp },
    { id: "settings" as const, label: language === "sr" ? "Podešavanja" : language === "tr" ? "Ayarlar" : "Settings", icon: Settings },
  ];

  return (
    <div className={`app-a-root flex min-h-[100dvh] flex-col md:flex-row ${isDark ? "dark" : "light"}`} style={{ colorScheme: isDark ? "dark" : "light" }}>
      {/* Mobile Top Bar */}
      <header
        className="sticky top-0 z-40 flex h-[calc(52px+env(safe-area-inset-top,0px))] items-end border-b px-5 pb-3 backdrop-blur-xl md:hidden"
        style={{
          backgroundColor: "var(--app-a-surface)",
          borderColor: "var(--app-a-border)",
          color: "var(--app-a-text)",
        }}
      >
        <h1 className="flex-1 text-[17px] font-semibold tracking-[-0.01em]">
          {navItems.find((n) => n.id === currentDestination)?.label}
        </h1>
        <button type="button" onClick={() => onNavigate("settings")} aria-label={language === "sr" ? "Podešavanja" : language === "tr" ? "Ayarlar" : "Settings"} className="app-a-focus-ring rounded-lg p-1"><Settings className="h-5 w-5" /></button>
      </header>

      {/* Desktop/Tablet Sidebar */}
      <nav
        className="sticky top-0 hidden h-[100dvh] w-[224px] shrink-0 flex-col border-r p-4 backdrop-blur-xl md:flex lg:w-[252px]"
        style={{
          backgroundColor: "var(--app-a-sidebar)",
          borderColor: "var(--app-a-border)",
          color: "var(--app-a-text)",
        }}
      >
        <div className="mb-8 flex items-center gap-3 px-3 pt-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-[11px] text-white shadow-sm"
            style={{ backgroundColor: "var(--app-a-accent)" }}
          >
            <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">{t.dailyResetTitle}</div>
            <div className="text-[12px]" style={{ color: "var(--app-a-text-tertiary)" }}>App A</div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = currentDestination === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={isCurrent ? "page" : undefined}
                className="app-a-focus-ring flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors"
                style={{
                  backgroundColor: isCurrent ? "var(--app-a-accent-soft)" : "transparent",
                  color: isCurrent ? "var(--app-a-accent)" : "var(--app-a-text-secondary)",
                  fontWeight: isCurrent ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.backgroundColor = "var(--app-a-disabled-bg)";
                    e.currentTarget.style.color = "var(--app-a-text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--app-a-text-secondary)";
                  }
                }}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
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
        className="fixed bottom-0 left-0 right-0 z-50 border-t pb-[env(safe-area-inset-bottom,10px)] pt-1.5 backdrop-blur-2xl md:hidden"
        style={{
          backgroundColor: "var(--app-a-surface)",
          borderColor: "var(--app-a-border)",
        }}
      >
        <div className="flex h-[54px] items-center justify-around px-2">
          {navItems.filter((item) => item.id !== "settings").map((item) => {
            const Icon = item.icon;
            const isCurrent = currentDestination === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={isCurrent ? "page" : undefined}
                className="app-a-focus-ring flex h-[48px] min-w-[44px] w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors"
                style={{
                  color: isCurrent ? "var(--app-a-accent)" : "var(--app-a-text-secondary)",
                }}
              >
                <Icon className="w-6 h-6 shrink-0" strokeWidth={isCurrent ? 2.5 : 2} />
                <span
                  className="text-[12px] leading-none"
                  style={{ fontWeight: isCurrent ? 600 : 500 }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
