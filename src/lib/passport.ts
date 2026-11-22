// Coffee passport: "been here" and "want to try", stored only in this browser
// (localStorage), keyed by cafe slug. No accounts, no server state.

export const PASSPORT_STORAGE_KEY = "coffee-club:passport:v1";

export interface PassportData {
  version: 1;
  /** slug -> ISO date stamped */
  visited: Record<string, string>;
  /** slug -> ISO date saved */
  wantToTry: Record<string, string>;
}

export const EMPTY_PASSPORT: PassportData = Object.freeze({ version: 1, visited: {}, wantToTry: {} }) as PassportData;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function cleanMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [slug, date] of Object.entries(value as Record<string, unknown>)) {
    if (SLUG.test(slug) && typeof date === "string" && !Number.isNaN(Date.parse(date))) out[slug] = date;
  }
  return out;
}

/** Parses stored or imported JSON. Unknown fields and malformed entries are dropped. */
export function parsePassport(raw: unknown): PassportData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return null;
  return { version: 1, visited: cleanMap(obj.visited), wantToTry: cleanMap(obj.wantToTry) };
}

// ---------------------------------------------------------------------------
// External store (for useSyncExternalStore)
// ---------------------------------------------------------------------------

let cache: PassportData | null = null;
const listeners = new Set<() => void>();
/** Set when localStorage throws (private mode, blocked storage): we keep working in memory. */
let storageUnavailable = false;

function readStorage(): PassportData {
  try {
    const raw = window.localStorage.getItem(PASSPORT_STORAGE_KEY);
    return (raw && parsePassport(JSON.parse(raw))) || EMPTY_PASSPORT;
  } catch {
    storageUnavailable = true;
    return EMPTY_PASSPORT;
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getPassportSnapshot(): PassportData {
  if (cache === null) cache = readStorage();
  return cache;
}

export function getPassportServerSnapshot(): PassportData {
  return EMPTY_PASSPORT;
}

export function subscribePassport(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PASSPORT_STORAGE_KEY || e.key === null) {
      cache = readStorage();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function writePassport(next: PassportData): void {
  cache = next;
  try {
    window.localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    storageUnavailable = true;
  }
  emit();
}

export function isPassportStorageUnavailable(): boolean {
  return storageUnavailable;
}

export function toggleEntry(list: "visited" | "wantToTry", slug: string): void {
  const current = getPassportSnapshot();
  const map = { ...current[list] };
  if (map[slug]) delete map[slug];
  else map[slug] = new Date().toISOString();
  const next: PassportData = { ...current, [list]: map };
  // Stamping a cafe takes it off the "want to try" list.
  if (list === "visited" && map[slug] && next.wantToTry[slug]) {
    const want = { ...next.wantToTry };
    delete want[slug];
    next.wantToTry = want;
  }
  writePassport(next);
}

/** Merges an imported passport into the current one (union; earliest date wins). */
export function mergePassport(current: PassportData, incoming: PassportData, knownSlugs: ReadonlySet<string>): PassportData {
  const merge = (a: Record<string, string>, b: Record<string, string>) => {
    const out = { ...a };
    for (const [slug, date] of Object.entries(b)) {
      if (!knownSlugs.has(slug)) continue;
      out[slug] = out[slug] && out[slug] < date ? out[slug] : date;
    }
    return out;
  };
  const visited = merge(current.visited, incoming.visited);
  const wantToTry = merge(current.wantToTry, incoming.wantToTry);
  for (const slug of Object.keys(visited)) delete wantToTry[slug];
  return { version: 1, visited, wantToTry };
}
