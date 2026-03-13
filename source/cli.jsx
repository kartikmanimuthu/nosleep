#!/usr/bin/env -S npx tsx
import React from 'react';
import { render } from 'ink';
import { App } from './app.jsx';
import { stop } from './caffeinate.js';

process.on('SIGINT',  () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
process.on('exit',    () => stop());

const { waitUntilExit } = render(<App />);
await waitUntilExit();
stop();
