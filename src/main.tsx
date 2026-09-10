import React, { Component, ErrorInfo, lazy, ReactNode, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./lib/safeStorageSetup";
import "./index.css";

const LegacyApp = lazy(() => import("./App.tsx"));
const AppA = lazy(() => import("./app-a/AppA.tsx"));
const SHOW_ERROR_DETAILS = import.meta.env.DEV;
const ERROR_COPY = {
  en: { title: "Something went wrong", text: "Your saved data is unchanged. Reload the app and try again.", reload: "Reload" },
  sr: { title: "Došlo je do greške", text: "Sačuvani podaci nisu promenjeni. Ponovo učitajte aplikaciju i pokušajte još jednom.", reload: "Učitaj ponovo" },
  tr: { title: "Bir hata oluştu", text: "Kaydedilmiş verileriniz değişmedi. Uygulamayı yeniden yükleyip tekrar deneyin.", reload: "Yeniden yükle" },
} as const;

function getErrorCopy() {
  try {
    const language = localStorage.getItem("abcde_language");
    return language === "sr" || language === "tr" ? ERROR_COPY[language] : ERROR_COPY.en;
  } catch {
    return ERROR_COPY.en;
  }
}

// Global Error and Unhandled Promise Rejection Interceptors to trace "Script error."
window.addEventListener("error", (event) => {
  console.warn("Global captured error event:", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
      ? {
          name: event.error.name,
          message: event.error.message,
          stack: event.error.stack,
        }
      : null,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  console.warn("Global unhandled rejection event:", {
    reason:
      event.reason instanceof Error
        ? {
            name: event.reason.name,
            message: event.reason.message,
            stack: event.reason.stack,
          }
        : String(event.reason),
  });
});

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const copy = getErrorCopy();
      return (
        <div role="alert" style={{ padding: 24, color: "#1d1d1f", backgroundColor: "#f5f5f7", zIndex: 9999, position: "fixed", inset: 0, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>{copy.title}</h2>
          <p style={{ margin: 0, maxWidth: 480, color: "#6e6e73" }}>{copy.text}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, border: 0, borderRadius: 10, padding: "0 18px", background: "#0071e3", color: "white", fontWeight: 600, cursor: "pointer" }}>{copy.reload}</button>
          {SHOW_ERROR_DETAILS ? <details style={{ marginTop: 12, maxWidth: 720, whiteSpace: "pre-wrap", textAlign: "left" }}>
            <summary>Error details</summary>
            {this.state.error?.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details> : null}
        </div>
      );
    }
    return this.props.children;
  }
}

const params = new URLSearchParams(window.location.search);
const renderLegacyApp = import.meta.env.DEV && params.get("app") === "legacy";
if (renderLegacyApp) document.title = "Kaizen Flow";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center">Loading…</div>}>
        {renderLegacyApp ? <LegacyApp /> : <AppA />}
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
