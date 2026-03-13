import { isDaemonRunning, send } from '../client.js';

export default async function stopCmd() {
  if (!(await isDaemonRunning())) {
    console.log('nosleep is not running.');
    return;
  }
  await send({ type: 'stop' });
  console.log('nosleep stopped. (Daemon still running — use "nosleep shutdown" to kill it.)');
}
