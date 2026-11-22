import { useSyncExternalStore } from "react";

// Current time, client-only: null during SSR and hydration, then updated every
// minute and whenever the tab becomes visible again. Open/closed UI reads this
// so a cached or slow render never shows a stale status.

const subscribe = (onChange: () => void) => {
  const id = window.setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onChange);
  };
};
const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

export function useClientNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  return minute === null ? null : new Date(minute * 60_000);
}
