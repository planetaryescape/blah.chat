/**
 * Login Command - Authenticate with blah.chat via browser OAuth
 */

import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";
import {
  getCredentials,
  saveCredentials,
  startOAuthFlow,
} from "../lib/auth.js";
import { symbols } from "../lib/terminal.js";

type LoginState = "checking" | "opening" | "waiting" | "success" | "error";

export function LoginCommand() {
  const { exit } = useApp();
  const [state, setState] = useState<LoginState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function login() {
      // Check if already logged in
      const existing = getCredentials();
      if (existing) {
        setUserName(existing.name);
        setState("success");
        setTimeout(() => exit(), 1000);
        return;
      }

      setState("opening");

      try {
        setState("waiting");
        const credentials = await startOAuthFlow();
        saveCredentials(credentials);
        setUserName(credentials.name);
        setState("success");
        setTimeout(() => exit(), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("error");
        setTimeout(() => exit(), 2000);
      }
    }

    login();
  }, [exit]);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {state === "checking" && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Checking existing credentials...</Text>
        </Box>
      )}

      {state === "opening" && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Opening browser for authentication...</Text>
        </Box>
      )}

      {state === "waiting" && (
        <Box flexDirection="column">
          <Box>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text> Waiting for authentication...</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Complete login in your browser. Times out in 5 minutes.
            </Text>
          </Box>
        </Box>
      )}

      {state === "success" && (
        <Box>
          <Text color="green">{symbols.success}</Text>
          <Text> Logged in as </Text>
          <Text bold color="cyan">
            {userName}
          </Text>
        </Box>
      )}

      {state === "error" && (
        <Box flexDirection="column">
          <Box>
            <Text color="red">{symbols.error}</Text>
            <Text color="red"> Login failed: {error}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Try again with: blah login</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
