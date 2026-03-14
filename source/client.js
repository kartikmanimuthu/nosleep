import net from 'node:net';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { SOCKET_PATH, PID_PATH, encode, createLineParser } from './ipc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Check if the daemon is running by testing the socket + PID. */
export async function isDaemonRunning() {
  if (!existsSync(SOCKET_PATH)) return false;
  try {
    const pid = parseInt(await readFile(PID_PATH, 'utf8'), 10);
    process.kill(pid, 0); // throws if process doesn't exist
    return true;
  } catch {
    return false;
  }
}

/** Spawn the daemon as a detached background process. */
export function spawnDaemon() {
  const daemonPath = join(__dirname, 'daemon.js');
  const child = spawn(process.execPath, ['--import=tsx/esm', daemonPath], {
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe'], // capture stderr for early crash detection
    env: { ...process.env },
  });
  // Log daemon stderr to a file so failures are diagnosable
  const logPath = join(dirname(SOCKET_PATH), 'daemon.log');
  import('node:fs').then(({ createWriteStream }) => {
    const log = createWriteStream(logPath, { flags: 'a' });
    child.stderr?.pipe(log);
  });
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

/** Wait for the daemon to be ready by probing the socket (up to 8s). */
export async function waitForDaemon(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 150));
    if (existsSync(SOCKET_PATH) && await canConnect()) return true;
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
