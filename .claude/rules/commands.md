# Rules: source/commands/

Conventions for CLI command handlers.

- Each command is a `default` async function export
- Commands that don't need a TTY (`start`, `stop`, `status`) must work headless — no Ink, no `process.stdin.isTTY` check
- `attach.jsx` is the only command that renders Ink — it must guard with `process.stdin.isTTY`
- Always call `ensureDaemon()` before connecting in `start` and `attach`
- For `stop`/`status`/`shutdown`: check `isDaemonRunning()` first, print a friendly message and exit 0 if not running — never throw
- Exit codes: 0 = success or graceful "not running", 1 = actual error
- Output style: lowercase, no punctuation flourishes — e.g. `nosleep active  mode: idle` not `✅ nosleep is now ACTIVE!`
