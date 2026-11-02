"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  CheckSquare,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo,
  Sigma,
  Table as TableIcon,
  TableProperties,
  Trash2,
  Undo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NoteToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  shortcut?: string;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  isActive,
  icon,
  tooltip,
  shortcut,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={`h-8 w-8 p-0 ${isActive ? "bg-muted" : ""}`}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          <span>{tooltip}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">
              {shortcut}
            </kbd>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function NoteToolbar({ editor }: NoteToolbarProps) {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addMath = () => {
    const latex = window.prompt("Enter LaTeX formula (e.g., E = mc^2):");
    if (latex) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "mathematics",
          attrs: {
            latex,
          },
        })
        .run();
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 border-b border-border p-2 flex-wrap">
        {/* Formatting */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            icon={<Bold className="h-4 w-4" />}
            tooltip="Bold"
            shortcut="⌘B"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            icon={<Italic className="h-4 w-4" />}
            tooltip="Italic"
            shortcut="⌘I"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            icon={<Code className="h-4 w-4" />}
            tooltip="Code"
            shortcut="⌘E"
          />
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editor.isActive("heading", { level: 1 })}
            icon={<Heading1 className="h-4 w-4" />}
            tooltip="Heading 1"
            shortcut="⌘⌥1"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editor.isActive("heading", { level: 2 })}
            icon={<Heading2 className="h-4 w-4" />}
            tooltip="Heading 2"
            shortcut="⌘⌥2"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={editor.isActive("heading", { level: 3 })}
            icon={<Heading3 className="h-4 w-4" />}
            tooltip="Heading 3"
            shortcut="⌘⌥3"
          />
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            icon={<List className="h-4 w-4" />}
            tooltip="Bullet List"
            shortcut="⌘⇧8"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            icon={<ListOrdered className="h-4 w-4" />}
            tooltip="Ordered List"
            shortcut="⌘⇧7"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            icon={<CheckSquare className="h-4 w-4" />}
            tooltip="Task List"
          />
        </div>

        {/* Insert */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolbarButton
            onClick={addLink}
            isActive={editor.isActive("link")}
            icon={<LinkIcon className="h-4 w-4" />}
            tooltip="Add Link"
            shortcut="⌘K"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            icon={<Code2 className="h-4 w-4" />}
            tooltip="Code Block"
            shortcut="⌘⌥C"
          />
          <ToolbarButton
            onClick={addMath}
            isActive={editor.isActive("mathematics")}
            icon={<Sigma className="h-4 w-4" />}
            tooltip="Math/LaTeX"
            shortcut="⌘M"
          />
        </div>

        {/* Table Operations */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolbarButton
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            icon={<TableIcon className="h-4 w-4" />}
            tooltip="Insert Table (3×3)"
          />
          {editor.isActive("table") && (
            <>
              <ToolbarButton
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                icon={<TableProperties className="h-4 w-4" />}
                tooltip="Add Column Before"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().addRowAfter().run()}
                icon={<TableProperties className="h-4 w-4 rotate-90" />}
                tooltip="Add Row After"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteTable().run()}
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
                tooltip="Delete Table"
              />
            </>
          )}
        </div>

        {/* History */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            icon={<Undo className="h-4 w-4" />}
            tooltip="Undo"
            shortcut="⌘Z"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            icon={<Redo className="h-4 w-4" />}
            tooltip="Redo"
            shortcut="⌘⇧Z"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
