export type FeatureFlags = {
  canvas: boolean;
  adminFull: boolean;
};

export function readFeatureFlags(
  env: NodeJS.ProcessEnv = process.env,
): FeatureFlags {
  return {
    canvas: env.NEXT_PUBLIC_FF_CANVAS === "true",
    adminFull: env.NEXT_PUBLIC_FF_ADMIN_FULL === "true",
  };
}

export const featureFlags = readFeatureFlags();
