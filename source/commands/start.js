import { ensureDaemon, send } from '../client.js';

const VALID_MODES = ['idle', 'display', 'system', 'all'];
const TIMER_MAP = { '15m': 900, '30m': 1800, '1h': 3600, '2h': 7200, '4h': 14400 };

export default async function startCmd(args) {
  let mode = 'idle';
  let durationSeconds = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      mode = args[++i];
    } else if (args[i] === '--timer' && args[i + 1]) {
      const t = args[++i];
      durationSeconds = TIMER_MAP[t] ?? parseInt(t, 10) ?? 0;
    }
  }

  if (!VALID_MODES.includes(mode)) {
    console.error(`Invalid mode: ${mode}. Choose from: ${VALID_MODES.join(', ')}`);
    process.exit(1);
  }

  process.stdout.write('Starting daemon...');
  const ok = await ensureDaemon();
  if (!ok) {
    console.error('\nFailed to start daemon.');
    process.exit(1);
  }
  process.stdout.write(' done\n');

  await send({ type: 'start', mode, durationSeconds });

  const timerLabel = durationSeconds === 0
    ? 'indefinite'
    : Object.entries(TIMER_MAP).find(([, s]) => s === durationSeconds)?.[0] ?? `${durationSeconds}s`;

  console.log(`nosleep active  mode: ${mode}  timer: ${timerLabel}`);
  console.log('Run "nosleep attach" to open the interactive UI.');
}
