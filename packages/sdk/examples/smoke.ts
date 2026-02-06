import { createBlahClient } from "../src/index";

async function main() {
  const client = createBlahClient({
    baseUrl: process.env.BLAH_API_BASE_URL || "https://blah.chat",
    apiKey: process.env.BLAH_API_KEY,
  });

  await client.cliRpc("validateApiKey", undefined);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
