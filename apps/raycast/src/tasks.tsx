/**
 * Tasks Command - Manage your tasks
 */

import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  open,
  showToast,
  Toast,
  Form,
  useNavigation,
  Detail,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getClient, getApiKey } from "./lib/client";
import {
  listTasks,
  createTask,
  completeTask,
  deleteTask,
  updateTask,
  type Task,
} from "./lib/api";

type StatusFilter = "all" | "active" | "completed";

const URGENCY_COLORS: Record<string, Color> = {
  low: Color.Green,
  medium: Color.Yellow,
  high: Color.Orange,
  urgent: Color.Red,
};

const STATUS_ICONS: Record<string, Icon> = {
  suggested: Icon.LightBulb,
  confirmed: Icon.Circle,
  in_progress: Icon.Clock,
  completed: Icon.CheckCircle,
  cancelled: Icon.XMarkCircle,
};

function formatDeadline(deadline: number): string {
  const now = Date.now();
  const diff = deadline - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days}d`;
  return new Date(deadline).toLocaleDateString();
}

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const client = getClient();
      const apiKey = getApiKey();
      const result = await listTasks(client, apiKey, { limit: 100 });
      if (result) {
        setTasks(result);
      } else {
        setError("Invalid API key");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleComplete = async (task: Task) => {
    try {
      const client = getClient();
      const apiKey = getApiKey();
      await completeTask(client, apiKey, task._id);
      showToast({ style: Toast.Style.Success, title: "Task completed" });
      loadTasks();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleDelete = async (task: Task) => {
    const confirmed = await confirmAlert({
      title: "Delete Task?",
      message: `Are you sure you want to delete "${task.title}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      const client = getClient();
      const apiKey = getApiKey();
      await deleteTask(client, apiKey, task._id);
      showToast({ style: Toast.Style.Success, title: "Task deleted" });
      loadTasks();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") {
      return !["completed", "cancelled"].includes(task.status);
    }
    return task.status === "completed";
  });

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
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Completed" value="completed" />
          <List.Dropdown.Item title="All" value="all" />
        </List.Dropdown>
      }
    >
      {filteredTasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Tasks"
          description={
            statusFilter === "active"
              ? "No active tasks. Create one to get started!"
              : "No tasks found"
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Task"
                icon={Icon.Plus}
                target={<CreateTaskForm onCreated={loadTasks} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredTasks.map((task) => (
          <List.Item
            key={task._id}
            title={task.title}
            subtitle={task.description}
            icon={{
              source: STATUS_ICONS[task.status] || Icon.Circle,
              tintColor:
                task.status === "completed" ? Color.Green : Color.PrimaryText,
            }}
            accessories={[
              ...(task.urgency
                ? [
                    {
                      tag: {
                        value: task.urgency,
                        color: URGENCY_COLORS[task.urgency],
                      },
                    },
                  ]
                : []),
              ...(task.deadline
                ? [{ text: formatDeadline(task.deadline), icon: Icon.Calendar }]
                : []),
              ...(task.status !== "completed"
                ? [{ tag: task.status.replace("_", " ") }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={<TaskDetail task={task} onUpdate={loadTasks} />}
                  />
                  {task.status !== "completed" && (
                    <Action
                      title="Mark Complete"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={() => handleComplete(task)}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Task"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<CreateTaskForm onCreated={loadTasks} />}
                  />
                  <Action.Push
                    title="Edit Task"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditTaskForm task={task} onUpdated={loadTasks} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Open in Browser"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => open("https://blah.chat/tasks")}
                  />
                  <Action
                    title="Delete Task"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(task)}
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

function TaskDetail({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const { pop } = useNavigation();

  const handleComplete = async () => {
    try {
      const client = getClient();
      const apiKey = getApiKey();
      await completeTask(client, apiKey, task._id);
      showToast({ style: Toast.Style.Success, title: "Task completed" });
      onUpdate();
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
      });
    }
  };

  const markdown = `# ${task.title}

${task.description || "_No description_"}

---

**Status:** ${task.status.replace("_", " ")}
${task.urgency ? `**Urgency:** ${task.urgency}` : ""}
${task.deadline ? `**Deadline:** ${new Date(task.deadline).toLocaleDateString()}` : ""}
${task.tags?.length ? `**Tags:** ${task.tags.join(", ")}` : ""}

_Created: ${new Date(task.createdAt).toLocaleString()}_
${task.completedAt ? `_Completed: ${new Date(task.completedAt).toLocaleString()}_` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {task.status !== "completed" && (
            <Action
              title="Mark Complete"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={handleComplete}
            />
          )}
          <Action.Push
            title="Edit Task"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditTaskForm task={task} onUpdated={onUpdate} />}
          />
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => open("https://blah.chat/tasks")}
          />
        </ActionPanel>
      }
    />
  );
}

function CreateTaskForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: {
    title: string;
    description: string;
    urgency: string;
  }) => {
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const client = getClient();
      const apiKey = getApiKey();
      await createTask(client, apiKey, {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        urgency: values.urgency as
          | "low"
          | "medium"
          | "high"
          | "urgent"
          | undefined,
      });
      showToast({ style: Toast.Style.Success, title: "Task created" });
      onCreated();
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
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
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What needs to be done?"
        autoFocus
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add details..."
      />
      <Form.Dropdown id="urgency" title="Urgency" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="urgent" title="Urgent" />
      </Form.Dropdown>
    </Form>
  );
}

function EditTaskForm({
  task,
  onUpdated,
}: {
  task: Task;
  onUpdated: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: {
    title: string;
    description: string;
    status: string;
    urgency: string;
  }) => {
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const client = getClient();
      const apiKey = getApiKey();
      await updateTask(client, apiKey, {
        taskId: task._id,
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        status: values.status as Task["status"],
        urgency: values.urgency as Task["urgency"] | undefined,
      });
      showToast({ style: Toast.Style.Success, title: "Task updated" });
      onUpdated();
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
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
          <Action.SubmitForm title="Update Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={task.title}
        autoFocus
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={task.description || ""}
      />
      <Form.Dropdown id="status" title="Status" defaultValue={task.status}>
        <Form.Dropdown.Item value="confirmed" title="Confirmed" />
        <Form.Dropdown.Item value="in_progress" title="In Progress" />
        <Form.Dropdown.Item value="completed" title="Completed" />
        <Form.Dropdown.Item value="cancelled" title="Cancelled" />
      </Form.Dropdown>
      <Form.Dropdown
        id="urgency"
        title="Urgency"
        defaultValue={task.urgency || ""}
      >
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="urgent" title="Urgent" />
      </Form.Dropdown>
    </Form>
  );
}
