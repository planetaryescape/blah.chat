/**
 * Whoami Command - Show current user info
 */

import { Box, Text, useApp } from "ink";
import { useEffect } from "react";
import { getConfigPath, getCredentials } from "../lib/auth.js";
import { formatRelativeTime, symbols } from "../lib/terminal.js";

export function WhoamiCommand() {
  const { exit } = useApp();
  const credentials = getCredentials();

  useEffect(() => {
    setTimeout(() => exit(), 100);
  }, [exit]);

  if (!credentials) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Box>
          <Text color="yellow">{symbols.warning}</Text>
          <Text color="yellow"> Not logged in</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run: </Text>
          <Text>blah login</Text>
        </Box>
      </Box>
    );
  }

  const createdAt = formatRelativeTime(credentials.createdAt);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box>
        <Text color="green">{symbols.success}</Text>
        <Text> Logged in</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Box width={10}>
            <Text dimColor>User:</Text>
          </Box>
          <Text bold>{credentials.name}</Text>
        </Box>

        <Box>
          <Box width={10}>
            <Text dimColor>Email:</Text>
          </Box>
          <Text>{credentials.email}</Text>
        </Box>

        <Box>
          <Box width={10}>
            <Text dimColor>API Key:</Text>
          </Box>
          <Text dimColor>{credentials.keyPrefix}</Text>
        </Box>

        <Box>
          <Box width={10}>
            <Text dimColor>Created:</Text>
          </Box>
          <Text dimColor>{createdAt}</Text>
        </Box>

        <Box marginTop={1}>
          <Box width={10}>
            <Text dimColor>Config:</Text>
          </Box>
          <Text dimColor>{getConfigPath()}</Text>
        </Box>
      </Box>
    </Box>
  );
}
