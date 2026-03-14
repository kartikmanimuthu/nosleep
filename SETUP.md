# nosleep — Local Setup Guide

A TUI app that prevents your Mac from sleeping, built with React Ink. Runs as a background daemon.

## Prerequisites

- macOS (uses the built-in `caffeinate` command)
- Node.js v18 or later — check with `node --version`

## Installation

```bash
git clone <repo-url>
cd nosleep
npm install
```

## Running

```bash
npm start              # same as: nosleep attach (starts daemon if needed)
```

Or use subcommands directly:

```bash
npx tsx source/cli.jsx start
npx tsx source/cli.jsx status
npx tsx source/cli.jsx stop
npx tsx source/cli.jsx shutdown
```

## Config directory

The daemon stores its socket, PID, state, and logs in `~/.nosleep/`:

```
~/.nosleep/
├── nosleep.sock    Unix domain socket (IPC)
├── daemon.pid      Daemon process ID
├── state.json      Persisted state
└── daemon.log      Daemon stderr log (useful for diagnosing startup failures)
```

## TTY requirement

The `attach` command requires an interactive terminal. All other subcommands (`start`, `stop`, `status`, `shutdown`) work without a TTY and can be used in scripts.

---

## Unlink / Uninstall

### If installed via `npm link` (dev workflow)

```bash
# Stop any running daemon first
nosleep shutdown 2>/dev/null || true

# Remove the global symlink
npm unlink -g nosleep

# Verify it's gone
which nosleep   # should return nothing
```

### If installed via `install.sh` (production install)

```bash
# Stop any running daemon first
nosleep shutdown 2>/dev/null || true

# Remove the symlink created by install.sh
sudo rm -f /usr/local/bin/nosleep

# Remove the cloned source (optional — deletes everything)
rm -rf ~/.nosleep-src

# Remove daemon runtime files
rm -rf ~/.nosleep
```

---

## Reinstall

### Dev workflow (npm link)

```bash
# From the repo root
npm install
npm link

# Verify
which nosleep          # should point to this repo
nosleep --help
```

### Production (install.sh)

```bash
# Re-run the installer — it will git pull if the source dir already exists
curl -fsSL https://raw.githubusercontent.com/kartikmanimuthu/nosleep/main/install.sh | bash

# Or if you have the repo locally
bash install.sh
```
