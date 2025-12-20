# Phase 6: Settings UI Integration

## Context

### What is BYOD?

BYOD allows users to connect their own Convex instance. They configure this in Settings by providing their Convex deployment URL and deploy key.

### Where This Phase Fits

```
Phase 1: Foundation ✓
Phase 2: Schema Package ✓
Phase 3: Deployment ✓
Phase 4: DAL Routing ✓
Phase 5: Migrations ✓
         │
         ▼
[Phase 6: Settings UI] ◄── YOU ARE HERE
         │
         ▼
Phase 7: Error Handling
Phase 8: Documentation
```

**Dependencies**: Phase 1 (credentials), Phase 3 (deployment)
**Unlocks**: Phase 7 (error handling), Phase 8 (documentation)

---

## Goal

Build a user-friendly settings interface for configuring and managing BYOD connections.

**Pattern**: Follow `AdminTranscriptProviderSettings.tsx` - single file with inline components.

---

## Deliverables

### 1. Main Settings Component (Single File)

Create `/src/components/settings/BYODSettings.tsx` (single file, NOT subfolder):

**Note**: All BYOD UI in one file with inline sub-components (ConfigForm, StatusDisplay, DisconnectDialog). Use `sonner` for toasts.

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BYODConfigForm } from "./byod/BYODConfigForm";
import { ConnectionStatusCard } from "./byod/ConnectionStatusCard";
import { InstanceInfoCard } from "./byod/InstanceInfoCard";
import { MigrationStatusCard } from "./byod/MigrationStatusCard";
import { DisconnectDialog } from "./byod/DisconnectDialog";
import { Database, Plus, Settings2 } from "lucide-react";

