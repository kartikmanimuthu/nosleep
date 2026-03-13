import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { NOSLEEP_DIR, STATE_PATH } from './ipc.js';

const DEFAULT_STATE = {
  active: false,
  mode: 'idle',
  durationSeconds: 0,
  elapsed: 0,
  remaining: null,
  startedAt: null,
  pid: null,
};

export async function loadState() {
  try {
    const data = await readFile(STATE_PATH, 'utf8');
    return { ...DEFAULT_STATE, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveState(state) {
  await mkdir(NOSLEEP_DIR, { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}
