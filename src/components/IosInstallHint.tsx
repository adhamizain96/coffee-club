"use client";

import { useSyncExternalStore } from "react";

const DISMISS_KEY = "coffee-club:ios-install-dismissed";

/**
 * iOS Safari has no `beforeinstallprompt` event and no install button —
 * the only path to install is Share → Add to Home Screen. This banner
 * surfaces that for the small slice of users who'd want it.
 *
 * Visibility rules (all must hold):
 *  - userAgent looks like iPhone / iPad / iPod
 *  - app is NOT already running in standalone
 *  - user has not previously dismissed (localStorage flag)
 *
 * Implementation note: the banner reads mutable browser state (userAgent,
 * matchMedia, localStorage) that doesn't exist server-side. `useSyncExternalStore`
 * is React's blessed primitive for that — `getServerSnapshot` returns false so
 * the SSR/hydration pass renders nothing and matches; the post-hydration render
 * then switches to `getSnapshot` and shows the banner if eligible. No
 * setState-in-effect, no hydration mismatch.
 */

const subscribers = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

function notify(): void {
  for (const cb of subscribers) cb();
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  if (!/iPhone|iPad|iPod/.test(ua)) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return false;
  return window.localStorage.getItem(DISMISS_KEY) !== "1";
}

function getServerSnapshot(): boolean {
  return false;
}

export function IosInstallHint() {
  const show = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage unavailable in some private modes — degrade silently
    }
    notify();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto bg-white border border-amber-200/60 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <span className="text-xl shrink-0" aria-hidden="true">☕</span>
        <p className="text-xs text-stone-600 flex-1 leading-snug">
          Install Coffee Club: tap{" "}
          <span aria-hidden="true">⬆️</span>{" "}
          <span className="font-semibold text-stone-900">Share</span>, then{" "}
          <span className="font-semibold text-stone-900">Add to Home Screen</span>.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install hint"
          className="text-stone-400 hover:text-stone-700 text-base leading-none px-1 shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
