"use client";

import { useEffect, useState } from "react";

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
 */
export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);
    if (!isIos) return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    setShow(true);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage unavailable in some private modes — degrade silently
    }
    setShow(false);
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
