"use client";

import { EmptyTasksState } from "./EmptyTasksState";
import { TaskItem } from "./TaskItem";

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
