# nosleep — Local Setup Guide

A TUI app that prevents your Mac from sleeping, built with React Ink.

## Prerequisites

- macOS (uses the built-in `caffeinate` command)
- Node.js v18 or later — check with `node --version`

## Installation

```bash
git clone <repo-url>
cd nosleep
npm install
```

## Running the App

```bash
npm start
```

The app opens directly in your terminal. It needs an interactive TTY — run it in a real terminal (Terminal.app, iTerm2, etc.), not inside a script or CI environment.

## Usage

```
╭────────────────────────────────────────╮
│                                        │
│  ☕ nosleep                             │
│                                        │
│  Status:  ○ inactive                   │
│  Mode:    idle                         │
│                                        │
│  [space] toggle  [m] mode  [q] quit    │
│  [t] timer: off  [c] clear timer       │
│                                        │
╰────────────────────────────────────────╯
```

| Key | Action |
|-----|--------|
| `space` | Toggle sleep prevention on/off |
| `m` | Cycle mode: idle → display → system → all |
| `t` | Cycle timer preset: off → 15m → 30m → 1h → 2h → 4h |
| `c` | Clear timer (back to indefinite) |
| `q` | Quit |
| `Ctrl+C` | Quit |

## Modes

| Mode | What it prevents |
|------|-----------------|
| `idle` | System sleeping when idle (default) |
| `display` | Display/screen turning off |
| `system` | System sleep entirely (AC power only) |
| `all` | All of the above + simulates user activity |

## Verifying It Works

While the app is active, open another terminal and run:

```bash
pgrep -l caffeinate
```

You should see a `caffeinate` process. After quitting the app, run it again — the process should be gone.
