import net from 'node:net';
import { existsSync, mkdirSync, openSync, closeSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { SOCKET_PATH, PID_PATH, encode, createLineParser } from './ipc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Check if the daemon is running by testing the socket + PID + actual connectivity. */
export async function isDaemonRunning() {
  if (!existsSync(SOCKET_PATH)) return false;
  try {
    const pid = parseInt(await readFile(PID_PATH, 'utf8'), 10);
    process.kill(pid, 0);
  } catch {
    return false;
  }
  return canConnect();
}

/** Spawn the daemon as a detached background process. */
export function spawnDaemon() {
  const daemonPath = join(__dirname, 'daemon.js');
  const logPath = join(dirname(SOCKET_PATH), 'daemon.log');
  // Open log fd synchronously — no pipe means no open handles in the parent's event loop
  let stderrOpt = 'ignore';
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    stderrOpt = openSync(logPath, 'a');
  } catch {}
  const child = spawn(process.execPath, ['--import=tsx/esm', daemonPath], {
    detached: true,
    cwd: join(__dirname, '..'), // resolve tsx/esm from project root, not user's cwd
    stdio: ['ignore', 'ignore', stderrOpt],
    env: { ...process.env },
  });
  if (typeof stderrOpt === 'number') {
    try { closeSync(stderrOpt); } catch {}
  }
  child.unref();
}

/** Probe the socket with an actual connection attempt. */
function canConnect() {
  return new Promise((resolve) => {
    const sock = net.createConnection(SOCKET_PATH);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
  });
}

/** Wait for the daemon to be ready by probing the socket (up to 12s, exponential backoff). */
export async function waitForDaemon(timeoutMs = 12000) {
  const t0 = Date.now();
  let delay = 100;
  while (Date.now() - t0 < timeoutMs) {
    await new Promise(r => setTimeout(r, delay));
    if (existsSync(SOCKET_PATH) && await canConnect()) return true;
    delay = Math.min(delay * 2, 1000);
  }
  return false;
}

/** Ensure daemon is running, spawning it if needed. Returns false if it fails to start. */
export async function ensureDaemon() {
  if (await isDaemonRunning()) return true;
  // Clean up stale socket so the new daemon can bind immediately
  if (existsSync(SOCKET_PATH)) {
    try { await import('node:fs/promises').then(({ unlink }) => unlink(SOCKET_PATH)); } catch { }
  }
  spawnDaemon();
  return waitForDaemon();
}

/** Connect to the daemon socket. Returns a connected net.Socket. */
export function connect() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(SOCKET_PATH);
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
  });
}

/**
 * Send a command and await a single response message.
 * Resolves with the response object.
 */
export async function send(command) {
  const socket = await connect();
  return new Promise((resolve, reject) => {
    const parser = createLineParser((msg) => {
      socket.destroy();
      resolve(msg);
    });
    socket.on('data', parser);
    socket.on('error', reject);
    socket.write(encode(command));
  });
}

/**
 * Subscribe to real-time state pushes from the daemon.
 * Calls onState(statePayload) on every update.
 * Returns a disconnect function.
 */
export async function subscribe(onState, onError) {
  const socket = await connect();
  const parser = createLineParser((msg) => {
    if (msg.type === 'state') onState(msg.payload);
  });
  socket.on('data', parser);
  socket.on('error', onError ?? (() => { }));
  socket.on('close', () => onError?.('disconnected'));
  socket.write(encode({ type: 'subscribe' }));
  return () => {
    try { socket.write(encode({ type: 'unsubscribe' })); } catch { }
    socket.destroy();
  };
}
