import { ReactNode, useEffect, useState } from "react";
import { AppADestination, AppALanguage, APP_A_TRANSLATIONS, type AppATheme, type AppAReducedMotion } from "../types";
import { Home, FileText, Sprout, BarChart3, Settings } from "lucide-react";
import AccountStatus from "./AccountStatus";

interface Props {
  currentDestination: AppADestination;
  onNavigate: (dest: AppADestination) => void;
  language: AppALanguage;
  children?: ReactNode;
  theme: AppATheme;
  reducedMotion?: AppAReducedMotion;
}

export default function AppAShell({ currentDestination, onNavigate, language, theme, reducedMotion = "system", children }: Props) {
  const t = APP_A_TRANSLATIONS[language];
  const [systemDark, setSystemDark] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemDark);
  const isReducedMotion = reducedMotion === "reduced" || (reducedMotion !== "standard" && systemReducedMotion);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, [isDark]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("reduce-motion", isReducedMotion);
    }
  }, [isReducedMotion]);

  const navItems = [
    { id: "today" as const, label: t.today, icon: Home },
    { id: "inbox" as const, label: t.inbox, icon: FileText },
    { id: "vision" as const, label: t.vision, icon: Sprout },
    { id: "progress" as const, label: t.progress, icon: BarChart3 },
    { id: "settings" as const, label: language === "sr" ? "Podešavanja" : language === "tr" ? "Ayarlar" : "Settings", icon: Settings },
  ];

  return (
    <div className={`app-a-root flex min-h-[100dvh] flex-col md:flex-row ${isDark ? "dark" : "light"}`} style={{ colorScheme: isDark ? "dark" : "light" }}>
      {/* Mobile Top Bar (Apple HIG UINavigationBar) */}
      <header
        className="app-a-header-bar sticky top-0 z-40 flex h-[54px] box-content pt-[env(safe-area-inset-top,0px)] items-center justify-between px-4 sm:px-5 select-none md:hidden"
        style={{ color: "var(--app-a-text)" }}
      >
        <h1 className="text-[17px] font-semibold tracking-[-0.4px] truncate flex-1">
          {navItems.find((n) => n.id === currentDestination)?.label}
        </h1>
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex h-11 items-center justify-center">
            <AccountStatus language={language} compact />
          </div>
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            aria-label={language === "sr" ? "Podešavanja" : language === "tr" ? "Ayarlar" : "Settings"}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[inherit] active:opacity-50 transition-opacity"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Desktop/Tablet Sidebar */}
      <nav
        className="sticky top-0 hidden h-[100dvh] w-[260px] shrink-0 flex-col border-r p-5 backdrop-blur-xl md:flex lg:w-[300px]"
        style={{
          backgroundColor: "var(--app-a-sidebar)",
          borderColor: "var(--app-a-border)",
          color: "var(--app-a-text)",
        }}
      >
        {/* App logo / identity */}
        <div className="mb-8 flex items-center gap-3 px-2 pt-1">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-[13px] shadow-md shrink-0 overflow-hidden"
            style={{ backgroundColor: "var(--app-a-accent)" }}
          >
            <img
              src="/app-a/growth-path-medallion-sun.png"
              alt="Daily Reset"
              className="h-full w-full object-cover select-none pointer-events-none"
            />
          </span>
          <div>
            <div className="text-[16px] font-bold tracking-[-0.02em] leading-tight">Daily Reset</div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--app-a-text-tertiary)" }}>Studio</div>
          </div>
        </div>

        {/* Nav section */}
        <div className="mb-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.10em]" style={{ color: "var(--app-a-text-tertiary)" }}>
            Navigacija
          </span>
        </div>
        <div className="flex flex-col gap-0.5 mb-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = currentDestination === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={isCurrent ? "page" : undefined}
                className="app-a-focus-ring flex min-h-[50px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors relative overflow-hidden"
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
                {/* Active accent bar */}
                {isCurrent && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                    style={{ backgroundColor: "var(--app-a-accent)" }}
                    aria-hidden="true"
                  />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="text-[15px]">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom account */}
        <div className="pt-4 border-t" style={{ borderColor: "var(--app-a-border)" }}>
          <AccountStatus language={language} />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col pb-[calc(54px+env(safe-area-inset-bottom,0px)+24px)] md:pb-0">
        <div className="mx-auto w-full max-w-[880px] py-6 sm:py-8 md:px-8 lg:py-8 lg:max-w-[1240px] xl:max-w-[1360px] lg:px-10">
          {children}
        </div>
      </main>


      {/* Mobile Bottom Navigation Bar (Apple HIG UITabBar) */}
      <nav
        aria-label={`${t.today}, ${t.inbox}, ${t.vision}, ${t.progress}`}
        className="app-a-tabbar fixed bottom-0 left-0 right-0 z-30 select-none pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        <div className="flex h-[52px] items-stretch justify-around px-1">
          {navItems.filter((item) => item.id !== "settings").map((item) => {
            const Icon = item.icon;
            const isCurrent = currentDestination === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isCurrent ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-end gap-[2px] pt-1.5 pb-1 transition-opacity active:opacity-50"
                style={{
                  color: isCurrent ? "var(--app-a-accent)" : "var(--app-a-tab-inactive)",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Icon
                  className="h-[22px] w-[22px] shrink-0"
                  strokeWidth={isCurrent ? 2.3 : 1.8}
                />
                <span
                  className="max-w-full truncate px-0.5 text-[10px] tracking-[-0.1px]"
                  style={{
                    fontWeight: isCurrent ? 600 : 500,
                  }}
                >
                  {item.label}
                </span>
                {isCurrent ? (
                  <span
                    className="h-1 w-1 rounded-full mt-[1px]"
                    style={{ backgroundColor: "var(--app-a-accent)" }}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="h-1 w-1 mt-[1px] opacity-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
