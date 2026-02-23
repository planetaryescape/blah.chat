import Constants from "expo-constants";

interface ExpoConfigExtra {
  clerkPublishableKey?: string;
  convexUrl?: string;
}

export interface RuntimeConfig {
  clerkPublishableKey?: string;
  convexUrl?: string;
}

export function getRuntimeConfig(): RuntimeConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoConfigExtra;

  const fromExtra = {
    clerkKey: extra.clerkPublishableKey,
    convexUrl: extra.convexUrl,
  };
  const fromEnv = {
    clerkKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
  };

  const resolved = {
    clerkPublishableKey: fromExtra.clerkKey || fromEnv.clerkKey,
    convexUrl: fromExtra.convexUrl || fromEnv.convexUrl,
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
  console.log(
    "[mobile][config] convexUrl source:",
    fromExtra.convexUrl
      ? "expoConfig.extra"
      : fromEnv.convexUrl
        ? "process.env"
        : "MISSING",
  );
  console.log("[mobile][config] convexUrl:", resolved.convexUrl ?? "undefined");

  return resolved;
}
