import React, { Component, ErrorInfo, lazy, ReactNode, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./lib/safeStorageSetup";
import "./index.css";

const LegacyApp = lazy(() => import("./App.tsx"));
const AppA = lazy(() => import("./app-a/AppA.tsx"));

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
      return (
        <div style={{ padding: 20, color: "red", backgroundColor: "white", zIndex: 9999, position: "fixed", inset: 0, overflow: "auto" }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: "pre-wrap" }}>
            <summary>Error Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const params = new URLSearchParams(window.location.search);
const renderAppA = params.get("app") === "a";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center">Loading…</div>}>
        {renderAppA ? <AppA /> : <LegacyApp />}
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
