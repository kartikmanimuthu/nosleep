// Helper: ensures daemon is running and sends a start command with 2-second timer.
// Used by integration test to verify natural timer expiry doesn't trigger auto-restart.
import { ensureDaemon, send } from '../../source/client.js';

const ok = await ensureDaemon();
if (!ok) { console.error('daemon failed to start'); process.exit(1); }
await send({ type: 'start', mode: 'idle', durationSeconds: 2 });
console.log('sent start with 2s timer');
