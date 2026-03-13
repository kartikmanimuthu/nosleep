#!/usr/bin/env -S npx tsx
import startCmd    from './commands/start.js';
import stopCmd     from './commands/stop.js';
import statusCmd   from './commands/status.js';
import attachCmd   from './commands/attach.jsx';
import { isDaemonRunning, send } from './client.js';

const [command, ...args] = process.argv.slice(2);

function printHelp() {
  console.log(`
  ☕ nosleep — keep your Mac awake

  Usage:
    nosleep                          Attach to daemon (start if needed)
    nosleep start [options]          Start sleep prevention
    nosleep stop                     Stop sleep prevention (daemon stays)
    nosleep status [--json]          Show current status
    nosleep attach                   Open interactive TUI
    nosleep shutdown                 Stop everything and kill daemon

  Start options:
    --mode  idle|display|system|all  Sleep prevention mode (default: idle)
    --timer 15m|30m|1h|2h|4h        Auto-stop after duration (default: off)

  Modes:
    idle      Prevent idle sleep (default)
    display   Keep display on
    system    Prevent system sleep (AC power only)
    all       All of the above + simulate user activity

  Examples:
    nosleep start
    nosleep start --mode display --timer 1h
    nosleep status
    nosleep stop
`);
}

switch (command) {
  case 'start':
    await startCmd(args);
    break;
  case 'stop':
    await stopCmd();
    break;
  case 'status':
    await statusCmd(args);
    break;
  case 'attach':
    await attachCmd();
    break;
  case 'shutdown': {
    if (!(await isDaemonRunning())) {
      console.log('nosleep is not running.');
    } else {
      await send({ type: 'shutdown' });
      console.log('nosleep daemon shut down.');
    }
    break;
  }
  case '--help':
  case '-h':
    printHelp();
    break;
  case undefined:
    // bare `nosleep` → attach (starts daemon if needed)
    await attachCmd();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
