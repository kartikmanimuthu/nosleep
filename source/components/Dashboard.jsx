import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusBar } from './StatusBar.jsx';
import { ModeSelector } from './ModeSelector.jsx';
import { TimerSelector, TIMER_PRESETS } from './TimerSelector.jsx';
import { HelpBar } from './HelpBar.jsx';

const MODES = ['idle', 'display', 'system', 'all'];
const FOCUS_ROWS = ['mode', 'timer'];

function formatTime(secs) {
  if (secs === null || secs === undefined) return 'infinite';
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (secs >= 60) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${secs}s`;
}

export function Dashboard({ daemonState, onCommand, onDetach, onStopDetach }) {
  const [focusIdx, setFocusIdx] = useState(0);

  // Local "pending" selections (confirmed with Enter) — always start from daemon state
  const [pendingMode, setPendingMode] = useState(daemonState?.mode ?? 'idle');
  const [pendingTimer, setPendingTimer] = useState(daemonState?.durationSeconds ?? 0);

  const focus = FOCUS_ROWS[focusIdx];
  const active = daemonState?.active ?? false;

  // When unfocused, show committed daemon state; when focused, show pending (browsed) selection
  const displayMode  = focus === 'mode'  ? pendingMode  : (daemonState?.mode ?? 'idle');
  const displayTimer = focus === 'timer' ? pendingTimer : (daemonState?.durationSeconds ?? 0);

  useInput((input, key) => {
    // Navigation — reset pending to daemon state when switching focus rows
    if (key.upArrow || key.downArrow) {
      const dir = key.downArrow ? 1 : -1;
      const newIdx = Math.max(0, Math.min(FOCUS_ROWS.length - 1, focusIdx + dir));
      setFocusIdx(newIdx);
      setPendingMode(daemonState?.mode ?? 'idle');
      setPendingTimer(daemonState?.durationSeconds ?? 0);
      return;
    }

    // Horizontal selection
    if (key.leftArrow || key.rightArrow) {
      const dir = key.rightArrow ? 1 : -1;
      if (focus === 'mode') {
        const idx = MODES.indexOf(pendingMode);
        setPendingMode(MODES[(idx + dir + MODES.length) % MODES.length]);
      } else if (focus === 'timer') {
        const secs = TIMER_PRESETS.map(p => p.seconds);
        const idx = secs.indexOf(pendingTimer);
        setPendingTimer(secs[(idx + dir + secs.length) % secs.length]);
      }
      return;
    }

    // Confirm selection
    if (key.return) {
      if (focus === 'mode')  onCommand({ type: 'set-mode',  mode: pendingMode });
      if (focus === 'timer') onCommand({ type: 'set-timer', durationSeconds: pendingTimer });
      return;
    }

    // Toggle active
    if (input === ' ') {
      if (active) onCommand({ type: 'stop' });
      else onCommand({ type: 'start', mode: daemonState?.mode ?? 'idle', durationSeconds: daemonState?.durationSeconds ?? 0 });
      return;
    }

    // Detach
    if (input === 'q') { onDetach(); return; }

    // Stop + detach
    if (input === 'Q') { onStopDetach(); return; }
  });

  const timeDisplay = active
    ? (daemonState.remaining !== null
        ? `${formatTime(daemonState.remaining)} remaining`
        : daemonState.durationSeconds === 0
          ? 'running indefinitely'
          : `${formatTime(daemonState.elapsed)} elapsed`)
    : null;

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1} width={48}>
      <StatusBar active={active} />
      <Text dimColor>{'─'.repeat(44)}</Text>
      <Text> </Text>

      <ModeSelector selected={displayMode} focused={focus === 'mode'} />
      <TimerSelector selectedSeconds={displayTimer} focused={focus === 'timer'} />

      <Text> </Text>

      {active && (
        <Box flexDirection="column">
          <Text dimColor>  {timeDisplay}</Text>
          {daemonState.pid && <Text dimColor>  PID  {daemonState.pid}</Text>}
          <Text> </Text>
        </Box>
      )}

      <HelpBar active={active} />
    </Box>
  );
}
