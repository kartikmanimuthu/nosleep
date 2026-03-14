/**
 * Integration tests — spawn real daemon + CLI in an isolated temp directory.
 * NOSLEEP_DIR=<tmpdir> so tests never touch the user's real daemon.
 * Each suite manages its own daemon lifecycle via before/after hooks.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execSync } from 'node:child_process';
import { mkdtemp, rm, access, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const CLI       = join(ROOT, 'source', 'cli.jsx');
const NODE      = process.execPath;
const TSX_FLAG  = '--import=tsx/esm';

// Each test run gets its own temp dir — completely isolated from user's daemon
let testDir;

before(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'nosleep-int-'));
});

after(async () => {
  cliSync(['shutdown']);
  await rm(testDir, { recursive: true, force: true });
});

/** Run CLI synchronously. Returns { stdout, stderr, status }. */
function cliSync(args, timeoutMs = 25000) {
  return spawnSync(NODE, [TSX_FLAG, CLI, ...args], {
    env: { ...process.env, NOSLEEP_DIR: testDir },
    timeout: timeoutMs,
    encoding: 'utf8',
  });
}

/** Get parsed JSON status, or null if daemon is down. */
async function getStatus() {
  const r = cliSync(['status', '--json']);
  if (!r.stdout?.trim()) return null;
  try { return JSON.parse(r.stdout.trim()); } catch { return null; }
}

/** Wait until condition() is truthy, polling every 200ms up to timeoutMs. */
async function waitFor(condition, timeoutMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await condition()) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

/** Ensure daemon is up with 'idle' mode (no timer). Throws if it fails. */
function startDaemon(args = []) {
  const r = cliSync(['start', '--mode', 'idle', ...args]);
  if (r.status !== 0) throw new Error(`daemon start failed:\n${r.stderr || r.stdout}`);
  return r;
}

/** Shutdown daemon, ignoring errors. */
function shutdownDaemon() {
  cliSync(['shutdown'], 5000);
}

// ── start command ─────────────────────────────────────────────────────────────

describe('start command', () => {
  after(() => shutdownDaemon());

  test('reports active with correct mode/timer', { timeout: 30000 }, () => {
    const r = cliSync(['start', '--mode', 'display', '--timer', '15m']);
    assert.equal(r.status, 0, `exit: ${r.status}\n${r.stderr}`);
    assert.ok(r.stdout.includes('nosleep active'));
    assert.ok(r.stdout.includes('mode: display'));
    assert.ok(r.stdout.includes('timer: 15m'));
  });

  test('spawns exactly one caffeinate process with correct flags', async () => {
    const s = await getStatus();
    assert.ok(s?.pid, `expected caffeinate pid, got: ${JSON.stringify(s)}`);
    const cmd = execSync(`ps -p ${s.pid} -o args=`, { encoding: 'utf8' }).trim();
    assert.ok(cmd.includes('caffeinate'), `not caffeinate: ${cmd}`);
    assert.ok(cmd.includes('-d'), `missing -d: ${cmd}`);
    assert.ok(cmd.includes('-t 900'), `missing -t 900: ${cmd}`);
  });
});

// ── status command ────────────────────────────────────────────────────────────

describe('status command', () => {
  before(() => startDaemon(['--timer', '15m']));
  after(() => shutdownDaemon());

  test('--json returns valid JSON with active=true', async () => {
    const s = await getStatus();
    assert.ok(s, 'status should return JSON');
    assert.equal(s.active, true);
    assert.ok(typeof s.remaining === 'number' && s.remaining > 0);
  });

  test('reports active=false after stop', async () => {
    cliSync(['stop']);
    const s = await getStatus();
    assert.equal(s?.active, false);
  });

  test('human-readable status shows mode and time fields', async () => {
    cliSync(['start', '--mode', 'idle']);
    const r = cliSync(['status']);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('ACTIVE'));
    assert.ok(r.stdout.includes('idle'));
  });

  test('reports "not running" when daemon is down', () => {
    shutdownDaemon();
    const r = cliSync(['status']);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('not running'));
  });
});

// ── mode flags ────────────────────────────────────────────────────────────────

describe('start --mode flag propagates to caffeinate', () => {
  after(() => shutdownDaemon());

  for (const [mode, expectedFlags] of [
    ['idle',    ['-i']],
    ['display', ['-d']],
    ['system',  ['-s']],
    ['all',     ['-d', '-i', '-s', '-u']],
  ]) {
    test(`mode=${mode} spawns ${expectedFlags.join(' ')}`, { timeout: 30000 }, async () => {
      const r = cliSync(['start', '--mode', mode]);
      assert.equal(r.status, 0, r.stderr);
      const s = await getStatus();
      assert.ok(s?.pid, `no pid in state: ${JSON.stringify(s)}`);
      const cmd = execSync(`ps -p ${s.pid} -o args=`, { encoding: 'utf8' }).trim();
      for (const flag of expectedFlags) {
        assert.ok(cmd.includes(flag), `missing ${flag} in: ${cmd}`);
      }
      cliSync(['stop']);
    });
  }
});

// ── stop command ──────────────────────────────────────────────────────────────

