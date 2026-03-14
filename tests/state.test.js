import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Must set NOSLEEP_DIR before any nosleep module is imported (ESM module cache)
const testDir = await mkdtemp(join(tmpdir(), 'nosleep-state-test-'));
process.env.NOSLEEP_DIR = testDir;

const { loadState, saveState } = await import('../source/state.js');
const statePath = join(testDir, 'state.json');

after(async () => {
  await rm(testDir, { recursive: true, force: true });
});

const DEFAULT = {
  active: false,
  mode: 'idle',
  durationSeconds: 0,
  elapsed: 0,
  remaining: null,
  startedAt: null,
  pid: null,
};

describe('loadState()', () => {
  test('returns defaults when state file does not exist', async () => {
    const state = await loadState();
    assert.deepEqual(state, DEFAULT);
  });

  test('returns defaults when state file is empty/corrupt', async () => {
    await writeFile(statePath, 'not-json');
    const state = await loadState();
    assert.deepEqual(state, DEFAULT);
  });

  test('merges saved state with defaults (partial file)', async () => {
    await writeFile(statePath, JSON.stringify({ mode: 'display', active: true }));
    const state = await loadState();
    assert.equal(state.mode, 'display');
    assert.equal(state.active, true);
    // unspecified keys fall back to defaults
    assert.equal(state.elapsed, 0);
    assert.equal(state.remaining, null);
  });

  test('returns full saved state when file is complete', async () => {
    const saved = {
      active: true,
      mode: 'all',
      durationSeconds: 3600,
      elapsed: 120,
      remaining: 3480,
      startedAt: 1700000000000,
      pid: 99999,
    };
    await writeFile(statePath, JSON.stringify(saved));
    const state = await loadState();
    assert.deepEqual(state, saved);
  });
});

describe('saveState()', () => {
  test('writes state as formatted JSON', async () => {
    const s = { ...DEFAULT, mode: 'system', active: true };
    await saveState(s);
    const raw = await readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.mode, 'system');
    assert.equal(parsed.active, true);
  });

  test('creates directory if missing', async () => {
    // Delete the test dir entirely, then saveState should recreate it
    await rm(testDir, { recursive: true, force: true });
    await saveState({ ...DEFAULT, mode: 'system' });
    // If mkdir was called, the file should exist now
    const raw = await readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.mode, 'system');
  });

  test('round-trips: saveState then loadState returns same data', async () => {
    process.env.NOSLEEP_DIR = testDir;
    const s = {
      active: true,
      mode: 'display',
      durationSeconds: 1800,
      elapsed: 60,
      remaining: 1740,
      startedAt: Date.now(),
      pid: 12345,
    };
    await saveState(s);
    const loaded = await loadState();
    assert.deepEqual(loaded, s);
  });
});
