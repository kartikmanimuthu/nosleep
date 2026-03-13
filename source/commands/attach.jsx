import React, { useState, useEffect } from 'react';
import { render, useApp, Text } from 'ink';
import { ensureDaemon, subscribe, send } from '../client.js';
import { Dashboard } from '../components/Dashboard.jsx';

function App() {
  const { exit } = useApp();
  const [daemonState, setDaemonState] = useState(null);
  const [disconnectFn, setDisconnectFn] = useState(null);

  useEffect(() => {
    let active = true;
    subscribe(
      (state) => { if (active) setDaemonState(state); },
      () => { if (active) exit(); }
    ).then((d) => {
      if (active) setDisconnectFn(() => d);
    });
    return () => { active = false; };
  }, []);

  if (!daemonState) {
    return <Text dimColor>Connecting...</Text>;
  }

  function handleDetach() {
    disconnectFn?.();
    exit();
  }

  function handleStopDetach() {
    send({ type: 'stop' }).catch(() => {}).finally(() => {
      disconnectFn?.();
      exit();
    });
  }

  return (
    <Dashboard
      daemonState={daemonState}
      onCommand={(cmd) => send(cmd).catch(() => {})}
      onDetach={handleDetach}
      onStopDetach={handleStopDetach}
    />
  );
}

export default async function attachCmd() {
  if (!process.stdin.isTTY) {
    console.error('nosleep attach requires an interactive terminal.');
    process.exit(1);
  }

  process.stdout.write('Connecting to daemon...');
  const ok = await ensureDaemon();
  if (!ok) {
    console.error('\nFailed to start daemon.');
    process.exit(1);
  }
  process.stdout.write(' done\n');

  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
