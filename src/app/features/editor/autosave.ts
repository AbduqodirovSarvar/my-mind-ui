import { DraftBackupStore, DraftSnapshot } from './draft-backup';

/**
 * - `saved`: the server has everything.
 * - `dirty`: there are changes waiting for the next save.
 * - `saving`: a save is in flight.
 * - `error`: the last save failed (network); it is retried and the local backup holds the work.
 * - `conflict`: the article changed elsewhere (412); autosave stops until the page is reloaded.
 */
export type AutosaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

export type SaveOutcome = 'ok' | 'conflict' | 'error';

export interface AutosaveOptions {
  articleId: string;
  /** Sends a snapshot to the server; must not throw. */
  save: (snapshot: DraftSnapshot) => Promise<SaveOutcome>;
  backup: DraftBackupStore;
  onState: (state: AutosaveState, lastSavedAt: Date | null) => void;
  /** Save this long after the last keystroke. */
  debounceMs?: number;
  /** …but at least this often while the user keeps typing. */
  maxIntervalMs?: number;
  now?: () => Date;
}

const RETRY_DELAYS_MS = [5_000, 10_000, 30_000, 60_000];

/**
 * Autosave policy from plan §8.2: 2 s after typing stops, at least every 30 s while typing,
 * and on leaving the page. Every change is also written to a local backup first.
 */
export class AutosaveController {
  private readonly debounceMs: number;
  private readonly maxIntervalMs: number;
  private readonly now: () => Date;

  private latest: DraftSnapshot | null = null;
  private dirty = false;
  private conflict = false;
  private inFlight: Promise<void> | null = null;
  private flushAgain = false;
  private retries = 0;
  private lastSavedAt: Date | null = null;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: AutosaveOptions) {
    this.debounceMs = options.debounceMs ?? 2_000;
    this.maxIntervalMs = options.maxIntervalMs ?? 30_000;
    this.now = options.now ?? (() => new Date());
  }

  get hasUnsavedChanges(): boolean {
    return this.dirty || this.inFlight !== null;
  }

  change(snapshot: DraftSnapshot): void {
    if (this.conflict) {
      // Keep the local copy so the work can be recovered after reloading.
      void this.backupLatest(snapshot);
      return;
    }

    this.latest = snapshot;
    this.dirty = true;
    void this.backupLatest(snapshot);
    if (!this.inFlight) {
      this.emit('dirty');
    }

    this.clear('debounce');
    this.debounceTimer = setTimeout(() => void this.flush(), this.debounceMs);
    this.maxTimer ??= setTimeout(() => void this.flush(), this.maxIntervalMs);
  }

  /** Saves pending changes now; resolves when the server has them (or the save failed). */
  async flush(): Promise<void> {
    this.clear('debounce');
    this.clear('max');
    this.clear('retry');

    if (this.inFlight) {
      this.flushAgain = true;
      return this.inFlight;
    }

    if (!this.dirty || this.conflict || !this.latest) {
      return;
    }

    this.inFlight = this.saveLatest();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }

    if (this.flushAgain && this.dirty && !this.conflict) {
      this.flushAgain = false;
      await this.flush();
    }
  }

  dispose(): void {
    this.clear('debounce');
    this.clear('max');
    this.clear('retry');
  }

  private async saveLatest(): Promise<void> {
    const snapshot = this.latest!;
    this.dirty = false;
    this.emit('saving');

    const outcome = await this.options.save(snapshot);

    if (outcome === 'ok') {
      this.retries = 0;
      this.lastSavedAt = this.now();
      if (this.latest === snapshot) {
        await this.options.backup.delete(this.options.articleId);
        this.emit('saved');
      } else {
        // Typed while saving: those changes are still pending.
        this.dirty = true;
        this.emit('dirty');
        this.debounceTimer = setTimeout(() => void this.flush(), this.debounceMs);
      }
      return;
    }

    this.dirty = true;
    if (outcome === 'conflict') {
      this.conflict = true;
      this.emit('conflict');
      return;
    }

    this.emit('error');
    const delay = RETRY_DELAYS_MS[Math.min(this.retries, RETRY_DELAYS_MS.length - 1)];
    this.retries++;
    this.retryTimer = setTimeout(() => void this.flush(), delay);
  }

  private async backupLatest(snapshot: DraftSnapshot): Promise<void> {
    try {
      await this.options.backup.put(this.options.articleId, {
        ...snapshot,
        savedAt: this.now().toISOString(),
      });
    } catch {
      // A backup is best effort.
    }
  }

  private emit(state: AutosaveState): void {
    this.options.onState(state, this.lastSavedAt);
  }

  private clear(timer: 'debounce' | 'max' | 'retry'): void {
    const handle =
      timer === 'debounce' ? this.debounceTimer : timer === 'max' ? this.maxTimer : this.retryTimer;
    if (handle) {
      clearTimeout(handle);
    }
    if (timer === 'debounce') this.debounceTimer = null;
    else if (timer === 'max') this.maxTimer = null;
    else this.retryTimer = null;
  }
}
