"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getStore, type Store } from "@/lib/store";
import { DEFAULT_SETTINGS, type Settings, type Who } from "@/lib/types";

interface AppState {
  store: Store | null;
  settings: Settings;
  ready: boolean;
  setActiveWho: (who: Who) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Bumped after data changes (like a backup restore) so screens re-read. */
  dataVersion: number;
  dataChanged: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const s = getStore();
    setStore(s);
    s.getSettings()
      .then(setSettings)
      .finally(() => setReady(true));
  }, [dataVersion]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (!store) return;
      setSettings(await store.updateSettings(patch));
    },
    [store],
  );

  const setActiveWho = useCallback(
    (who: Who) => updateSettings({ activeWho: who }),
    [updateSettings],
  );

  const dataChanged = useCallback(() => setDataVersion((v) => v + 1), []);

  return (
    <Ctx.Provider
      value={{
        store,
        settings,
        ready,
        setActiveWho,
        updateSettings,
        dataVersion,
        dataChanged,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
