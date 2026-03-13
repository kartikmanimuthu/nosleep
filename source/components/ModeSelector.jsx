import React from 'react';
import { Box, Text } from 'ink';

const MODES = ['idle', 'display', 'system', 'all'];

export function ModeSelector({ selected, focused, onSelect }) {
  return (
    <Box>
      <Text dimColor={!focused}>Mode    </Text>
      {MODES.map((m, i) => {
        const isSelected = m === selected;
        return (
          <Box key={m} marginRight={1}>
            {isSelected && focused
              ? <Text color="cyan" bold>▸ {m}</Text>
              : isSelected
              ? <Text color="cyan">{m}</Text>
              : <Text dimColor>  {m}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
