# Contributing to nosleep

Thanks for taking the time to contribute!

## Getting Started

```bash
git clone https://github.com/kartikmanimuthu/nosleep.git
cd nosleep
npm install
```

Run the app:

```bash
npm start
```

## How to Contribute

### Reporting Bugs

Open an issue using the **Bug Report** template. Include:
- macOS version (`sw_vers`)
- Node.js version (`node --version`)
- Steps to reproduce
- Expected vs actual behavior
- Output of `nosleep status --json` if relevant

### Suggesting Features

Open an issue using the **Feature Request** template. Describe the use case, not just the solution.

### Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Make your changes — keep them focused and minimal
3. Test manually using the checklist in [TESTING.md](./TESTING.md)
4. Open a PR with a clear description of what and why

## Code Style

- **ESM only** — no `require()` or CommonJS
- **No TypeScript** — plain `.js` / `.jsx`
- **No new dependencies** without discussion — prefer Node built-ins
- **Minimal code** — no abstractions for one-time use
- **No comments** unless logic is genuinely non-obvious
- **Async/await** over callbacks or raw Promises

## Architecture

See [CLAUDE.md](./CLAUDE.md) for a full breakdown of the architecture, file map, and IPC protocol.

## Testing

No automated test runner. Manual verification steps are in [TESTING.md](./TESTING.md).

Run the syntax check before submitting:

```bash
npm run lint
```

## Commit Messages

Use the imperative mood and keep the subject line under 72 characters:

```
add display mode to timer selector
fix stale socket not cleaned on daemon restart
update README with background daemon section
```

## macOS Only

`nosleep` wraps the macOS-native `caffeinate` command. Linux/Windows support is out of scope.
