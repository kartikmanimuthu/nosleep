#!/usr/bin/env -S npx tsx
import React from 'react';
import { render } from 'ink';
import { App } from './app.jsx';
import { stop } from './caffeinate.js';

if (!process.stdin.isTTY) {
  console.error('nosleep requires an interactive terminal. Run it directly in your terminal, not inside a script.');
  process.exit(1);
}

process.on('SIGINT',  () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
process.on('exit',    () => stop());

const { waitUntilExit } = render(<App />);
await waitUntilExit();
stop();
