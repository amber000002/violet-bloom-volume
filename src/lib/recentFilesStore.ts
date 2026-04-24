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
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const result = await run(store);
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    } catch (err) {
      reject(err);
    }
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
    await tx("readwrite", async (store) => {
      const all = (await reqAsPromise(store.getAll())) as RecentFileEntry[];
      const sameCat = all.filter((e) => e.category === category);

      // De-dupe by (name + size) — replace any older entry with same identity.
      const dupes = sameCat.filter((e) => e.name === file.name && e.size === file.size);
      for (const d of dupes) store.delete(d.id);

      const entry: RecentFileEntry = {
        id: `${category}__${Date.now()}__${Math.random().toString(36).slice(2, 8)}`,
        category,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        addedAt: Date.now(),
        blob: file.slice(0, file.size, file.type), // store as Blob copy
      };
      store.put(entry);

      // Trim to MAX_PER_CATEGORY
      const remaining = sameCat
        .filter((e) => !dupes.some((d) => d.id === e.id))
        .sort((a, b) => b.addedAt - a.addedAt);
      const overflow = remaining.slice(MAX_PER_CATEGORY - 1); // -1 because we just added one
      for (const o of overflow) store.delete(o.id);
    });
  } catch (err) {
    console.warn("[recentFilesStore] add failed", err);
  }
}

export async function deleteRecentFile(id: string): Promise<void> {
  try {
    await tx("readwrite", (store) => {
      store.delete(id);
    });
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
