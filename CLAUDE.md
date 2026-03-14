# nosleep — Claude Code Configuration

## Project Overview

macOS TUI app that prevents the system from sleeping. Built with React Ink, runs as a background daemon communicating over a Unix socket.

## Tech Stack

- **Runtime**: Node.js v18+ (ESM modules — `"type": "module"` in package.json)
- **UI**: React 18 + Ink 5 (terminal UI renderer)
- **Executor**: tsx (runs `.jsx`/`.js` directly, no build step)
- **IPC**: Unix domain socket (`~/.nosleep/nosleep.sock`)
- **Platform**: macOS only (wraps native `caffeinate` command)

## Architecture

```
CLI (source/cli.jsx)
  └── subcommand router → commands/{start,stop,status,attach}.jsx
        └── client.js (Unix socket client)
              └── daemon.js (background process, owns caffeinate)
                    └── caffeinate.js (spawns/kills caffeinate process)
```

State persisted to `~/.nosleep/state.json`. Socket at `~/.nosleep/nosleep.sock`.

## Key Commands

```bash
npm start                                  # attach (starts daemon if needed)
npx tsx source/cli.jsx start               # start sleep prevention
npx tsx source/cli.jsx start --mode display --timer 1h
npx tsx source/cli.jsx stop                # stop caffeinate (daemon stays)
npx tsx source/cli.jsx status              # print status
npx tsx source/cli.jsx status --json       # machine-readable
npx tsx source/cli.jsx attach              # interactive TUI
npx tsx source/cli.jsx shutdown            # kill daemon entirely
pgrep -l caffeinate                        # verify caffeinate is running
```

## File Map

```
source/
├── cli.jsx              Entry point — subcommand router
├── daemon.js            Background daemon — socket server + state machine
├── caffeinate.js        Process manager — spawns/kills caffeinate
├── ipc.js               Shared IPC protocol (socket path, encode/decode)
├── client.js            Socket client — connect, send, subscribe
├── state.js             Persistence — ~/.nosleep/state.json
├── commands/
│   ├── start.js         nosleep start
│   ├── stop.js          nosleep stop
│   ├── status.js        nosleep status
│   └── attach.jsx       nosleep attach (Ink TUI)
└── components/
    ├── Dashboard.jsx    Main TUI layout
    ├── StatusBar.jsx    Active/inactive indicator
    ├── ModeSelector.jsx Horizontal arrow-key mode picker
    ├── TimerSelector.jsx Horizontal arrow-key timer picker
    └── HelpBar.jsx      Keyboard hints footer
```

## Coding Conventions

- **ESM only** — never use `require()` or CommonJS patterns
- **No TypeScript** — plain `.js`/`.jsx`, no type annotations
- **React functional components** — hooks only, no class components
- **No new npm dependencies** without explicit discussion — use Node built-ins
- **Minimal code** — no abstractions for one-time use, no defensive error handling for impossible cases
- **No comments** unless logic is non-obvious
- **Async/await** over callbacks or raw Promises

## IPC Protocol

JSON-over-newline on Unix socket. See `source/ipc.js` for message types.

Client → Daemon: `start`, `stop`, `set-mode`, `set-timer`, `status`, `subscribe`, `unsubscribe`, `shutdown`
Daemon → Client: `{ type: 'state', payload }`, `{ type: 'ok' }`, `{ type: 'error', message }`

## Constraints

- **macOS only** — `caffeinate` is a macOS built-in, no Linux/Windows support
- **TTY required** for `attach` only — all other subcommands work headless
- **Daemon auto-shuts down** after 10 min idle (no caffeinate + no clients)
- **No orphaned processes** — always verify caffeinate is killed on shutdown

## Testing

Uses Node.js built-in test runner (`node:test`) — no extra dependencies.

```bash
npm test              # all tests (unit + integration) — 55 tests
npm run test:unit     # unit tests only (ipc, state, caffeinate) — fast, ~3s
npm run test:integration  # E2E tests with real daemon — ~35s
```

### Test layout

```
tests/
├── ipc.test.js          encode/createLineParser unit tests
├── state.test.js        loadState/saveState unit tests
├── caffeinate.test.js   caffeinate process manager unit tests (real caffeinate binary)
├── integration.test.js  E2E: CLI → daemon → caffeinate full lifecycle
└── helpers/
    └── send-start.js    IPC helper for sending raw start commands with custom timers
```

### Key conventions

- Each test file is isolated via `NOSLEEP_DIR=<tmpdir>` — never touches `~/.nosleep`
- Integration tests manage their own daemon via `before`/`after` hooks per suite
- `caffeinate.test.js` uses async `afterEach` to drain exit events between tests
- macOS only — `caffeinate` binary required

### Manual smoke tests

```bash
# Full cycle
npx tsx source/cli.jsx start
pgrep -l caffeinate          # should show process
npx tsx source/cli.jsx stop
pgrep -l caffeinate          # should be empty
npx tsx source/cli.jsx shutdown

# Stale recovery
npx tsx source/cli.jsx start
kill -9 $(cat ~/.nosleep/daemon.pid)
npx tsx source/cli.jsx start  # should recover cleanly
pgrep -l caffeinate           # should show exactly one process
npx tsx source/cli.jsx shutdown
```
