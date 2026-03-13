import net from 'node:net';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync, unlinkSync } from 'node:fs';
import { NOSLEEP_DIR, SOCKET_PATH, PID_PATH, encode, createLineParser } from './ipc.js';
import { loadState, saveState } from './state.js';
import { start, stop, isRunning, getState, emitter } from './caffeinate.js';

// ── State ────────────────────────────────────────────────────────────────────

let state = {
  active: false,
  mode: 'idle',
  durationSeconds: 0,
  elapsed: 0,
  remaining: null,
  startedAt: null,
  pid: null,
};

const subscribers = new Set(); // connected sockets that want real-time pushes

// ── Helpers ──────────────────────────────────────────────────────────────────

function pushState() {
  const msg = encode({ type: 'state', payload: { ...state } });
  for (const sock of subscribers) {
    try { sock.write(msg); } catch { subscribers.delete(sock); }
  }
}

async function setState(patch) {
  state = { ...state, ...patch };
  pushState();
  await saveState(state).catch(() => {});
}

function doStart(mode, durationSeconds) {
  start(mode, durationSeconds);
  const cs = getState();
  setState({
    active: true,
    mode,
    durationSeconds,
    elapsed: 0,
    remaining: durationSeconds > 0 ? durationSeconds : null,
    startedAt: Date.now(),
    pid: cs.pid,
  });
}

function doStop() {
  stop();
  setState({ active: false, elapsed: 0, remaining: null, startedAt: null, pid: null });
}

// ── Tick loop (1s) ───────────────────────────────────────────────────────────

let idleSeconds = 0;
const AUTO_SHUTDOWN_IDLE = 10 * 60; // 10 minutes

setInterval(() => {
  if (state.active) {
    const newElapsed = state.elapsed + 1;
    const newRemaining = state.remaining !== null ? Math.max(0, state.remaining - 1) : null;
    setState({ elapsed: newElapsed, remaining: newRemaining });
    idleSeconds = 0;
  } else {
    idleSeconds++;
    if (idleSeconds >= AUTO_SHUTDOWN_IDLE && subscribers.size === 0) {
      shutdown();
    }
  }
}, 1000);

// ── caffeinate self-exit (timer expiry) ──────────────────────────────────────

emitter.on('stopped', () => {
  setState({ active: false, elapsed: 0, remaining: null, startedAt: null, pid: null });
});

// ── Command handler ──────────────────────────────────────────────────────────

function handleCommand(msg, socket) {
  idleSeconds = 0; // any command resets idle timer
  switch (msg.type) {
    case 'start':
      doStart(msg.mode ?? state.mode, msg.durationSeconds ?? 0);
      socket.write(encode({ type: 'ok' }));
      break;
    case 'stop':
      doStop();
      socket.write(encode({ type: 'ok' }));
      break;
    case 'set-mode':
      if (state.active) doStart(msg.mode, state.durationSeconds);
      else setState({ mode: msg.mode });
      socket.write(encode({ type: 'ok' }));
      break;
    case 'set-timer':
      if (state.active) doStart(state.mode, msg.durationSeconds);
      else setState({ durationSeconds: msg.durationSeconds });
      socket.write(encode({ type: 'ok' }));
      break;
    case 'status':
      socket.write(encode({ type: 'state', payload: { ...state } }));
      break;
    case 'subscribe':
      subscribers.add(socket);
      socket.write(encode({ type: 'state', payload: { ...state } })); // immediate snapshot
      break;
    case 'unsubscribe':
      subscribers.delete(socket);
      socket.write(encode({ type: 'ok' }));
      break;
    case 'shutdown':
      socket.write(encode({ type: 'ok' }));
      setImmediate(shutdown);
      break;
    default:
      socket.write(encode({ type: 'error', message: `Unknown command: ${msg.type}` }));
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

async function shutdown() {
  stop();
  for (const sock of subscribers) { try { sock.destroy(); } catch {} }
  try { await unlink(SOCKET_PATH); } catch {}
  try { await unlink(PID_PATH); } catch {}
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
process.on('exit', () => {
  try { unlinkSync(SOCKET_PATH); } catch {}
  try { unlinkSync(PID_PATH); } catch {}
});

// ── Stale socket cleanup ─────────────────────────────────────────────────────

async function cleanStale() {
  // Kill any caffeinate process left over from a previous daemon instance
  try {
    const saved = await loadState();
    if (saved.pid) process.kill(saved.pid, 'SIGKILL');
  } catch {}
  if (existsSync(SOCKET_PATH)) {
    try { await unlink(SOCKET_PATH); } catch {}
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

await mkdir(NOSLEEP_DIR, { recursive: true });
await cleanStale();
await writeFile(PID_PATH, String(process.pid));

// Restore persisted state (but don't auto-restart caffeinate)
const saved = await loadState();
state = { ...state, ...saved, active: false, pid: null };

const server = net.createServer((socket) => {
  idleSeconds = 0;
  const parser = createLineParser((msg) => handleCommand(msg, socket));
  socket.on('data', parser);
  socket.on('close', () => subscribers.delete(socket));
  socket.on('error', () => subscribers.delete(socket));
});

server.listen(SOCKET_PATH, () => {
  // Daemon is ready
});
