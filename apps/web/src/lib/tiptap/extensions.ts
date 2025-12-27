import { Highlight } from "@tiptap/extension-highlight";
import { Link } from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
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
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: "tiptap-table",
    },
  }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: "task-list-item",
    },
  }),
  Highlight.configure({
    multicolor: false,
    HTMLAttributes: {
      class: "bg-yellow-200 dark:bg-yellow-800",
    },
  }),
  Placeholder.configure({
    placeholder: placeholder || "Start writing...",
  }),
];
