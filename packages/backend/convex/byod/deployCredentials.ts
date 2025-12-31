"use node";

import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { decryptCredential } from "../lib/encryption";

interface DeployCredential {
  configId: string;
  userId: string;
  deploymentUrl: string;
  deployKey: string;
}

/**
 * Get decrypted credentials for all connected BYOD instances
 * Used by HTTP endpoint for GHA deployment
 */
export const getDecryptedCredentials = internalAction({
  args: {},
  handler: async (ctx): Promise<DeployCredential[]> => {
    // Get all connected configs
    const configs = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.byod.credentials.getConnectedConfigs,
      {},
    )) as Doc<"userDatabaseConfig">[];

    // Decrypt credentials for each
    const credentials = await Promise.all(
      configs.map(async (config) => {
        const [urlIv, keyIv] = config.encryptionIV.split(":");
        const [urlAuthTag, keyAuthTag] = config.authTags.split(":");

        const deploymentUrl = await decryptCredential(
          config.encryptedDeploymentUrl,
          urlIv,
          urlAuthTag,
        );
        const deployKey = await decryptCredential(
          config.encryptedDeployKey,
          keyIv,
          keyAuthTag,
        );

        return {
          configId: config._id,
          userId: config.userId,
          deploymentUrl,
          deployKey,
        };
      }),
    );

    return credentials;
  },
});
