import { InjectionToken } from '@angular/core';
import { TipTapDocument } from '../../core/content/content.models';

export interface DraftSnapshot {
  title: string;
  content: TipTapDocument;
}

export interface DraftBackup extends DraftSnapshot {
  /** When the snapshot was taken locally (ISO 8601). */
  savedAt: string;
}

/** A local copy of unsaved drafts, so a lost connection or a closed tab does not lose work (plan §8.2). */
export interface DraftBackupStore {
  get(articleId: string): Promise<DraftBackup | null>;
  put(articleId: string, backup: DraftBackup): Promise<void>;
  delete(articleId: string): Promise<void>;
}

const DB_NAME = 'mymind';
const STORE = 'draft-backups';

/** IndexedDB-backed store. Every failure (private mode, quota, no IndexedDB) degrades to "no backup". */
export class IndexedDbDraftBackupStore implements DraftBackupStore {
  private db: Promise<IDBDatabase | null> | null = null;

  async get(articleId: string): Promise<DraftBackup | null> {
    return (
      (await this.request<DraftBackup | undefined>('readonly', (s) => s.get(articleId))) ?? null
    );
  }

  async put(articleId: string, backup: DraftBackup): Promise<void> {
    await this.request('readwrite', (s) => s.put(backup, articleId));
  }

  async delete(articleId: string): Promise<void> {
    await this.request('readwrite', (s) => s.delete(articleId));
  }

  private async request<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T | undefined> {
    const db = await this.open();
    if (!db) {
      return undefined;
    }

    return new Promise<T | undefined>((resolve) => {
      try {
        const request = action(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
  }

  private open(): Promise<IDBDatabase | null> {
    this.db ??= new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.db;
  }
}

/** For tests and environments without IndexedDB. */
export class MemoryDraftBackupStore implements DraftBackupStore {
  readonly items = new Map<string, DraftBackup>();

  async get(articleId: string): Promise<DraftBackup | null> {
    return this.items.get(articleId) ?? null;
  }

  async put(articleId: string, backup: DraftBackup): Promise<void> {
    this.items.set(articleId, backup);
  }

  async delete(articleId: string): Promise<void> {
    this.items.delete(articleId);
  }
}

/** The backup store the editor uses; tests provide a {@link MemoryDraftBackupStore}. */
export const DRAFT_BACKUP = new InjectionToken<DraftBackupStore>('DRAFT_BACKUP', {
  providedIn: 'root',
  factory: () =>
    typeof indexedDB === 'undefined'
      ? new MemoryDraftBackupStore()
      : new IndexedDbDraftBackupStore(),
});
