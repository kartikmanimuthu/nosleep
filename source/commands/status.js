import { isDaemonRunning, send } from '../client.js';

function fmt(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default async function statusCmd(args) {
  const jsonMode = args.includes('--json');

  if (!(await isDaemonRunning())) {
    if (jsonMode) {
      console.log(JSON.stringify({ running: false }));
    } else {
      console.log('nosleep is not running.');
    }
    return;
  }

  const res = await send({ type: 'status' });
  const p = res.payload;

  if (jsonMode) {
    console.log(JSON.stringify(p, null, 2));
    return;
  }

  const statusLabel = p.active ? '● ACTIVE' : '○ inactive';
  const timeLabel = p.active
    ? (p.remaining !== null ? `${fmt(p.remaining)} remaining` : `${fmt(p.elapsed)} elapsed`)
    : '—';

  console.log(`\n  ☕ nosleep\n`);
  console.log(`  Status   ${statusLabel}`);
  console.log(`  Mode     ${p.mode}`);
  console.log(`  Time     ${timeLabel}`);
  if (p.pid) console.log(`  PID      ${p.pid}`);
  console.log('');
}
