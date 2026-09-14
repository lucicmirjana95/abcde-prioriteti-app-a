import { useEffect, useState } from 'react';

// Mounted-but-hidden screens preserve drafts; committed data still refreshes.
export function useDataRefresh() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setVersion(value => value + 1);
    const events = ['app-a-navigation', 'app-a-plan-changed', 'app-a-inbox-changed', 'app-a-data-reset'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, []);
  return version;
}
