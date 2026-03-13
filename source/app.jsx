import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { start, stop, emitter } from './caffeinate.js';

const MODES = ['idle', 'display', 'system', 'all'];
const TIMER_PRESETS = [0, 15, 30, 60, 120, 240]; // minutes; 0 = indefinite

function fmt(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function App() {
  const { exit } = useApp();
  const [active, setActive]     = useState(false);
  const [modeIdx, setModeIdx]   = useState(0);
  const [timerIdx, setTimerIdx] = useState(0);
  const [elapsed, setElapsed]   = useState(0);
  const [remaining, setRemaining] = useState(null);

  const mode      = MODES[modeIdx];
  const timerMins = TIMER_PRESETS[timerIdx];

  function doStart(m, mins) {
    start(m, mins > 0 ? mins * 60 : 0);
    setActive(true);
    setElapsed(0);
    setRemaining(mins > 0 ? mins * 60 : null);
  }

  function doStop() {
    stop();
    setActive(false);
    setElapsed(0);
    setRemaining(null);
  }

  // React to caffeinate self-terminating (timer expiry)
  useEffect(() => {
    const onStopped = () => {
      setActive(false);
      setElapsed(0);
      setRemaining(null);
    };
    emitter.on('stopped', onStopped);
    return () => emitter.off('stopped', onStopped);
  }, []);

  // Tick elapsed / countdown while active
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setElapsed(e => e + 1);
      setRemaining(r => r === null ? null : Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  useInput((input, key) => {
    if (input === ' ') {
      active ? doStop() : doStart(mode, timerMins);
    } else if (input === 'm') {
      const next = (modeIdx + 1) % MODES.length;
      setModeIdx(next);
      if (active) doStart(MODES[next], timerMins);
    } else if (input === 't') {
      const next = (timerIdx + 1) % TIMER_PRESETS.length;
      setTimerIdx(next);
      if (active) doStart(mode, TIMER_PRESETS[next]);
    } else if (input === 'c') {
      setTimerIdx(0);
      if (active) doStart(mode, 0);
    } else if (input === 'q') {
      doStop();
      exit();
    }
  });

  const timerLabel = timerMins === 0
    ? 'off'
    : timerMins >= 60 ? `${timerMins / 60}h` : `${timerMins}m`;

  const timeDisplay = remaining !== null
    ? `Timer: ${fmt(remaining)} remaining`
    : `Elapsed: ${fmt(elapsed)}`;

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1} width={42}>
      <Text bold>☕ nosleep</Text>
      <Text> </Text>
      <Text>Status:  <Text color={active ? 'green' : 'gray'}>{active ? '● ACTIVE' : '○ inactive'}</Text></Text>
      <Text>Mode:    <Text color="cyan">{mode}</Text></Text>
      {active && <Text dimColor>         {timeDisplay}</Text>}
      <Text> </Text>
      <Text dimColor>[space] toggle  [m] mode  [q] quit</Text>
      <Text dimColor>[t] timer: {timerLabel}  [c] clear timer</Text>
    </Box>
  );
}
