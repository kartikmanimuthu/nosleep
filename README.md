# ☕ nosleep

A macOS TUI app that keeps your Mac awake. Runs as a background daemon — close the terminal and it keeps running. Reconnect from any terminal to control it.
```
╭────────────────────────────────────────────────╮
│  ☕ nosleep                          ● ACTIVE  │
│────────────────────────────────────────────────│
│                                                │
│  Mode   ▸ idle   display   system   all        │
│  Timer  ▸ off   15m   30m   1h   2h   4h      │
│                                                │
│  03:42 elapsed                                 │
│  PID  12345                                    │
│                                                │
│────────────────────────────────────────────────│
│  ↑/↓ focus  ←/→ select  enter confirm         │
│  space toggle  q detach  Q stop+detach         │
╰────────────────────────────────────────────────╯
```

## Prerequisites

- macOS (uses the built-in `caffeinate` command)
- Node.js v18+

## Installation

```bash
git clone <repo-url>
cd nosleep
npm install
```

## Usage

```bash
nosleep                          # Attach to daemon (starts it if needed)
nosleep start                    # Start sleep prevention
nosleep start --mode display --timer 1h
nosleep stop                     # Stop sleep prevention (daemon stays running)
nosleep status                   # Show current status
nosleep attach                   # Open interactive TUI
nosleep shutdown                 # Stop everything and kill daemon
```

## Subcommands

| Command | Description |
|---------|-------------|
| `nosleep` | Attach to daemon, start it if not running |
| `nosleep start [--mode M] [--timer T]` | Activate sleep prevention |
| `nosleep stop` | Deactivate (daemon stays alive) |
| `nosleep status [--json]` | Print current state |
| `nosleep attach` | Open interactive TUI |
| `nosleep shutdown` | Kill daemon entirely |

## Modes

| Mode | What it prevents |
|------|-----------------|
| `idle` | System sleeping when idle (default) |
| `display` | Display/screen turning off |
| `system` | System sleep entirely (AC power only) |
| `all` | All of the above + simulates user activity |

## Timer presets

`off` (default) · `15m` · `30m` · `1h` · `2h` · `4h`

## Interactive TUI


| Key | Action |
|-----|--------|
| `↑` / `↓` | Move focus between Mode and Timer rows |
| `←` / `→` | Change selection |
| `enter` | Confirm selection (applies immediately) |
| `space` | Toggle sleep prevention on/off |
| `q` | Detach from TUI (daemon + caffeinate keep running) |
| `Q` | Stop caffeinate then detach |

## Background daemon

The daemon runs independently of your terminal. Once started, you can:

- Close the terminal — caffeinate keeps running
- Open a new terminal and run `nosleep status` to check state
- Run `nosleep attach` to reconnect the interactive TUI
- Run `nosleep shutdown` to kill the daemon entirely

The daemon auto-shuts down after 10 minutes of inactivity (no caffeinate running, no clients connected).

State is persisted to `~/.nosleep/state.json`.

## Verify it's working

```bash
pgrep -l caffeinate
```

While active you'll see the caffeinate process. After stopping, it's gone.

## Foreground vs background

| Scenario | Sleep prevention |
|----------|-----------------|
| `nosleep start` then close terminal | ✓ Still active |
| `nosleep attach` then press `q` | ✓ Still active |
| `nosleep stop` | ✗ Stopped (daemon alive) |
| `nosleep shutdown` | ✗ Stopped (daemon killed) |
