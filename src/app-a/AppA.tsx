import { useState, useMemo } from "react";
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

export default function AppA() {
  const [destination, setDestination] = useState<AppADestination>("today");
  const { preferences, setPreferences } = useAppAPreferences();
  const language: AppALanguage = preferences.language;
  const demoConfig = useMemo(
    () => getDailyResetDemoConfig(window.location.search),
    []
  );
  const demoClient = useMemo(
    () => demoConfig ? createDailyResetDemoClient(demoConfig.scenario) : undefined,
    [demoConfig]
  );

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

  return (
    <AppAShell currentDestination={destination} onNavigate={setDestination} language={language} theme={preferences.theme}>
      {screen}
    </AppAShell>
  );
}
