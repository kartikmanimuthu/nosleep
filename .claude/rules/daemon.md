# Rules: source/daemon.js + source/ipc.js + source/client.js

IPC and daemon conventions.

- The daemon is the single source of truth — clients are read-only views + command senders
- All state mutations go through `setState(patch)` in daemon.js — never mutate `state` directly
- IPC messages are JSON-over-newline — always use `encode()` from ipc.js, never raw `JSON.stringify`
- The daemon must clean up socket + PID file on every exit path (SIGTERM, SIGINT, `process.on('exit')`)
- `cleanStale()` runs on every daemon boot — kills orphaned caffeinate PIDs from state.json
- Auto-shutdown fires after `AUTO_SHUTDOWN_IDLE` seconds with no active caffeinate and no subscribers
- `client.js` functions are stateless — each call opens and closes its own socket connection (except `subscribe`)
- Never add persistent state to `client.js` — it's a thin transport layer
