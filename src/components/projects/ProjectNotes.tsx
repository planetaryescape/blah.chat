"use client";

import { ExternalLink, NotebookPen } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";

export function ProjectNotes({
  projectId,
  notes,
}: {
  projectId: Id<"projects">;
  notes: any[];
}) {
  if (notes.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <NotebookPen className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="font-medium">No notes yet</h3>
            <p className="text-sm text-muted-foreground">
              Create notes and tag them with this project
            </p>
          </div>
          <Link href="/notes">
            <Button>Go to Notes</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Project Notes</h3>
        <Link href="/notes">
          <Button size="sm">New Note</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {notes.map((note) => (
          <Card key={note._id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium">{note.title}</h4>
                {note.content && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {note.content}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {note.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Link href={`/notes?id=${note._id}`}>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
