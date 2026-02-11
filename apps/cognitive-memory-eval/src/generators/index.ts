import { loadConfig } from "../config";
import { parseCommonFlags } from "../utils/cli";
import { counter, log, logBlank } from "../utils/log";
import { generateConversations, loadConversations } from "./conversations";
import { generatePersonas } from "./personas";
import { generateQuestions } from "./questions";

async function main() {
  const flags = parseCommonFlags(process.argv.slice(2));
  const cfg = loadConfig();
  const count = flags.sample ?? cfg.sizes.personas;

  log(
    `gen start sample=${flags.sample ?? "all"} force=${flags.force} dryRun=${flags.dryRun}`,
  );

  const personas = await generatePersonas({
    count,
    force: flags.force,
    dryRun: flags.dryRun,
  });

  log(`personas=${personas.length}`);
  await generateConversations({
    personas,
    sessionsPerPersona: cfg.sizes.sessionsPerPersona,
    force: flags.force,
    dryRun: flags.dryRun,
  });

  logBlank();
  const qCounter = counter("questions", personas.length);
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
    qCounter.tick(persona.id);
  }

  log("gen done");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
