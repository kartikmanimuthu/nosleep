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
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
}

/** Wait for the daemon socket to appear (up to 5s). */
export async function waitForDaemon(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(SOCKET_PATH)) {
      // Give it a moment to start listening
      await new Promise(r => setTimeout(r, 50));
      if (await isDaemonRunning()) return true;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

/** Ensure daemon is running, spawning it if needed. Returns false if it fails to start. */
export async function ensureDaemon() {
  if (await isDaemonRunning()) return true;
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
  socket.on('error', onError ?? (() => {}));
  socket.on('close', () => onError?.('disconnected'));
  socket.write(encode({ type: 'subscribe' }));
  return () => {
    try { socket.write(encode({ type: 'unsubscribe' })); } catch {}
    socket.destroy();
  };
}
