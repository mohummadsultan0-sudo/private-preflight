/** Audit Ledger style: session restoration is a local browser vault, never a network, account, analytics, or server data path. */
import { CleanCopyFormat, ImageInspection } from "@/lib/image";

const DATABASE_NAME = "private-preflight-batch-session-vault";
const DATABASE_VERSION = 1;
const STORE_NAME = "queues";
const SESSION_ID_KEY = "private-preflight:batch-vault-session-id";

export type SessionBatchItem = {
  id: string;
  file: File;
  status: "ready" | "rejected";
  inspection?: ImageInspection;
  error?: string;
  outputFormat?: CleanCopyFormat;
  jpegQuality?: number;
  resizeMaxLongEdge?: number | null;
  bundleStage?: "queued" | "complete" | "failed";
  bundleError?: string;
};

type VaultRecord = { sessionId: string; updatedAt: number; items: SessionBatchItem[] };

function currentSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_ID_KEY, created);
  return created;
}

function openVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("The browser could not open the local session vault."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "sessionId" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionResult<T>(database: IDBDatabase, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onerror = () => reject(request.error ?? new Error("The browser could not update the local session vault."));
    request.onsuccess = () => resolve(request.result);
  }).finally(() => database.close());
}

export async function restoreSessionBatchQueue() {
  const database = await openVault();
  const record = await transactionResult<VaultRecord | undefined>(database, "readonly", (store) => store.get(currentSessionId()));
  return record?.items ?? [];
}

export async function saveSessionBatchQueue(items: SessionBatchItem[]) {
  const database = await openVault();
  const record: VaultRecord = { sessionId: currentSessionId(), updatedAt: Date.now(), items };
  await transactionResult<IDBValidKey>(database, "readwrite", (store) => store.put(record));
}

export async function clearSessionBatchQueue() {
  const database = await openVault();
  await transactionResult<undefined>(database, "readwrite", (store) => store.delete(currentSessionId()));
}
