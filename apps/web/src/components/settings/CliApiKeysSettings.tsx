"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  Copy,
  Key,
  Loader2,
  Plus,
  Terminal,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function CliApiKeysSettings() {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const keys = useQuery(api.cliAuth.list);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createKey = useMutation(api.cliAuth.create);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const revokeKey = useMutation(api.cliAuth.revoke);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createKey();
      setNewKey(result.key);
      toast.success("API key created");
    } catch (_err) {
      toast.error("Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseNewKey = () => {
    setNewKey(null);
    setCopied(false);
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) return;

    setRevoking(confirmRevoke.id);
    try {
      // @ts-ignore - Type depth
      await revokeKey({ keyId: confirmRevoke.id as any });
      toast.success("API key revoked");
      setConfirmRevoke(null);
    } catch (_err) {
      toast.error("Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  };

  if (keys === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            CLI Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                CLI & Raycast Access
              </CardTitle>
              <CardDescription>
                Manage API keys for CLI, Raycast, and other integrations.
              </CardDescription>
            </div>
            <Button onClick={handleCreate} disabled={creating} size="sm">
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {keys.length === 0 ? (
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                No API keys yet. Click "Create Key" to generate one for CLI or
                Raycast.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key._id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                        {key.keyPrefix}
                      </code>
                      <span className="text-sm text-muted-foreground">
                        {key.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created{" "}
                      {formatDistanceToNow(key.createdAt, { addSuffix: true })}
                      {key.lastUsedAt && (
                        <>
                          {" · "}Last used{" "}
                          {formatDistanceToNow(key.lastUsedAt, {
                            addSuffix: true,
                          })}
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setConfirmRevoke({ id: key._id, name: key.name })
                    }
                    disabled={revoking === key._id}
                  >
                    {revoking === key._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Revoking a key will immediately sign out that session. Use API keys
            for Raycast extensions or CLI access.
          </p>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={!!confirmRevoke}
        onOpenChange={(open) => !open && setConfirmRevoke(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke CLI Access Key?</DialogTitle>
            <DialogDescription>
              This will immediately sign out the CLI session using this key. You
              will need to run <code>blah login</code> again to create a new
              key.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border p-3 bg-muted/50">
              <code className="text-sm font-mono">{confirmRevoke?.name}</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevoke(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={!!revoking}
            >
              {revoking ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Dialog */}
      <Dialog
        open={!!newKey}
        onOpenChange={(open) => !open && handleCloseNewKey()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now — you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newKey || ""}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this key in Raycast preferences or CLI configuration.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseNewKey}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
