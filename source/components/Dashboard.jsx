import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusBar } from './StatusBar.jsx';
import { ModeSelector } from './ModeSelector.jsx';
import { TimerSelector, TIMER_PRESETS } from './TimerSelector.jsx';
import { HelpBar } from './HelpBar.jsx';

const MODES = ['idle', 'display', 'system', 'all'];
const FOCUS_ROWS = ['mode', 'timer'];

function fmt(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function Dashboard({ daemonState, onCommand, onDetach, onStopDetach }) {
  const [focusIdx, setFocusIdx] = useState(0);

  // Local "pending" selections (confirmed with Enter)
  const [pendingMode, setPendingMode] = useState(daemonState?.mode ?? 'idle');
  const [pendingTimer, setPendingTimer] = useState(daemonState?.durationSeconds ?? 0);

  const focus = FOCUS_ROWS[focusIdx];
  const active = daemonState?.active ?? false;

  useInput((input, key) => {
    // Navigation
    if (key.upArrow)   { setFocusIdx(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setFocusIdx(i => Math.min(FOCUS_ROWS.length - 1, i + 1)); return; }

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
        ? `${fmt(daemonState.remaining)} remaining`
        : `${fmt(daemonState.elapsed)} elapsed`)
    : null;

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1} width={48}>
      <StatusBar active={active} />
      <Text dimColor>{'─'.repeat(44)}</Text>
      <Text> </Text>

      <ModeSelector selected={pendingMode} focused={focus === 'mode'} />
      <TimerSelector selectedSeconds={pendingTimer} focused={focus === 'timer'} />

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
