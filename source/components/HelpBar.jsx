import React from 'react';
import { Box, Text } from 'ink';

export function HelpBar({ active }) {
  return (
    <Box flexDirection="column">
      <Text dimColor>{'─'.repeat(44)}</Text>
      <Box justifyContent="space-between">
        <Text dimColor>↑/↓ focus  ←/→ select  enter confirm</Text>
        <Text dimColor>space toggle</Text>
      </Box>
      <Text dimColor>q detach  Q stop+detach  ? help</Text>
    </Box>
  );
}
