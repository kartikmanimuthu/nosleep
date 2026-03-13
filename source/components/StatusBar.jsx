import React from 'react';
import { Box, Text } from 'ink';

export function StatusBar({ active }) {
  return (
    <Box justifyContent="space-between">
      <Text bold>☕ nosleep</Text>
      <Text color={active ? 'green' : 'gray'} bold>
        {active ? '● ACTIVE' : '○ inactive'}
      </Text>
    </Box>
  );
}
