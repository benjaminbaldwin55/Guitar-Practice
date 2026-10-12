import { IdbStore } from "./idb-store";
import type { Store } from "./store";

export type { Store } from "./store";

let instance: Store | null = null;

/** The app's single data store. Browser only. */
export function getStore(): Store {
  if (typeof window === "undefined") {
    throw new Error("getStore() is browser-only");
  }
  instance ??= new IdbStore();
  return instance;
}
