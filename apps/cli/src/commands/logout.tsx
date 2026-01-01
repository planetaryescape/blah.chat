/**
 * Logout Command - Clear stored credentials
 */

import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";
import { clearCredentials, getCredentials } from "../lib/auth.js";
import { clearClient } from "../lib/client.js";
import { symbols } from "../lib/terminal.js";

export function LogoutCommand() {
  const { exit } = useApp();
  const [wasLoggedIn, setWasLoggedIn] = useState(false);

  useEffect(() => {
    const existing = getCredentials();
    setWasLoggedIn(existing !== null);

    if (existing) {
      clearCredentials();
      clearClient();
    }

    setTimeout(() => exit(), 500);
  }, [exit]);

  return (
    <Box paddingX={1} paddingY={1}>
      {wasLoggedIn ? (
        <>
          <Text color="green">{symbols.success}</Text>
          <Text> Logged out successfully</Text>
        </>
      ) : (
        <Text dimColor>Not logged in</Text>
      )}
    </Box>
  );
}
