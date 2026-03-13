import React from 'react';
import { Box, Text } from 'ink';

const PRESETS = [
  { label: '∞',    seconds: 0 },
  { label: '15m',  seconds: 900 },
  { label: '30m',  seconds: 1800 },
  { label: '1h',   seconds: 3600 },
  { label: '2h',   seconds: 7200 },
  { label: '4h',   seconds: 14400 },
];

export const TIMER_PRESETS = PRESETS;

export function TimerSelector({ selectedSeconds, focused }) {
  return (
    <Box>
      <Text dimColor={!focused}>Timer   </Text>
      {PRESETS.map(({ label, seconds }) => {
        const isSelected = seconds === selectedSeconds;
        return (
          <Box key={label} marginRight={1}>
            {isSelected && focused
              ? <Text color="yellow" bold>▸ {label}</Text>
              : isSelected
              ? <Text color="yellow">{label}</Text>
              : <Text dimColor>  {label}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
