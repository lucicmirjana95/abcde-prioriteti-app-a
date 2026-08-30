import { useState, useEffect, useMemo } from "react";
import AppAShell from "./components/AppAShell";
import TodayScreen from "./screens/TodayScreen";
import InboxScreen from "./screens/InboxScreen";
import VisionScreen from "./screens/VisionScreen";
import ProgressScreen from "./screens/ProgressScreen";
import { AppADestination, AppALanguage } from "./types";
import {
  createDailyResetDemoClient,
  createDailyResetDemoInitialData,
  getDailyResetDemoConfig,
} from "./demo/dailyResetDemo";
import "./app-a.css";

function getInitialLanguage(): AppALanguage {
  try {
    const stored = localStorage.getItem("abcde_language");
    if (stored === "en" || stored === "sr" || stored === "tr") return stored;
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return "en";
}

export default function AppA() {
  const [destination, setDestination] = useState<AppADestination>("today");
  const [language, setLanguage] = useState<AppALanguage>(getInitialLanguage);
  const demoConfig = useMemo(
    () => getDailyResetDemoConfig(window.location.search),
    []
  );
  const demoClient = useMemo(
    () => demoConfig ? createDailyResetDemoClient(demoConfig.scenario) : undefined,
    [demoConfig]
  );

  // A simple hack to get language from original app if available, or default to en.
  // The original app saves to 'abcde_language'. We don't want to change the global system, 
  // but we can read it to respect the document language.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("abcde_language");
      if (stored === "en" || stored === "sr" || stored === "tr") {
        setLanguage(stored);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  let screen;
  switch (destination) {
    case "today":
      screen = (
        <TodayScreen
          language={language}
          client={demoClient}
          demoConfig={demoConfig}
          initialData={demoConfig ? createDailyResetDemoInitialData(language) : undefined}
        />
      );
      break;
    case "inbox":
      screen = <InboxScreen language={language} />;
      break;
    case "vision":
      screen = <VisionScreen language={language} />;
      break;
    case "progress":
      screen = <ProgressScreen language={language} />;
      break;
  }

  return (
    <AppAShell currentDestination={destination} onNavigate={setDestination} language={language}>
      {screen}
    </AppAShell>
  );
}
