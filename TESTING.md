# nosleep — Testing Guide

## Architecture

The app has two testable layers:

1. **Daemon** (`source/daemon.js`) — background process, owns caffeinate, Unix socket server
2. **CLI commands** (`source/commands/`) — connect to daemon via socket, no TTY needed (except `attach`)

---

## 1. Automated Syntax Check

```bash
npm run lint
```

Checks all `.js` source files for syntax errors. Clean output: `syntax ok`.

---

## 2. Manual Test Cycle

Use the `/test` skill in Claude Code, or run manually:

```bash
# Start
npx tsx source/cli.jsx start
pgrep -l caffeinate          # must show one process

# Status
npx tsx source/cli.jsx status
npx tsx source/cli.jsx status --json

# Stop (daemon stays)
npx tsx source/cli.jsx stop
pgrep -l caffeinate          # must be empty
npx tsx source/cli.jsx status  # shows ○ inactive

# Mode + timer
npx tsx source/cli.jsx start --mode display --timer 30m
npx tsx source/cli.jsx status  # shows mode: display, ~30:00 remaining

# Shutdown (kills daemon)
npx tsx source/cli.jsx shutdown
pgrep -l caffeinate          # must be empty
npx tsx source/cli.jsx status --json  # {"running":false}
```

---

## 3. Stale Recovery Test

Use the `/test-recovery` skill in Claude Code, or run manually:

```bash
npx tsx source/cli.jsx start
kill -9 $(cat ~/.nosleep/daemon.pid)   # force-kill daemon
sleep 1
npx tsx source/cli.jsx start           # must recover cleanly
pgrep -l caffeinate                    # must show exactly ONE process
npx tsx source/cli.jsx shutdown
pgrep -l caffeinate                    # must be empty
```

---

## 4. Background Persistence Test

Verifies the daemon survives terminal close:

1. In terminal A: `npx tsx source/cli.jsx start`
2. Close terminal A entirely
3. In terminal B: `npx tsx source/cli.jsx status` → must show `● ACTIVE`
4. In terminal B: `pgrep -l caffeinate` → must show process
5. In terminal B: `npx tsx source/cli.jsx shutdown`

---

## 5. Interactive TUI Checklist

Run `npm start` (or `npx tsx source/cli.jsx attach`) in a real terminal:

### Navigation
- [ ] `↑`/`↓` moves focus between Mode and Timer rows
- [ ] `←`/`→` changes selection within focused row
- [ ] `enter` confirms selection — mode/timer updates immediately
- [ ] Status indicator top-right shows `● ACTIVE` / `○ inactive`

### Toggle
- [ ] `space` activates → status turns green, elapsed timer starts
- [ ] `space` again → deactivates, `pgrep caffeinate` shows no process

### Mode cycling
- [ ] Change mode while active → caffeinate restarts with new flags
- [ ] `nosleep status` from another terminal confirms mode change

### Timer
- [ ] Set timer, activate → countdown shows `MM:SS remaining`
- [ ] Timer expires → app shows inactive automatically

### Detach behavior
- [ ] `q` → TUI exits, `pgrep caffeinate` still shows process (daemon running)
- [ ] `Q` → TUI exits, `pgrep caffeinate` empty (caffeinate stopped)

### Cleanup
- [ ] `nosleep shutdown` → daemon exits, no orphaned processes

---

## 6. TTY Guard

```bash
echo "" | npx tsx source/cli.jsx attach
# Expected: "nosleep attach requires an interactive terminal."
```

Non-attach commands work without TTY:

```bash
echo "" | npx tsx source/cli.jsx status
# Expected: prints status normally
```

---

## 7. Headless Commands (no TTY)

These must work in scripts:

```bash
npx tsx source/cli.jsx start
npx tsx source/cli.jsx status --json
npx tsx source/cli.jsx stop
npx tsx source/cli.jsx shutdown
```

---

## 8. Unlink / Uninstall / Reinstall Cycle

Use this to verify a clean install works end-to-end, or to reset a broken local setup.

### Step 1 — Stop and unlink

```bash
# Shut down any running daemon
nosleep shutdown 2>/dev/null || true

# Confirm caffeinate is gone
pgrep -l caffeinate   # must be empty

# Remove the global npm symlink
npm unlink -g nosleep

# Confirm the command is gone
which nosleep         # must return nothing

# Remove daemon runtime files
rm -rf ~/.nosleep
```

### Step 2 — Verify clean state

```bash
which nosleep         # nothing
ls ~/.nosleep         # No such file or directory
pgrep -l caffeinate   # empty
```

### Step 3 — Reinstall

```bash
# From the repo root
npm install
npm link

# Confirm the command is back
which nosleep         # should resolve to this repo's cli.jsx
nosleep --help
```

### Step 4 — Smoke test after reinstall

```bash
nosleep start
pgrep -l caffeinate          # must show one process
nosleep status               # must show ● ACTIVE
nosleep stop
pgrep -l caffeinate          # must be empty
nosleep shutdown
```

### Diagnosing startup failures

If `nosleep` reports `Failed to start daemon`, check the daemon log:

```bash
cat ~/.nosleep/daemon.log
```

Common causes:
- `tsx` not found — run `npm install` in the repo root
- `EADDRINUSE` on the socket — stale `.sock` file; `rm ~/.nosleep/nosleep.sock` then retry
- Permission error on `~/.nosleep` — `chmod 700 ~/.nosleep`
