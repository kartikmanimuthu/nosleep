import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

export const emitter = new EventEmitter();

const modeFlags = {
  idle:    ['-i'],
  display: ['-d'],
  system:  ['-s'],
  all:     ['-d', '-i', '-s', '-u'],
};

let child = null;
let currentMode = 'idle';
let currentDuration = 0;
const stoppedManually = new WeakSet();

export function start(mode = 'idle', durationSeconds = 0) {
  stop();
  currentMode = mode;
  currentDuration = durationSeconds;
  const flags = [...(modeFlags[mode] ?? modeFlags.idle)];
  if (durationSeconds > 0) flags.push('-t', String(durationSeconds));
  child = spawn('caffeinate', flags, { stdio: 'ignore' });
  const thisChild = child;
  child.on('exit', () => {
    if (child === thisChild) child = null;
    emitter.emit('stopped', { manual: stoppedManually.has(thisChild) });
  });
}

export function stop() {
  if (child && !child.killed) {
    stoppedManually.add(child);
    child.kill('SIGKILL');
    child = null;
  }
}

export function isRunning() {
  return child !== null && !child.killed;
}

export function getState() {
  return {
    running: isRunning(),
    pid: child?.pid ?? null,
    mode: currentMode,
    durationSeconds: currentDuration,
  };
}
