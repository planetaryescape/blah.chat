"use client";

import { Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncAction } from "@/hooks/useAsyncAction";

export interface BYODConfigFormProps {
  isUpdate?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BYODConfigForm({
  isUpdate,
  onSuccess,
  onCancel,
}: BYODConfigFormProps) {
  const [connectionString, setConnectionString] = useState("");
  const [showString, setShowString] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    connectionString.length > 0 && connectionString.includes("neon.tech");

  const { run: handleSubmit, isPending: isLoading } = useAsyncAction(
    async () => {
      if (!isValid) return;

      setError(null);

      const res = await fetch("/api/v1/byod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "Failed to connect");
        return;
      }

      toast.success(
        isUpdate
          ? "Connection updated successfully!"
          : "Neon database connected! Migrations will run shortly.",
      );
      onSuccess();
    },
    {
      onError: (err) =>
        setError(
          err instanceof Error ? err.message : "Failed to save connection",
        ),
    },
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="connectionString">Neon Connection String</Label>
        <div className="relative">
          <Input
            id="connectionString"
            type={showString ? "text" : "password"}
            placeholder="postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            className="pr-10 font-mono text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={() => setShowString(!showString)}
          >
            {showString ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Find this in Neon Console → Connection Details. Must be a neon.tech
          URL.
        </p>
      </div>

      {connectionString && !isValid && (
        <p className="text-sm text-destructive">
          Must be a valid neon.tech connection string
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isUpdate ? "Update Connection" : "Connect"}
        </Button>
      </div>
    </div>
  );
}
