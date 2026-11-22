import { useSyncExternalStore } from "react";
import {
  getPassportServerSnapshot,
  getPassportSnapshot,
  subscribePassport,
  toggleEntry,
  type PassportData,
} from "@/lib/passport";

/** Browser-local passport. Empty during SSR/hydration, then reflects localStorage (synced across tabs). */
export function usePassport(): {
  passport: PassportData;
  toggleVisited: (slug: string) => void;
  toggleWantToTry: (slug: string) => void;
} {
  const passport = useSyncExternalStore(subscribePassport, getPassportSnapshot, getPassportServerSnapshot);
  return {
    passport,
    toggleVisited: (slug) => toggleEntry("visited", slug),
    toggleWantToTry: (slug) => toggleEntry("wantToTry", slug),
  };
}
