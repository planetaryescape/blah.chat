import { loadConfig } from "../config";
import { parseCommonFlags } from "../utils/cli";
import { generateConversations, loadConversations } from "./conversations";
import { generatePersonas } from "./personas";
import { generateQuestions } from "./questions";

async function main() {
  const flags = parseCommonFlags(process.argv.slice(2));
  const cfg = loadConfig();
  const count = flags.sample ?? cfg.sizes.personas;

  const personas = await generatePersonas({
    count,
    force: flags.force,
    dryRun: flags.dryRun,
  });

  await generateConversations({
    personas,
    sessionsPerPersona: cfg.sizes.sessionsPerPersona,
    force: flags.force,
    dryRun: flags.dryRun,
  });

  for (const persona of personas) {
    const convs = loadConversations(persona.id);
    if (convs.length === 0)
      throw new Error(`No conversations for ${persona.id}`);
    await generateQuestions({
      persona,
      conversations: convs,
      force: flags.force,
      dryRun: flags.dryRun,
    });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
