import Constants from "expo-constants";

interface ExpoConfigExtra {
  clerkPublishableKey?: string;
}

export interface RuntimeConfig {
  clerkPublishableKey?: string;
}

export function getRuntimeConfig(): RuntimeConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoConfigExtra;

  const fromExtra = {
    clerkKey: extra.clerkPublishableKey,
  };
  const fromEnv = {
    clerkKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };

  const resolved = {
    clerkPublishableKey: fromExtra.clerkKey || fromEnv.clerkKey,
  };

  console.log(
    "[mobile][config] expoConfig.extra exists:",
    !!Constants.expoConfig?.extra,
  );
  console.log(
    "[mobile][config] clerkKey source:",
    fromExtra.clerkKey
      ? "expoConfig.extra"
      : fromEnv.clerkKey
        ? "process.env"
        : "MISSING",
  );
  console.log(
    "[mobile][config] clerkKey prefix:",
    resolved.clerkPublishableKey?.substring(0, 10) ?? "undefined",
  );

  return resolved;
}
