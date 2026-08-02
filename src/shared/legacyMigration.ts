import { CURRENT_LOCAL_PREFIX } from "@/src/shared/brand";

type KeyMigration = {
  current: string;
  legacy: string[];
};

const migrations: KeyMigration[] = [
  { current: `${CURRENT_LOCAL_PREFIX}:analyses`, legacy: ["BasketMotion-AiAnalyses", "masterhoop_analyses", "master-hoop-analyses"] },
  { current: `${CURRENT_LOCAL_PREFIX}:favorite-drills`, legacy: ["BasketMotion-AiFavoriteDrills", "masterhoop_favorite_drills"] },
  { current: `${CURRENT_LOCAL_PREFIX}:drill-watch-history`, legacy: ["BasketMotion-AiDrillWatchHistory", "masterhoop_drill_watch_history"] },
  { current: `${CURRENT_LOCAL_PREFIX}:install-dismissed`, legacy: ["BasketMotion-AiInstallDismissed", "masterhoop_install_dismissed"] },
];

export function migrateLegacyLocalStorage() {
  if (typeof window === "undefined") return;
  for (const migration of migrations) {
    if (localStorage.getItem(migration.current) !== null) continue;
    const legacyKey = migration.legacy.find((key) => localStorage.getItem(key) !== null);
    if (!legacyKey) continue;
    const value = localStorage.getItem(legacyKey);
    if (value !== null) localStorage.setItem(migration.current, value);
  }
  localStorage.setItem(`${CURRENT_LOCAL_PREFIX}:migration:masterhoop-to-basketmotion`, new Date().toISOString());
}

export function getLocalStorageWithLegacy(current: string, legacy: string[], fallback: string) {
  if (typeof window === "undefined") return fallback;
  const currentValue = localStorage.getItem(current);
  if (currentValue !== null) return currentValue;
  const legacyKey = legacy.find((key) => localStorage.getItem(key) !== null);
  return legacyKey ? localStorage.getItem(legacyKey) ?? fallback : fallback;
}
