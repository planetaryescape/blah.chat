"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

export function MaintenanceSettings() {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const cleanupEmptyConversations = useMutation(api.conversations.cleanupEmptyConversations);

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const result = await cleanupEmptyConversations();
      toast.success(`Deleted ${result.deletedCount} empty conversation${result.deletedCount === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error("Failed to cleanup conversations");
      console.error(error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance</CardTitle>
        <CardDescription>
          Clean up and manage your data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Clean Up Empty Conversations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Remove all empty conversations except for the most recent one. This helps clean up
              conversations that were created but never used.
            </p>
            <Button
              onClick={handleCleanup}
              disabled={isCleaningUp}
              variant="destructive"
            >
              {isCleaningUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cleaning up...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean Up Now
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
