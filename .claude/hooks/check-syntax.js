#!/usr/bin/env node
// PostToolUse hook: runs `node --check` on any .js/.jsx file that was just edited/written.
// Claude Code passes the tool input as JSON on stdin.

import { createInterface } from 'node:readline';
import { execSync } from 'node:child_process';

let raw = '';
const rl = createInterface({ input: process.stdin });
rl.on('line', l => raw += l);
rl.on('close', () => {
  try {
    const input = JSON.parse(raw);
    const file = input.file_path ?? input.path;
    if (!file || !file.match(/\.(js|jsx)$/)) process.exit(0);
    execSync(`node --check "${file}"`, { stdio: 'inherit' });
  } catch (e) {
    if (e.status) process.exit(e.status);
  }
});
