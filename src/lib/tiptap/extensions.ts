import { Link } from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extension-placeholder";
import { StarterKit } from "@tiptap/starter-kit";
import "katex/dist/katex.min.css";

export const createExtensions = (placeholder?: string) => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: {
      HTMLAttributes: {
        class: "rounded-lg bg-muted p-4 font-mono text-sm",
      },
    },
    // Lists: rely on prose defaults, no custom classes needed
  }),
  Markdown.configure({
    markedOptions: {
      gfm: true, // GitHub Flavored Markdown
      breaks: false, // Don't convert \n to <br>
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: "text-blue-500 underline hover:text-blue-600",
    },
  }),
  Mathematics.configure({
    katexOptions: {
      throwOnError: false,
      errorColor: "hsl(var(--destructive))",
      output: "mathml",
      strict: "warn",
    },
  }),
  Placeholder.configure({
    placeholder: placeholder || "Start writing...",
  }),
];
