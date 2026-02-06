import type { ConvexClient } from "convex/browser";
import { onCleanup } from "solid-js";
import { getCredentials } from "../lib/auth.js";
import { closeConvexClient, getConvexClient } from "../lib/convex-client.js";
import { createSimpleContext } from "./context-helper.js";

interface ConvexContextValue {
  client: ConvexClient;
  apiKey: string;
}

export const { provider: ConvexProvider, use: useConvex } = createSimpleContext<
  ConvexContextValue,
  Record<string, never>
>({
  name: "Convex",
  init: () => {
    const credentials = getCredentials();
    if (!credentials) {
      throw new Error("Not logged in. Run: blah login");
    }

    const client = getConvexClient();

    onCleanup(() => {
      closeConvexClient();
    });

    return {
      client,
      apiKey: credentials.apiKey,
    };
  },
});
