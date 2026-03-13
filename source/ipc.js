import { join } from 'node:path';
import { homedir } from 'node:os';

export const NOSLEEP_DIR  = join(homedir(), '.nosleep');
export const SOCKET_PATH  = join(NOSLEEP_DIR, 'nosleep.sock');
export const STATE_PATH   = join(NOSLEEP_DIR, 'state.json');
export const PID_PATH     = join(NOSLEEP_DIR, 'daemon.pid');

export function encode(msg) {
  return JSON.stringify(msg) + '\n';
}

/** Returns a function that buffers socket data and calls onMessage for each complete JSON line. */
export function createLineParser(onMessage) {
  let buf = '';
  return (data) => {
    buf += data.toString();
    const lines = buf.split('\n');
    buf = lines.pop(); // keep incomplete tail
    for (const line of lines) {
      if (!line.trim()) continue;
      try { onMessage(JSON.parse(line)); } catch { /* ignore malformed */ }
    }
  };
}
