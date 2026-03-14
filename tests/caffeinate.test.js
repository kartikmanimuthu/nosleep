import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { start, stop, isRunning, getState, emitter } from '../source/caffeinate.js';

// Helper: wait for the next 'stopped' event
function waitForStopped(timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('stopped event timeout')), timeoutMs);
    emitter.once('stopped', (info) => { clearTimeout(t); resolve(info); });
  });
}

function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// Proper async afterEach: if a process is running, stop it and await the exit event.
// Then flush the Node I/O loop so any deferred exit events from the just-killed process
// have no chance to bleed into the next test.
afterEach(async () => {
  if (isRunning()) {
    const drain = waitForStopped();
    stop();
    await drain;
  }
  await new Promise(r => setTimeout(r, 30));
});

// ── isRunning before start ──────────────────────────────────────────────────

describe('isRunning() before any start()', () => {
  test('returns false when no process spawned', () => {
    assert.equal(isRunning(), false);
  });
});

// ── Mode flags ──────────────────────────────────────────────────────────────

describe('start() — mode flags', () => {
  test('idle mode spawns caffeinate -i', async () => {
    start('idle', 0);
    assert.ok(isRunning());
    const { pid } = getState();
    const cmd = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    assert.ok(cmd.includes('-i'), `expected -i flag, got: ${cmd}`);
    assert.ok(!cmd.includes('-d') && !cmd.includes('-s'), `unexpected flags: ${cmd}`);
  });

  test('display mode spawns caffeinate -d', () => {
    start('display', 0);
    const { pid } = getState();
    const cmd = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    assert.ok(cmd.includes('-d'), `expected -d flag, got: ${cmd}`);
  });

  test('system mode spawns caffeinate -s', () => {
    start('system', 0);
    const { pid } = getState();
    const cmd = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    assert.ok(cmd.includes('-s'), `expected -s flag, got: ${cmd}`);
  });

  test('all mode spawns caffeinate -d -i -s -u', () => {
    start('all', 0);
    const { pid } = getState();
    const cmd = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    assert.ok(cmd.includes('-d'), `missing -d in: ${cmd}`);
    assert.ok(cmd.includes('-i'), `missing -i in: ${cmd}`);
    assert.ok(cmd.includes('-s'), `missing -s in: ${cmd}`);
    assert.ok(cmd.includes('-u'), `missing -u in: ${cmd}`);
  });

  test('adds -t flag when durationSeconds > 0', () => {
    start('idle', 900);
    const { pid } = getState();
    const cmd = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    assert.ok(cmd.includes('-t 900'), `expected -t 900, got: ${cmd}`);
  });

  test('no -t flag when durationSeconds === 0 (infinite)', () => {
    start('idle', 0);
    const { pid } = getState();
    const cmd = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    assert.ok(!cmd.includes('-t'), `unexpected -t flag in: ${cmd}`);
  });

  test('unknown mode falls back to idle flags (-i)', () => {
    start('unknown-mode', 0);
    const { pid } = getState();
    const cmd = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    assert.ok(cmd.includes('-i'), `expected -i fallback, got: ${cmd}`);
  });
});

// ── isRunning / getState ────────────────────────────────────────────────────

describe('isRunning() / getState()', () => {
  test('true after start(), false after stop()', async () => {
    start('idle', 0);
    assert.equal(isRunning(), true);
    const drain = waitForStopped();
    stop();
    await drain;
    assert.equal(isRunning(), false);
  });

  test('getState() returns pid, mode, durationSeconds', () => {
    start('display', 1800);
    const s = getState();
    assert.ok(typeof s.pid === 'number' && s.pid > 0);
    assert.equal(s.mode, 'display');
    assert.equal(s.durationSeconds, 1800);
    assert.equal(s.running, true);
  });

  test('getState() pid is null after stop()', async () => {
    start('idle', 0);
    const drain = waitForStopped();
    stop();
    await drain;
    assert.equal(getState().pid, null);
  });
});

// ── stop() ──────────────────────────────────────────────────────────────────

describe('stop()', () => {
  test('kills the caffeinate process (OS-level)', async () => {
    start('idle', 0);
    const { pid } = getState();
    assert.ok(isAlive(pid));
    const drain = waitForStopped();
    stop();
    await drain;
    assert.ok(!isAlive(pid), `process ${pid} should be dead after stop()`);
  });

  test('is idempotent — calling stop() twice does not throw', async () => {
    start('idle', 0);
    const drain = waitForStopped();
    stop();
    await drain;
    assert.doesNotThrow(() => stop());
  });

  test('is safe to call without a running process', () => {
    assert.doesNotThrow(() => stop());
  });
});

// ── Manual vs unexpected stop (WeakSet tracking) ───────────────────────────

describe('manual vs unexpected stop (WeakSet tracking)', () => {
  test('stop() emits stopped with manual=true', async () => {
    start('idle', 0);
    const stoppedPromise = waitForStopped();
    stop();
    const { manual } = await stoppedPromise;
    assert.equal(manual, true);
  });

  test('external SIGKILL emits stopped with manual=false', async () => {
    start('idle', 0);
    const { pid } = getState();
    const stoppedPromise = waitForStopped();
    process.kill(pid, 'SIGKILL');
    const { manual } = await stoppedPromise;
    assert.equal(manual, false);
  });

  test('natural exit (short timer) emits stopped with manual=false', async () => {
    start('idle', 1); // caffeinate -i -t 1 — exits after 1 second naturally
    const stoppedPromise = waitForStopped(5000);
    const { manual } = await stoppedPromise;
    assert.equal(manual, false);
  });

  test('start() over existing process: old stopped=manual=true, new keeps running', async () => {
    start('idle', 0);
    const { pid: oldPid } = getState();
    const oldStopped = waitForStopped();

    start('display', 0); // kills old, spawns new
    const { manual } = await oldStopped;
    assert.equal(manual, true, 'old process should be stopped manually by start()');

    assert.ok(isRunning());
    const { pid: newPid } = getState();
    assert.notEqual(newPid, oldPid);
  });

  test('exit event fires exactly once even when stop() then external kill race', async () => {
    start('idle', 0);
    const { pid } = getState();

    let count = 0;
    const listener = () => count++;
    emitter.on('stopped', listener);

    const drain = waitForStopped();
    stop();
    await drain; // wait for the exit event to fully settle
    await new Promise(r => setTimeout(r, 100));

    // Try to re-kill the already-dead process (should fail silently)
    try { process.kill(pid, 'SIGKILL'); } catch {}
    await new Promise(r => setTimeout(r, 100));

    emitter.off('stopped', listener);
    assert.equal(count, 1, 'exactly one stopped event should fire per process death');
  });
});
