import { useState, useMemo, useEffect, useRef } from "react";
import AppAShell from "./components/AppAShell";
import TodayScreen from "./screens/TodayScreen";
import InboxScreen from "./screens/InboxScreen";
import VisionScreen from "./screens/VisionScreen";
import ProgressScreen from "./screens/ProgressScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { AppADestination, AppALanguage } from "./types";
import {
  createDailyResetDemoClient,
  createDailyResetDemoInitialData,
  getDailyResetDemoConfig,
} from "./demo/dailyResetDemo";
import "./app-a.css";
import { useAppAPreferences } from "./settings/useAppAPreferences";
import { useAppAAuth } from "./auth/useAppAAuth";
import { clearSessionDrafts } from './persistence/sessionDraft';

export default function AppA() {
  const [destination, setDestination] = useState<AppADestination>("today");
  const [visited, setVisited] = useState<AppADestination[]>(["today"]);
  const { user, authReady } = useAppAAuth();
  const previousUser = useRef(user?.uid);
  const [accountBoundary, setAccountBoundary] = useState(0);
  useEffect(() => {
    if (!authReady) return;
    if (previousUser.current && previousUser.current !== user?.uid) {
      clearSessionDrafts();
      setAccountBoundary((value) => value + 1);
      setVisited(['today']);
      setDestination('today');
    }
    previousUser.current = user?.uid;
  }, [authReady, user?.uid]);
  useEffect(() => {
    const clearResetScopes = (event: Event) => {
      const scopes = (event as CustomEvent<{ completedScopes?: string[] }>).detail?.completedScopes;
      if (!scopes) clearSessionDrafts();
      else {
        if (scopes.includes('app_a_daily')) clearSessionDrafts(['today', 'focus']);
        if (scopes.includes('vision_shared')) clearSessionDrafts(['vision']);
      }
    };
    window.addEventListener('app-a-data-reset', clearResetScopes);
    return () => window.removeEventListener('app-a-data-reset', clearResetScopes);
  }, []);
  const { preferences, setPreferences } = useAppAPreferences();
  const language: AppALanguage = preferences.language;
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const demoConfig = useMemo(
    () => getDailyResetDemoConfig(window.location.search),
    []
  );
  const demoClient = useMemo(
    () => demoConfig ? createDailyResetDemoClient(demoConfig.scenario) : undefined,
    [demoConfig]
  );

  const renderScreen = (destination: AppADestination) => {
  let screen;
  switch (destination) {
    case "today":
      screen = (
        <TodayScreen
          language={language}
          client={demoClient}
          demoConfig={demoConfig}
          initialData={demoConfig ? createDailyResetDemoInitialData(language) : undefined}
          preferences={preferences}
          onOpenVision={() => { setDestination("vision"); setVisited((items) => items.includes("vision") ? items : [...items, "vision"]); window.dispatchEvent(new Event("app-a-navigation")); }}
        />
      );
      break;
    case "inbox":
      screen = <InboxScreen language={language} preferences={preferences} />;
      break;
    case "vision":
      screen = <VisionScreen language={language} />;
      break;
    case "progress":
      screen = <ProgressScreen language={language} />;
      break;
    case "settings":
      screen = <SettingsScreen language={language} preferences={preferences} onChange={setPreferences} />;
      break;
  }
  return screen;
  };

  return (
    <AppAShell currentDestination={destination} onNavigate={(next) => { setDestination(next); setVisited((items) => items.includes(next) ? items : [...items, next]); window.dispatchEvent(new Event('app-a-navigation')); }} language={language} theme={preferences.theme}>
      {authReady && visited.map((screen) => <div key={`${accountBoundary}:${screen}`} hidden={destination !== screen}>{renderScreen(screen)}</div>)}
    </AppAShell>
  );
}
