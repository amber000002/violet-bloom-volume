/**
 * Recent files store — IndexedDB-backed history of files the user has uploaded
 * to specific dropzones (campaign CSV, journey CSV, postmaster CSV, creative
 * screenshot). Lets the user re-pick a previously used file from a dropdown
 * without re-opening the OS file dialog.
 *
 * Files are stored as Blobs with their original name + type so the consuming
 * upload handler receives a real `File` instance — identical to a fresh pick.
 *
 * Storage is per-browser (no sync). Per-category cap defaults to 8 entries.
 */
export type RecentFileCategory =
  | "campaign-csv"
  | "journey-csv"
  | "postmaster-csv"
  | "creative-image";

export interface RecentFileEntry {
  id: string;
  category: RecentFileCategory;
  name: string;
  type: string;
  size: number;
  addedAt: number; // epoch ms
  blob: Blob;
}

const DB_NAME = "inbox-alchemy-recent-files";
const DB_VERSION = 1;
const STORE = "files";
const MAX_PER_CATEGORY = 8;
export const RECENT_FILES_CHANGED_EVENT = "inbox-alchemy:recent-files-changed";

let persistenceRequested = false;

async function requestPersistentStorage(): Promise<void> {
  if (persistenceRequested || typeof navigator === "undefined") return;
  persistenceRequested = true;

  try {
    await navigator.storage?.persist?.();
  } catch (err) {
    // IndexedDB still works when persistence is unavailable; the browser may
    // simply retain the right to evict it under storage pressure.
    console.warn("[recentFilesStore] persistent storage request failed", err);
  }
}

function notifyRecentFilesChanged(category: RecentFileCategory): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RECENT_FILES_CHANGED_EVENT, { detail: { category } }));
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("category_addedAt", ["category", "addedAt"]);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  return new Promise((resolve, reject) => {
    openDB()
      .then((db) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);

        let settled = false;
        let result: T;
        let ran = false;

        // Attach lifecycle handlers BEFORE running any request, otherwise a
        // fast-completing transaction can fire `complete` before we listen and
        // the promise never settles (this made the Recent dropdown look empty).
        t.oncomplete = () => {
          if (settled) return;
          if (ran) {
            settled = true;
            resolve(result);
          }
        };
        t.onerror = () => {
          if (settled) return;
          settled = true;
          reject(t.error);
        };
        t.onabort = () => {
          if (settled) return;
          settled = true;
          reject(t.error);
        };

        Promise.resolve(run(store))
          .then((r) => {
            result = r;
            ran = true;
            // Read-only work is done as soon as the requests resolve.
            if (mode === "readonly" && !settled) {
              settled = true;
              resolve(result);
            }
          })
          .catch((err) => {
            if (settled) return;
            settled = true;
            reject(err);
          });
      })
      .catch(reject);
  });
}


function reqAsPromise<T = unknown>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listRecentFiles(category: RecentFileCategory): Promise<RecentFileEntry[]> {
  try {
    return await tx("readonly", async (store) => {
      const all = (await reqAsPromise(store.getAll())) as RecentFileEntry[];
      return all
        .filter((e) => e.category === category)
        .sort((a, b) => b.addedAt - a.addedAt);
    });
  } catch (err) {
    console.warn("[recentFilesStore] list failed", err);
    return [];
  }
}

export async function addRecentFile(category: RecentFileCategory, file: File): Promise<void> {
  try {
    await requestPersistentStorage();
    // Read first in its own transaction so the write transaction only performs
    // synchronous requests (an awaited read can deactivate a live transaction).
    const all = await tx("readonly", (store) => reqAsPromise(store.getAll()) as Promise<RecentFileEntry[]>);
    const sameCat = (all || []).filter((e) => e.category === category);
    const dupes = sameCat.filter((e) => e.name === file.name && e.size === file.size);

    const blob = new Blob([await file.arrayBuffer()], { type: file.type || "application/octet-stream" });
    const entry: RecentFileEntry = {
      id: `${category}__${Date.now()}__${Math.random().toString(36).slice(2, 8)}`,
      category,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      addedAt: Date.now(),
      blob,
    };

    const overflow = sameCat
      .filter((e) => !dupes.some((d) => d.id === e.id))
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(MAX_PER_CATEGORY - 1);

    await tx("readwrite", (store) => {
      for (const d of dupes) store.delete(d.id);
      store.put(entry);
      for (const o of overflow) store.delete(o.id);
    });
    notifyRecentFilesChanged(category);
  } catch (err) {
    console.warn("[recentFilesStore] add failed", err);
  }
}


export async function deleteRecentFile(id: string): Promise<void> {
  try {
    const entries = await tx("readonly", (store) => reqAsPromise(store.get(id)) as Promise<RecentFileEntry | undefined>);
    await tx("readwrite", (store) => {
      store.delete(id);
    });
    if (entries?.category) notifyRecentFilesChanged(entries.category);
  } catch (err) {
    console.warn("[recentFilesStore] delete failed", err);
  }
}

/** Reconstruct a File object from a stored entry so handlers receive a real File. */
export function entryToFile(entry: RecentFileEntry): File {
  return new File([entry.blob], entry.name, { type: entry.type, lastModified: entry.addedAt });
}

export function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
