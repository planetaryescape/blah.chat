import type { Metadata } from "next";
import { TasksPageClient } from "./TasksPageClient";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Track tasks stored on the Postgres rewrite stack.",
};

export default function TasksPage() {
  return <TasksPageClient />;
}
