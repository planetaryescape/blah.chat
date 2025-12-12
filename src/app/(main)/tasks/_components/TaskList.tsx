"use client";

import { TaskItem } from "./TaskItem";
import { EmptyTasksState } from "./EmptyTasksState";

export function TaskList({ tasks, view }: { tasks: any[]; view: string }) {
  if (tasks.length === 0) {
    return <EmptyTasksState view={view} />;
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <TaskItem key={task._id} task={task} />
      ))}
    </div>
  );
}
