import { Link } from "@tiptap/extension-link";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extension-placeholder";
import { StarterKit } from "@tiptap/starter-kit";

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
    bulletList: {
      HTMLAttributes: {
        class: "list-disc list-inside space-y-1",
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal list-inside space-y-1",
      },
    },
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
  Placeholder.configure({
    placeholder: placeholder || "Start writing...",
  }),
];