describe('stop command', () => {
  before(() => startDaemon());
  after(() => shutdownDaemon());

  test('kills caffeinate but daemon stays answering status', async () => {
    cliSync(['start', '--mode', 'idle']);
    const sBefore = await getStatus();
    assert.ok(sBefore?.pid, 'expected active caffeinate');

    const r = cliSync(['stop']);
    assert.equal(r.status, 0);
    await new Promise(res => setTimeout(res, 300));

    // caffeinate process should be dead
    assert.throws(
      () => execSync(`ps -p ${sBefore.pid} -o pid=`, { encoding: 'utf8', stdio: 'pipe' }),
      'caffeinate should be gone after stop'
    );

    // daemon still responds
    const sAfter = await getStatus();
    assert.ok(sAfter, 'daemon should still be running');
    assert.equal(sAfter.active, false);
  });

  test('when daemon not running prints friendly message, exits 0', () => {
    shutdownDaemon();
    const r = cliSync(['stop']);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('not running'));
  });
});

// ── shutdown command ──────────────────────────────────────────────────────────

describe('shutdown command', () => {
  before(() => startDaemon());

  test('removes socket and pid files', async () => {
    cliSync(['start', '--mode', 'idle']);
    await new Promise(r => setTimeout(r, 300));

    const r = cliSync(['shutdown']);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('shut down'));

    await new Promise(r => setTimeout(r, 500));

    const socketGone = await access(join(testDir, 'nosleep.sock')).then(() => false).catch(() => true);
    const pidGone    = await access(join(testDir, 'daemon.pid')).then(() => false).catch(() => true);
    assert.ok(socketGone, 'socket file should be removed');
    assert.ok(pidGone,    'pid file should be removed');
  });

  test('when daemon not running prints friendly message, exits 0', () => {
    const r = cliSync(['shutdown']);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('not running'));
  });
});

// ── stale daemon recovery ─────────────────────────────────────────────────────

describe('stale daemon recovery', () => {
  after(() => shutdownDaemon());

  test('start recovers after daemon killed with SIGKILL', { timeout: 40000 }, async () => {
    startDaemon();
    await new Promise(r => setTimeout(r, 500));

    // kill -9 the daemon (simulates crash)
    const pidRaw = await readFile(join(testDir, 'daemon.pid'), 'utf8').catch(() => '');
    const daemonPid = parseInt(pidRaw.trim(), 10);
    if (daemonPid) try { process.kill(daemonPid, 'SIGKILL'); } catch {}

    await new Promise(r => setTimeout(r, 500));

    // New start should recover cleanly
    const r = cliSync(['start', '--mode', 'idle']);
    assert.equal(r.status, 0, `recovery failed:\n${r.stderr || r.stdout}`);
    assert.ok(r.stdout.includes('nosleep active'));

    const s = await getStatus();
    assert.equal(s?.active, true);
    assert.ok(s?.pid);
  });
});

// ── caffeinate auto-restart ───────────────────────────────────────────────────

describe('caffeinate auto-restart on unexpected death', () => {
  before(() => startDaemon());
  after(() => shutdownDaemon());

  test('daemon restarts caffeinate when killed externally', async () => {
    cliSync(['start', '--mode', 'idle']);
    await new Promise(r => setTimeout(r, 300));

    const sBefore = await getStatus();
    assert.ok(sBefore?.pid, `expected caffeinate pid, got: ${JSON.stringify(sBefore)}`);

    process.kill(sBefore.pid, 'SIGKILL');

    const restarted = await waitFor(async () => {
      const s = await getStatus();
      return s?.active === true && s?.pid != null && s.pid !== sBefore.pid;
    }, 6000);

    assert.ok(restarted, 'daemon should auto-restart caffeinate');
    const sAfter = await getStatus();
    assert.ok(sAfter?.pid);
    assert.notEqual(sAfter.pid, sBefore.pid, 'new pid should differ');
  });
});

// ── timer expiry — no auto-restart ───────────────────────────────────────────

describe('timer expiry — no auto-restart', () => {
  before(() => startDaemon());
  after(() => shutdownDaemon());

  test('daemon marks inactive after short timer expires (no restart)', { timeout: 15000 }, async () => {
    // Use helper to send a 2-second timer (not available via CLI flags)
    const helper = join(__dirname, 'helpers', 'send-start.js');
    const r = spawnSync(NODE, [TSX_FLAG, helper], {
      env: { ...process.env, NOSLEEP_DIR: testDir },
      timeout: 8000,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, `helper failed: ${r.stderr}`);

    // Wait for caffeinate to expire naturally
    await new Promise(r => setTimeout(r, 4000));

    const s = await getStatus();
    assert.equal(s?.active, false, 'should be inactive after timer expires naturally');
  });
});

// ── restart attempts limit ────────────────────────────────────────────────────

describe('restart attempts limit', () => {
  before(() => startDaemon());
  after(() => shutdownDaemon());

  test('daemon stops restarting after MAX_RESTART_ATTEMPTS exceeded', { timeout: 20000 }, async () => {
    cliSync(['start', '--mode', 'idle']);
    await new Promise(r => setTimeout(r, 300));

    // Kill caffeinate 4 times (limit is 3 per 60s window)
    for (let i = 0; i < 4; i++) {
      const s = await getStatus();
      if (!s?.pid) break;
      try { process.kill(s.pid, 'SIGKILL'); } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }

    await new Promise(r => setTimeout(r, 1000));
    const s = await getStatus();
    assert.equal(s?.active, false, 'should stop restarting after limit exceeded');
  });
});
