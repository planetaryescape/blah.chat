/**
 * Notes Command - View and create notes
 */

import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  createNote,
  deleteNote,
  listNotes,
  type Note,
  updateNote,
} from "./lib/api";
import { getApiKey, getClient } from "./lib/client";

export default function Command() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const client = getClient();
      const apiKey = getApiKey();
      const result = await listNotes(client, apiKey, { limit: 100 });
      if (result) {
        setNotes(result);
      } else {
        setError("Invalid API key");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleDelete = async (note: Note) => {
    const confirmed = await confirmAlert({
      title: "Delete Note?",
      message: `Are you sure you want to delete "${note.title}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      const client = getClient();
      const apiKey = getApiKey();
      await deleteNote(client, apiKey, note._id);
      showToast({ style: Toast.Style.Success, title: "Note deleted" });
      loadNotes();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete note",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const client = getClient();
      const apiKey = getApiKey();
      await updateNote(client, apiKey, {
        noteId: note._id,
        isPinned: !note.isPinned,
      });
      showToast({
        style: Toast.Style.Success,
        title: note.isPinned ? "Unpinned" : "Pinned",
      });
      loadNotes();
    } catch (_e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update note",
      });
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search notes...">
      {notes.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Notes"
          description="Your notes will appear here. Create one to get started!"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Note"
                icon={Icon.Plus}
                target={<CreateNoteForm onCreated={loadNotes} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        notes.map((note) => (
          <List.Item
            key={note._id}
            title={note.title}
            subtitle={note.content.slice(0, 100).replace(/\n/g, " ")}
            icon={
              note.isPinned
                ? { source: Icon.Pin, tintColor: Color.Yellow }
                : Icon.Document
            }
            accessories={[
              ...(note.tags?.length
                ? [{ tag: { value: note.tags[0], color: Color.Blue } }]
                : []),
              { date: new Date(note.updatedAt) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Note"
                    icon={Icon.Eye}
                    target={<NoteDetail note={note} onUpdate={loadNotes} />}
                  />
                  <Action
                    title={note.isPinned ? "Unpin" : "Pin"}
                    icon={Icon.Pin}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => handleTogglePin(note)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Note"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<CreateNoteForm onCreated={loadNotes} />}
                  />
                  <Action.Push
                    title="Edit Note"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditNoteForm note={note} onUpdated={loadNotes} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Copy Content"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => {
                      Clipboard.copy(note.content);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Copied!",
                      });
                    }}
                  />
                  <Action
                    title="Open in Browser"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => open(`https://blah.chat/notes/${note._id}`)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Note"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(note)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function NoteDetail({ note, onUpdate }: { note: Note; onUpdate: () => void }) {
  const handleCopy = () => {
    Clipboard.copy(note.content);
    showToast({ style: Toast.Style.Success, title: "Copied!" });
  };

  const markdown = `# ${note.title}

${note.content}

---

${note.isPinned ? "**Pinned**" : ""}
${note.tags?.length ? `**Tags:** ${note.tags.join(", ")}` : ""}

_Updated: ${new Date(note.updatedAt).toLocaleString()}_
_Created: ${new Date(note.createdAt).toLocaleString()}_
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Note"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditNoteForm note={note} onUpdated={onUpdate} />}
          />
          <Action
            title="Copy Content"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={handleCopy}
          />
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => open(`https://blah.chat/notes/${note._id}`)}
          />
        </ActionPanel>
      }
    />
  );
}

function CreateNoteForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { title: string; content: string }) => {
    if (!values.content.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Content required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const client = getClient();
      const apiKey = getApiKey();
      await createNote(client, apiKey, {
        content: values.content.trim(),
        title: values.title.trim() || undefined,
      });
      showToast({ style: Toast.Style.Success, title: "Note created" });
      onCreated();
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create note",
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Optional - auto-generated from content"
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Write your note... (Markdown supported)"
        autoFocus
        enableMarkdown
      />
    </Form>
  );
}

function EditNoteForm({
  note,
  onUpdated,
}: {
  note: Note;
  onUpdated: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { title: string; content: string }) => {
    if (!values.content.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Content required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const client = getClient();
      const apiKey = getApiKey();
      await updateNote(client, apiKey, {
        noteId: note._id,
        title: values.title.trim() || undefined,
        content: values.content.trim(),
      });
      showToast({ style: Toast.Style.Success, title: "Note updated" });
      onUpdated();
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update note",
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={note.title} />
      <Form.TextArea
        id="content"
        title="Content"
        defaultValue={note.content}
        autoFocus
        enableMarkdown
      />
    </Form>
  );
}
