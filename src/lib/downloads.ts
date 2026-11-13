import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Real offline downloads.
 * - Native: file saved with expo-file-system into the app document directory.
 * - Web: bytes streamed into IndexedDB, replayed with a blob: URL.
 * Downloads use the title's progressive MP4 rendition (HLS segments are not a
 * single downloadable file); see README for production notes.
 */
const isWeb = Platform.OS === 'web';
const DIR = `${FileSystem.documentDirectory ?? ''}kidflix/`;
const DB_NAME = 'kidflix-offline';
const STORE = 'videos';

type ProgressCb = (progress: number, bytes?: number) => void;

function filePath(key: string) {
  return `${DIR}${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
}

/* ───────────────────────────── IndexedDB (web) ───────────────────────────── */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: { blob: Blob; size: number; titleId: string }): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string): Promise<{ blob: Blob; size: number } | null> {
  const db = await openDb();
  const value = await new Promise<{ blob: Blob; size: number } | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as { blob: Blob; size: number } | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

const blobUrls = new Map<string, string>();

/* ───────────────────────────────── native ────────────────────────────────── */

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

/* ────────────────────────────────── API ──────────────────────────────────── */

export async function downloadVideo(
  key: string,
  url: string,
  titleId: string,
  onProgress: ProgressCb
): Promise<{ localUri: string; sizeBytes: number }> {
  if (isWeb) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const total = Number(response.headers.get('content-length') ?? 0);
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    if (reader) {
      // Stream so we can show real progress on web.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          onProgress(total ? received / total : Math.min(0.95, received / (12 * 1024 * 1024)), received);
        }
      }
    } else {
      const buffer = await response.arrayBuffer();
      chunks.push(new Uint8Array(buffer));
      received = buffer.byteLength;
    }

    const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
    await idbPut(key, { blob, size: blob.size, titleId });
    onProgress(1, blob.size);
    return { localUri: key, sizeBytes: blob.size };
  }

  await ensureDir();
  const destination = filePath(key);
  const existing = await FileSystem.getInfoAsync(destination);
  if (existing.exists) await FileSystem.deleteAsync(destination, { idempotent: true });

  const resumable = FileSystem.createDownloadResumable(url, destination, {}, (data) => {
    const p = data.totalBytesWritten / Math.max(data.totalBytesExpectedToWrite, 1);
    onProgress(Math.min(0.99, p), data.totalBytesWritten);
  });
  const result = await resumable.downloadAsync();
  if (!result?.uri) throw new Error('Download did not complete');
  onProgress(1, result.headers?.['content-length'] ? Number(result.headers['content-length']) : undefined);
  const info = (await FileSystem.getInfoAsync(result.uri)) as { exists: boolean; size?: number };
  const fromHeader = result.headers?.['content-length'] ? Number(result.headers['content-length']) : 0;
  return { localUri: result.uri, sizeBytes: fromHeader || info.size || 0 };
}

export async function offlineUri(key: string): Promise<string | null> {
  if (isWeb) {
    const cached = blobUrls.get(key);
    if (cached) return cached;
    const entry = await idbGet(key).catch(() => null);
    if (!entry) return null;
    const uri = URL.createObjectURL(entry.blob);
    blobUrls.set(key, uri);
    return uri;
  }
  const info = await FileSystem.getInfoAsync(filePath(key));
  return info.exists ? filePath(key) : null;
}

export async function removeOffline(key: string): Promise<void> {
  if (isWeb) {
    const uri = blobUrls.get(key);
    if (uri) {
      URL.revokeObjectURL(uri);
      blobUrls.delete(key);
    }
    await idbDelete(key).catch(() => undefined);
    return;
  }
  await FileSystem.deleteAsync(filePath(key), { idempotent: true });
}

export async function hasOffline(key: string): Promise<boolean> {
  if (isWeb) return Boolean(await idbGet(key).catch(() => null));
  const info = await FileSystem.getInfoAsync(filePath(key));
  return info.exists;
}

export const downloadKey = (titleId: string, episodeId: string) => `${titleId}__${episodeId}`;
