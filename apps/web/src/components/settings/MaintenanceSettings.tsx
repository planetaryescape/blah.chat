"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useSDKClient } from "@/lib/api/sdkClient";

export function MaintenanceSettings() {
  const sdk = useSDKClient();
  const [deleteAll, setDeleteAll] = useState(false);

  const { run: handleCleanup, isPending: isCleaningUp } = useAsyncAction(
    async () => {
      const result = await sdk.cleanupEmptyConversations({
        keepOne: !deleteAll,
      });
      toast.success(
        `Deleted ${result.deletedCount} empty conversation${result.deletedCount === 1 ? "" : "s"}`,
      );
    },
    {
      onError: (error) => {
        toast.error("Failed to cleanup conversations");
        console.error(error);
      },
    },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance</CardTitle>
        <CardDescription>Clean up and manage your data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">
              Clean Up Empty Conversations
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {deleteAll
                ? "Remove all empty conversations. If you have no conversations left, a new one will be created automatically."
                : "Remove all empty conversations except for the most recent one. This helps clean up conversations that were created but never used."}
            </p>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="delete-all"
                checked={deleteAll}
                onCheckedChange={(checked) => setDeleteAll(checked === true)}
              />
              <Label
                htmlFor="delete-all"
                className="text-sm font-normal cursor-pointer"
              >
                Delete all empty conversations (including most recent)
              </Label>
            </div>
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
