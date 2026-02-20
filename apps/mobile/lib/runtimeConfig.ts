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

  return {
    clerkPublishableKey:
      extra.clerkPublishableKey ||
      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    convexUrl: extra.convexUrl || process.env.EXPO_PUBLIC_CONVEX_URL,
  };
}
