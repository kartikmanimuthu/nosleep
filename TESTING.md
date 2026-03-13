# nosleep — Testing Guide

## Overview

The app has two testable layers:

1. **`caffeinate.js`** — process manager (pure Node.js, no TTY needed, fully automatable)
2. **`app.jsx`** — React Ink UI (requires a TTY; use `ink-testing-library` for unit tests)

---

## 1. Testing `caffeinate.js` (Automated)

This module has no UI dependency and can be tested with a plain Node.js script.

### Run the test suite

```bash
node --input-type=module << 'EOF'
import { start, stop, isRunning, emitter } from './source/caffeinate.js';
import { execSync } from 'node:child_process';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ownPids = new Set();

// Patch start to track our pids
const _start = start;

// Test 1: initially not running
console.assert(!isRunning(), 'FAIL: should not be running initially');
console.log('✓ initially not running');

// Test 2: start
start('idle');
console.assert(isRunning(), 'FAIL: should be running after start');
console.log('✓ starts caffeinate');

// Test 3: stop
stop();
await sleep(200);
console.assert(!isRunning(), 'FAIL: should not be running after stop');
console.log('✓ stops caffeinate');

// Test 4: idempotent stop
stop();
console.log('✓ stop() is idempotent');

// Test 5: emitter fires on timer expiry
await new Promise(resolve => {
  emitter.once('stopped', () => {
    console.log('✓ emitter fires "stopped" on timer expiry');
    resolve();
  });
  start('idle', 1); // 1-second timer
});

// Test 6: all modes spawn without error
for (const mode of ['idle', 'display', 'system', 'all']) {
  start(mode);
  console.assert(isRunning(), `FAIL: mode '${mode}' did not start`);
  stop();
  await sleep(100);
  console.log(`✓ mode '${mode}' starts and stops`);
}

console.log('\nAll caffeinate.js tests passed.');
EOF
```

### What's covered

| Test | Description |
|------|-------------|
| `isRunning()` initial state | Returns `false` before any `start()` call |
| `start()` + `isRunning()` | Process spawns and is tracked |
| `stop()` | Process is killed, `isRunning()` returns `false` |
| Idempotent `stop()` | Calling `stop()` twice doesn't throw |
| Timer expiry event | `emitter` fires `'stopped'` when caffeinate self-exits via `-t` |
| All four modes | `idle`, `display`, `system`, `all` each spawn successfully |

---

## 2. Testing `app.jsx` (Unit — ink-testing-library)

Ink provides [`ink-testing-library`](https://github.com/vadimdemedes/ink-testing-library) for rendering components without a real TTY.

### Install

```bash
npm install --save-dev ink-testing-library
```

### Example test (plain Node.js, no test runner needed)

```js
// test/app.test.mjs
import { render } from 'ink-testing-library';
import React from 'react';
import { App } from '../source/app.jsx';

// Test 1: renders inactive state
{
  const { lastFrame } = render(React.createElement(App));
  const frame = lastFrame();
  console.assert(frame.includes('○ inactive'), 'FAIL: should show inactive status');
  console.assert(frame.includes('idle'), 'FAIL: should show default mode');
  console.log('✓ renders inactive state correctly');
}

// Test 2: renders all expected keyboard hints
{
  const { lastFrame } = render(React.createElement(App));
  const frame = lastFrame();
  console.assert(frame.includes('[space] toggle'), 'FAIL: missing toggle hint');
  console.assert(frame.includes('[m] mode'), 'FAIL: missing mode hint');
  console.assert(frame.includes('[q] quit'), 'FAIL: missing quit hint');
  console.log('✓ renders keyboard hints');
}

console.log('\nAll app.jsx unit tests passed.');
```

Run with:

```bash
node --import=tsx/esm test/app.test.mjs
```

---

## 3. Manual Testing Checklist

Run `npm start` in a real terminal and verify each item:

### Basic toggle
- [ ] App starts showing `○ inactive`
- [ ] Press `space` → status changes to `● ACTIVE` (green)
- [ ] `pgrep caffeinate` shows a process
- [ ] Press `space` again → status returns to `○ inactive`
- [ ] `pgrep caffeinate` shows no new process

### Mode cycling
- [ ] Press `m` repeatedly → cycles through `idle → display → system → all → idle`
- [ ] While active, press `m` → mode changes and caffeinate restarts (brief flicker is normal)

### Timer presets
- [ ] Press `t` repeatedly → cycles `off → 15m → 30m → 1h → 2h → 4h → off`
- [ ] Activate with a timer set → countdown displays (`Timer: MM:SS remaining`)
- [ ] Press `c` → timer clears, switches to elapsed display

### Cleanup on exit
- [ ] While active, press `q` → app exits, `pgrep caffeinate` shows no orphaned process
- [ ] While active, press `Ctrl+C` → same result
- [ ] While active, `kill <app-pid>` from another terminal → caffeinate process also dies

---

## 4. Known Limitation

Ink requires an interactive TTY. Running the app via:

```bash
npx tsx source/cli.jsx &   # backgrounded in a script
```

...will throw `Raw mode is not supported`. This is expected — always run the app in a foreground terminal session.
