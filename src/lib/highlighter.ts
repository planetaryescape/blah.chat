import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { HighlighterCore } from "shiki/core";

// Import themes
import githubDark from "shiki/themes/github-dark.mjs";

// Import common languages
import typescript from "shiki/langs/typescript.mjs";
import javascript from "shiki/langs/javascript.mjs";
import tsx from "shiki/langs/tsx.mjs";
import jsx from "shiki/langs/jsx.mjs";
import python from "shiki/langs/python.mjs";
import rust from "shiki/langs/rust.mjs";
import go from "shiki/langs/go.mjs";
import java from "shiki/langs/java.mjs";
import html from "shiki/langs/html.mjs";
import css from "shiki/langs/css.mjs";
import json from "shiki/langs/json.mjs";
import markdown from "shiki/langs/markdown.mjs";
import yaml from "shiki/langs/yaml.mjs";
import bash from "shiki/langs/bash.mjs";
import shell from "shiki/langs/shell.mjs";

let highlighter: HighlighterCore | null = null;

export function getHighlighter(): HighlighterCore {
  if (!highlighter) {
    highlighter = createHighlighterCoreSync({
      themes: [githubDark],
      langs: [
        typescript,
        javascript,
        tsx,
        jsx,
        python,
        rust,
        go,
        java,
        html,
        css,
        json,
        markdown,
        yaml,
        bash,
        shell,
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighter;
}

export function highlightCode(code: string, lang: string): string {
  const highlighter = getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: lang || "text",
    theme: "github-dark",
  });
}
