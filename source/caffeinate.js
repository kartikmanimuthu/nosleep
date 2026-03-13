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

export function start(mode = 'idle', durationSeconds = 0) {
  stop();
  const flags = [...(modeFlags[mode] ?? modeFlags.idle)];
  if (durationSeconds > 0) flags.push('-t', String(durationSeconds));
  child = spawn('caffeinate', flags, { stdio: 'ignore' });
  child.on('exit', () => {
    child = null;
    emitter.emit('stopped');
  });
}

export function stop() {
  if (child && !child.killed) {
    child.kill('SIGTERM');
    child = null;
  }
}

export function isRunning() {
  return child !== null && !child.killed;
}
