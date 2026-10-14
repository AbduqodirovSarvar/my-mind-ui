import { AutosaveController, AutosaveState, SaveOutcome } from './autosave';
import { DraftSnapshot, MemoryDraftBackupStore } from './draft-backup';

const snapshot = (title: string): DraftSnapshot => ({
  title,
  content: { type: 'doc', content: [] },
});

describe('AutosaveController', () => {
  let saves: DraftSnapshot[];
  let outcomes: SaveOutcome[];
  let states: AutosaveState[];
  let backup: MemoryDraftBackupStore;
  let autosave: AutosaveController;

  beforeEach(() => {
    vi.useFakeTimers();
    saves = [];
    outcomes = [];
    states = [];
    backup = new MemoryDraftBackupStore();
    autosave = new AutosaveController({
      articleId: 'a1',
      backup,
      save: async (s) => {
        saves.push(s);
        return outcomes.shift() ?? 'ok';
      },
      onState: (state) => states.push(state),
    });
  });

  afterEach(() => {
    autosave.dispose();
    vi.useRealTimers();
  });

  it('saves 2 seconds after typing stops, once, with the latest text', async () => {
    autosave.change(snapshot('a'));
    await vi.advanceTimersByTimeAsync(1_000);
    autosave.change(snapshot('ab'));
    await vi.advanceTimersByTimeAsync(1_999);
    expect(saves).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);

    expect(saves.map((s) => s.title)).toEqual(['ab']);
    expect(states.at(-1)).toBe('saved');
    expect(backup.items.size).toBe(0);
  });

  it('saves at least every 30 seconds while the user keeps typing', async () => {
    for (let second = 0; second < 30; second++) {
      autosave.change(snapshot(`t${second}`));
      await vi.advanceTimersByTimeAsync(1_000);
    }

    expect(saves.length).toBe(1);
  });

  it('keeps a local backup until the server confirms', async () => {
    outcomes.push('error');
    autosave.change(snapshot('offline'));

    await vi.advanceTimersByTimeAsync(2_000);

    expect(states.at(-1)).toBe('error');
    expect(backup.items.get('a1')?.title).toBe('offline');
    expect(autosave.hasUnsavedChanges).toBe(true);

    // Retried after 5 s; this time the network is back.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(saves.length).toBe(2);
    expect(states.at(-1)).toBe('saved');
    expect(backup.items.size).toBe(0);
  });

  it('stops on a conflict, so a second tab cannot overwrite the first one', async () => {
    outcomes.push('conflict');
    autosave.change(snapshot('second tab'));
    await vi.advanceTimersByTimeAsync(2_000);

    autosave.change(snapshot('more typing'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(saves.length).toBe(1);
    expect(states.at(-1)).toBe('conflict');
    // The work is not lost: it stays in the local backup.
    expect(backup.items.get('a1')?.title).toBe('more typing');
  });

  it('saves changes made while a save was in flight', async () => {
    let release!: () => void;
    autosave = new AutosaveController({
      articleId: 'a1',
      backup,
      save: (s) => {
        saves.push(s);
        return saves.length === 1
          ? new Promise<SaveOutcome>((resolve) => (release = () => resolve('ok')))
          : Promise.resolve('ok');
      },
      onState: (state) => states.push(state),
    });

    autosave.change(snapshot('first'));
    await vi.advanceTimersByTimeAsync(2_000);
    autosave.change(snapshot('second'));
    release();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(saves.map((s) => s.title)).toEqual(['first', 'second']);
    expect(states.at(-1)).toBe('saved');
  });

  it('flush saves immediately', async () => {
    autosave.change(snapshot('now'));

    await autosave.flush();

    expect(saves.map((s) => s.title)).toEqual(['now']);
    expect(autosave.hasUnsavedChanges).toBe(false);
  });
});
