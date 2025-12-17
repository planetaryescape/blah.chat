"use client";

import { ExternalLink, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";

export function ProjectConversations({
  projectId,
  conversations,
}: {
  projectId: Id<"projects">;
  conversations: any[];
}) {
  if (conversations.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="font-medium">No conversations yet</h3>
            <p className="text-sm text-muted-foreground">
              Start a new chat and assign it to this project
            </p>
          </div>
          <Link href="/chat">
            <Button>Start Conversation</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Project Conversations</h3>
        <Link href="/chat">
          <Button size="sm">New Conversation</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {conversations.map((conv) => (
          <Card key={conv._id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium">
                  {conv.title || "Untitled conversation"}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(conv.createdAt).toLocaleDateString()} ·{" "}
                  {conv.messageCount || 0} messages
                </p>
              </div>
              <Link href={`/chat/${conv._id}`}>
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