export function BYODSettings() {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);

  // Query BYOD config
  const config = useQuery(api.byod.credentials.getConfig);
  const isLoading = config === undefined;
  const isConnected = config?.connectionStatus === "connected";
  const hasConfig = config !== null;

  if (isLoading) {
    return <BYODSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Bring Your Own Database</h2>
        <p className="text-sm text-muted-foreground">
          Store your conversations and data on your own Convex instance.
        </p>
      </div>

      {/* Connection Status */}
      {hasConfig && <ConnectionStatusCard config={config} />}

      {/* Not Configured - Show Setup */}
      {!hasConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Connect Your Database
            </CardTitle>
            <CardDescription>
              Use your own Convex instance to store your data. You maintain full
              control and can export anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showConfigForm ? (
              <BYODConfigForm
                onSuccess={() => setShowConfigForm(false)}
                onCancel={() => setShowConfigForm(false)}
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">Before you start</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Create a Convex account at convex.dev</li>
                    <li>2. Create a new project for blah.chat</li>
                    <li>3. Get your deploy key from Settings → Deploy Key</li>
                  </ul>
                </div>
                <Button onClick={() => setShowConfigForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Configure BYOD
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configured - Show Info */}
      {hasConfig && !showConfigForm && (
        <>
          <InstanceInfoCard config={config} />

          {isConnected && <MigrationStatusCard />}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Manage Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConfigForm(true)}
                >
                  Update Credentials
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisconnect(true)}
                >
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Update Credentials Form */}
      {hasConfig && showConfigForm && (
        <Card>
          <CardHeader>
            <CardTitle>Update Credentials</CardTitle>
            <CardDescription>
              Update your Convex deployment URL or deploy key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BYODConfigForm
              isUpdate
              onSuccess={() => setShowConfigForm(false)}
              onCancel={() => setShowConfigForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Disconnect Dialog */}
      <DisconnectDialog
        open={showDisconnect}
        onOpenChange={setShowDisconnect}
      />
    </div>
  );
}

function BYODSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      <div className="h-32 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}
```

### 2. Configuration Form

Create `/src/components/settings/byod/BYODConfigForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

interface BYODConfigFormProps {
  isUpdate?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BYODConfigForm({
  isUpdate,
  onSuccess,
  onCancel,
}: BYODConfigFormProps) {
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [deployKey, setDeployKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "deploying" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveCredentials = useAction(api.byod.credentials.saveCredentials);
  const testConnection = useAction(api.byod.testConnection.testConnection);
  const deploy = useAction(api.byod.deploy.deployToUserInstance);

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleTest = async () => {
    if (!deploymentUrl || !deployKey) return;

    setTestStatus("testing");
    setTestError(null);

    try {
      // First save credentials
      await saveCredentials({ deploymentUrl, deployKey });

      // Then test connection
      const result = await testConnection({});

      if (result.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(result.message);
      }
    } catch (error) {
      setTestStatus("error");
      setTestError(error instanceof Error ? error.message : "Test failed");
    }
  };

  const handleSaveAndDeploy = async () => {
    if (!deploymentUrl || !deployKey) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      // Save credentials
      await saveCredentials({ deploymentUrl, deployKey });

      setSaveStatus("deploying");

      // Deploy schema
      await deploy({});

      setSaveStatus("success");
      setTimeout(onSuccess, 1500);
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Deployment failed");
    }
  };

  const isUrlValid = validateUrl(deploymentUrl);
  const canTest = deploymentUrl && deployKey && isUrlValid;
  const canSave = testStatus === "success";

  return (
    <div className="space-y-4">
      {/* Deployment URL */}
      <div className="space-y-2">
        <Label htmlFor="deploymentUrl">Convex Deployment URL</Label>
        <Input
          id="deploymentUrl"
          type="url"
          placeholder="https://your-project.convex.cloud"
          value={deploymentUrl}
          onChange={(e) => setDeploymentUrl(e.target.value)}
          className={deploymentUrl && !isUrlValid ? "border-destructive" : ""}
        />
        {deploymentUrl && !isUrlValid && (
          <p className="text-sm text-destructive">
            Must be a valid HTTPS URL
          </p>
        )}
      </div>

      {/* Deploy Key */}
      <div className="space-y-2">
        <Label htmlFor="deployKey">Deploy Key</Label>
        <div className="relative">
          <Input
            id="deployKey"
            type={showKey ? "text" : "password"}
            placeholder="prod:your-deploy-key"
            value={deployKey}
            onChange={(e) => setDeployKey(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Find this in Convex Dashboard → Settings → Deploy Key
        </p>
      </div>

      {/* Test Result */}
      {testStatus === "success" && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">
            Connection successful! Ready to deploy.
          </AlertDescription>
        </Alert>
      )}

      {testStatus === "error" && testError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{testError}</AlertDescription>
        </Alert>
      )}

      {saveStatus === "error" && saveError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        <Button
          variant="secondary"
          onClick={handleTest}
          disabled={!canTest || testStatus === "testing"}
        >
          {testStatus === "testing" && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Test Connection
        </Button>

        <Button
          onClick={handleSaveAndDeploy}
          disabled={!canSave || saveStatus === "saving" || saveStatus === "deploying"}
        >
          {(saveStatus === "saving" || saveStatus === "deploying") && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          {saveStatus === "deploying" ? "Deploying..." : "Save & Deploy"}
        </Button>
      </div>
    </div>
  );
}
```

### 3. Connection Status Card

Create `/src/components/settings/byod/ConnectionStatusCard.tsx`:

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";

interface ConnectionStatusCardProps {
  config: {
    connectionStatus: string;
    lastConnectionTest?: number;
    connectionError?: string;
    deploymentStatus?: string;
  };
}

export function ConnectionStatusCard({ config }: ConnectionStatusCardProps) {
  const getStatusDisplay = () => {
    switch (config.connectionStatus) {
      case "connected":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          badge: <Badge variant="default" className="bg-green-500">Connected</Badge>,
          message: "Your database is connected and working.",
        };
      case "pending":
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          badge: <Badge variant="secondary">Pending</Badge>,
          message: "Waiting for connection verification.",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          badge: <Badge variant="destructive">Error</Badge>,
          message: config.connectionError || "Connection failed.",
        };
      case "disconnected":
        return {
          icon: <XCircle className="h-5 w-5 text-muted-foreground" />,
          badge: <Badge variant="outline">Disconnected</Badge>,
          message: "Database disconnected. Reconnect to use BYOD.",
        };
      default:
        return {
          icon: <Clock className="h-5 w-5" />,
          badge: <Badge variant="outline">Unknown</Badge>,
          message: "Unknown status.",
        };
    }
  };

  const status = getStatusDisplay();
  const lastTest = config.lastConnectionTest
    ? new Date(config.lastConnectionTest).toLocaleString()
    : "Never";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {status.icon}
            Connection Status
          </CardTitle>
          {status.badge}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{status.message}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Last checked: {lastTest}
        </p>
      </CardContent>
    </Card>
  );
}
```

### 4. Disconnect Dialog

Create `/src/components/settings/byod/DisconnectDialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";

interface DisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DisconnectOption = "keep" | "migrate" | "delete";

export function DisconnectDialog({ open, onOpenChange }: DisconnectDialogProps) {
  const [option, setOption] = useState<DisconnectOption>("keep");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const disconnect = useMutation(api.byod.credentials.disconnect);
  const migrateBack = useAction(api.byod.disconnect.migrateBack);
  const deleteData = useAction(api.byod.disconnect.deleteUserData);

  const handleDisconnect = async () => {
    setStatus("processing");
    setError(null);

    try {
      switch (option) {
        case "keep":
          // Just disconnect, leave data on user's instance
          await disconnect({});
          break;

        case "migrate":
          // Migrate data back to main DB, then disconnect
          await migrateBack({});
          await disconnect({});
          break;

        case "delete":
          // Delete data from user's instance, then disconnect
          await deleteData({});
          await disconnect({});
          break;
      }

      setStatus("success");
      setTimeout(() => {
        onOpenChange(false);
        setStatus("idle");
      }, 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Disconnect failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect BYOD</DialogTitle>
          <DialogDescription>
            Choose what happens to your data when you disconnect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={option} onValueChange={(v) => setOption(v as DisconnectOption)}>
            <div className="flex items-start space-x-3 p-3 rounded-lg border">
              <RadioGroupItem value="keep" id="keep" className="mt-1" />
              <div>
                <Label htmlFor="keep" className="font-medium">
                  Keep data on your instance
                </Label>
                <p className="text-sm text-muted-foreground">
                  Data stays on your Convex instance. You can access it via
                  Convex dashboard or reconnect later.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border">
              <RadioGroupItem value="migrate" id="migrate" className="mt-1" />
              <div>
                <Label htmlFor="migrate" className="font-medium">
                  Migrate back to blah.chat
                </Label>
                <p className="text-sm text-muted-foreground">
                  Move all your data back to blah.chat servers. This may take a
                  few minutes.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/50">
              <RadioGroupItem value="delete" id="delete" className="mt-1" />
              <div>
                <Label htmlFor="delete" className="font-medium text-destructive">
                  Delete data from your instance
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all your data from your Convex instance.
                  This cannot be undone.
                </p>
              </div>
            </div>
          </RadioGroup>

          {option === "delete" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will permanently delete all your conversations, messages,
                memories, and files from your Convex instance.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={option === "delete" ? "destructive" : "default"}
            onClick={handleDisconnect}
            disabled={status === "processing"}
          >
            {status === "processing" && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {option === "delete" ? "Delete & Disconnect" : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Add to Settings Page

Modify `/src/app/(main)/settings/page.tsx`:

```typescript
import { BYODSettings } from "@/components/settings/BYODSettings";

const SETTINGS_SECTIONS = [
  // ... existing sections
  {
    id: "database",
    label: "Database",
    component: BYODSettings,
  },
];
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/src/components/settings/BYODSettings.tsx` | Create | Single file with all BYOD UI (follows AdminTranscriptProviderSettings pattern) |
| `/convex/byod/disconnect.ts` | Create | Disconnect actions |
| `/src/app/(main)/settings/page.tsx` | Modify | Add database section |

**Note**: Single file pattern - NO subfolder. All sub-components (ConfigForm, StatusDisplay, DisconnectDialog) are inline in BYODSettings.tsx.

---

## Testing Criteria

- [ ] Form validates Convex URL format (HTTPS required)
- [ ] Deploy key masked in UI by default
- [ ] Test connection provides clear feedback
- [ ] Deployment progress shown during save
- [ ] Disconnect dialog shows all three options
- [ ] Delete option requires confirmation
- [ ] Mobile responsive layout
- [ ] Loading states for all async operations

---

## Next Phase

After completing Phase 6, proceed to [Phase 7: Error Handling](./phase-7-error-handling.md) to implement robust error handling and monitoring.
