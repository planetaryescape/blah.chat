"use client";

import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const EMPTY_STATES = {
  all: {
    icon: CheckSquare,
    title: "No tasks yet",
    description: "Create your first task to get started!",
  },
  today: {
    icon: Calendar,
    title: "Nothing due today",
    description: "Enjoy your day! Check upcoming tasks to plan ahead.",
  },
  upcoming: {
    icon: CalendarCheck,
    title: "No upcoming deadlines",
    description: "No tasks due in the next 7 days.",
  },
  completed: {
    icon: CheckCircle2,
    title: "No completed tasks yet",
    description: "Complete some tasks to see them here.",
  },
};

export function EmptyTasksState({ view }: { view: string }) {
  const state =
    EMPTY_STATES[view as keyof typeof EMPTY_STATES] || EMPTY_STATES.all;
  const Icon = state.icon;

  return (
    <Card className="p-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <Icon className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="font-medium">{state.title}</h3>
          <p className="text-sm text-muted-foreground">{state.description}</p>
        </div>
      </div>
    </Card>
  );
}
