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

The daemon stores its socket, PID, and state in `~/.nosleep/`:

```
~/.nosleep/
├── nosleep.sock    Unix domain socket (IPC)
├── daemon.pid      Daemon process ID
└── state.json      Persisted state
```

## TTY requirement

The `attach` command requires an interactive terminal. All other subcommands (`start`, `stop`, `status`, `shutdown`) work without a TTY and can be used in scripts.
