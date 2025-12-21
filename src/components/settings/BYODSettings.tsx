"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { downloadBYODProject } from "@/lib/byod/downloadProject";
import { BYOD_SCHEMA_VERSION } from "@/lib/byod/version";

// ===== Main Component =====

export function BYODSettings() {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Query BYOD config
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const config = useQuery(api.byod.credentials.getConfig);
  const isLoading = config === undefined;
  const _isConnected = config?.connectionStatus === "connected";
  const hasConfig = config !== null;

  if (isLoading) {
    return <BYODSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Bring Your Own Database</h2>
          <p className="text-sm text-muted-foreground">
            Store your conversations and data on your own Convex instance.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInfo(true)}
          className="flex-shrink-0 gap-1.5"
        >
          <HelpCircle className="h-4 w-4" />
          Learn more
        </Button>
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
                onSuccess={() => {
                  setShowConfigForm(false);
                  toast.success("BYOD configured successfully!");
                }}
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
              onSuccess={() => {
                setShowConfigForm(false);
                toast.success("Credentials updated successfully!");
              }}
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

      {/* Info Dialog */}
      <BYODInfoDialog open={showInfo} onOpenChange={setShowInfo} />
    </div>
  );
}

// ===== Skeleton =====

function BYODSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      <div className="h-32 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}

// ===== Config Form =====

interface BYODConfigFormProps {
  isUpdate?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

type SetupStep = "credentials" | "download" | "deploy" | "verify";

function BYODConfigForm({
  isUpdate,
  onSuccess,
  onCancel,
}: BYODConfigFormProps) {
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [deployKey, setDeployKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [currentStep, setCurrentStep] = useState<SetupStep>("credentials");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const saveCredentials = useAction(api.byod.saveCredentials.saveCredentials);
  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const verifyDeployment = useAction(api.byod.testConnection.testConnection);

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isUrlValid = deploymentUrl ? validateUrl(deploymentUrl) : true;
  const canProceed = deploymentUrl && deployKey && isUrlValid;

  const handleSaveCredentials = async () => {
    if (!canProceed) return;

    setIsLoading(true);
    setError(null);

    try {
      await saveCredentials({ deploymentUrl, deployKey });
      setCurrentStep("download");
      toast.success("Credentials saved!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save credentials",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadBYODProject();
      setCurrentStep("deploy");
      toast.success("Schema package downloaded!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download package",
      );
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyDeployment({});
      if (!result.success) {
        setError(
          result.message ||
            "Verification failed. Make sure you deployed the schema.",
        );
        return;
      }

      // Check if schema was actually deployed (has version)
      if (result.schemaVersion !== undefined) {
        toast.success(
          `Deployment verified (v${result.schemaVersion})! You're all set.`,
        );
        onSuccess();
      } else {
        // Connection works but schema not deployed
        setError(
          "Connection successful, but the schema isn't deployed yet. " +
            "Make sure you ran 'bunx convex deploy' in the extracted folder.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: "credentials" as const, label: "1. Save Credentials" },
    { id: "download" as const, label: "2. Download Package" },
    { id: "deploy" as const, label: "3. Deploy Locally" },
    { id: "verify" as const, label: "4. Verify" },
  ];

  const stepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      {!isUpdate && (
        <div className="flex items-center gap-2 text-xs">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded ${
                  i < stepIndex
                    ? "bg-green-500/20 text-green-500"
                    : i === stepIndex
                      ? "bg-primary/20 text-primary font-medium"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <span className="text-muted-foreground">→</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Credentials */}
      {currentStep === "credentials" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deploymentUrl">Convex Deployment URL</Label>
            <Input
              id="deploymentUrl"
              type="url"
              placeholder="https://your-project.convex.cloud"
              value={deploymentUrl}
              onChange={(e) => setDeploymentUrl(e.target.value)}
              className={
                deploymentUrl && !isUrlValid ? "border-destructive" : ""
              }
            />
            {deploymentUrl && !isUrlValid && (
              <p className="text-sm text-destructive">
                Must be a valid HTTPS URL
              </p>
            )}
          </div>

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
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Find this in Convex Dashboard → Settings → Deploy Key
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Download */}
      {currentStep === "download" && (
        <div className="space-y-4">
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-500">
              Credentials saved! Now download the schema package.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-medium">
              Download the blah.chat schema package
            </p>
            <p className="text-sm text-muted-foreground">
              This ZIP file contains everything needed to set up your Convex
              instance: schema, functions, and configuration files.
            </p>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download Schema Package
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Deploy Instructions */}
      {currentStep === "deploy" && (
        <div className="space-y-4">
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              Package downloaded! Now deploy it to your Convex instance.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-medium">
              Deploy to your Convex instance
            </p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Unzip the downloaded file</li>
              <li>Open terminal in the extracted folder</li>
              <li>
                Run:{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                  bun install
                </code>
              </li>
              <li>
                Run:{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                  bunx convex deploy
                </code>
              </li>
              <li>When prompted, select your project or paste the URL</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Don't have bun? Use{" "}
              <code className="px-1 py-0.5 rounded bg-muted font-mono">
                npm install
              </code>{" "}
              and{" "}
              <code className="px-1 py-0.5 rounded bg-muted font-mono">
                npx convex deploy
              </code>{" "}
              instead.
            </p>
          </div>

          <Button onClick={() => setCurrentStep("verify")} variant="secondary">
            I've deployed, verify my setup
          </Button>
        </div>
      )}

      {/* Step 4: Verify */}
      {currentStep === "verify" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-medium">Verify your deployment</p>
            <p className="text-sm text-muted-foreground">
              We'll ping your Convex instance to confirm the schema was deployed
              correctly.
            </p>
            <Button
              onClick={handleVerify}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Verify Deployment
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep("deploy")}
            className="text-muted-foreground"
          >
            ← Back to instructions
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        {currentStep === "credentials" && (
          <Button
            onClick={handleSaveCredentials}
            disabled={!canProceed || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save & Continue
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== Connection Status Card =====

interface BYODConfig {
  connectionStatus: string;
  lastConnectionTest?: number;
  connectionError?: string;
  deploymentStatus?: string;
  schemaVersion: number;
  lastSchemaDeploy?: number;
}

function ConnectionStatusCard({ config }: { config: BYODConfig }) {
  const getStatusDisplay = () => {
    switch (config.connectionStatus) {
      case "connected":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          badge: (
            <Badge variant="default" className="bg-green-500">
              Connected
            </Badge>
          ),
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
          icon: <XCircle className="h-5 w-5 text-red-500" />,
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

// ===== Instance Info Card =====

function InstanceInfoCard({ config }: { config: BYODConfig }) {
  const isOutdated = config.schemaVersion < BYOD_SCHEMA_VERSION;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Instance Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Update Required Banner */}
        {isOutdated && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <span className="font-medium">Update available!</span> Your
              database is on v{config.schemaVersion}, latest is v
              {BYOD_SCHEMA_VERSION}.{" "}
              <a href="#update-instructions" className="underline">
                See update instructions
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Schema Version</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">v{config.schemaVersion}</span>
            {isOutdated && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-500/50"
              >
                → v{BYOD_SCHEMA_VERSION}
              </Badge>
            )}
            {!isOutdated && config.schemaVersion > 0 && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-500/50"
              >
                Latest
              </Badge>
            )}
          </div>
        </div>
        {config.lastSchemaDeploy && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Deployed</span>
            <span className="font-medium">
              {new Date(config.lastSchemaDeploy).toLocaleString()}
            </span>
          </div>
        )}
        {config.deploymentStatus && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deployment Status</span>
            <Badge
              variant={
                config.deploymentStatus === "deployed" ? "default" : "secondary"
              }
            >
              {config.deploymentStatus}
            </Badge>
          </div>
        )}

        {/* Update Instructions (shown when outdated) */}
        {isOutdated && (
          <div id="update-instructions" className="pt-3 border-t">
            <p className="text-sm font-medium mb-2">How to update:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Download the new schema package below</li>
              <li>
                Unzip and run{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                  bunx convex deploy
                </code>
              </li>
              <li>Refresh this page to verify</li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={() => downloadBYODProject()}
            >
              <Download className="h-4 w-4" />
              Download v{BYOD_SCHEMA_VERSION} Package
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Disconnect Dialog =====

type DisconnectOption = "keep" | "migrate" | "delete";

interface DisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DisconnectDialog({ open, onOpenChange }: DisconnectDialogProps) {
  const [option, setOption] = useState<DisconnectOption>("keep");
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const disconnect = useMutation(api.byod.credentials.disconnect);

  const handleDisconnect = async () => {
    setStatus("processing");
    setError(null);

    try {
      // For now, only support "keep" option
      // migrate and delete would require additional backend work
      if (option !== "keep") {
        toast.info(
          "Migrate and delete options coming soon. Using 'keep' for now.",
        );
      }

      await disconnect({});

      setStatus("success");
      toast.success("BYOD disconnected successfully");
      setTimeout(() => {
        onOpenChange(false);
        setStatus("idle");
      }, 1000);
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
          <RadioGroup
            value={option}
            onValueChange={(v) => setOption(v as DisconnectOption)}
          >
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

            <div className="flex items-start space-x-3 p-3 rounded-lg border opacity-50">
              <RadioGroupItem
                value="migrate"
                id="migrate"
                className="mt-1"
                disabled
              />
              <div>
                <Label htmlFor="migrate" className="font-medium">
                  Migrate back to blah.chat (Coming Soon)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Move all your data back to blah.chat servers.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/50 opacity-50">
              <RadioGroupItem
                value="delete"
                id="delete"
                className="mt-1"
                disabled
              />
              <div>
                <Label
                  htmlFor="delete"
                  className="font-medium text-destructive"
                >
                  Delete data from your instance (Coming Soon)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all your data from your Convex instance.
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

// ===== Info Dialog =====

interface BYODInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BYODInfoDialog({ open, onOpenChange }: BYODInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            About Bring Your Own Database
          </DialogTitle>
          <DialogDescription>
            Complete data ownership with your own Convex instance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* What is BYOD */}
            <section className="space-y-2">
              <h3 className="font-semibold">What is BYOD?</h3>
              <p className="text-sm text-muted-foreground">
                BYOD (Bring Your Own Database) lets you store your personal data
                on your own Convex instance instead of blah.chat's servers. Your
                conversations, messages, memories, files, and projects are
                stored in a database you control.
              </p>
            </section>

            {/* Why use BYOD */}
            <section className="space-y-2">
              <h3 className="font-semibold">Why use BYOD?</h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Data ownership</strong> — Your data lives in your
                    database, export anytime
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Privacy</strong> — Only you have access to your
                    stored conversations
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Portability</strong> — If blah.chat shuts down, your
                    data persists
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Direct access</strong> — Query your data directly
                    via Convex dashboard
                  </span>
                </li>
              </ul>
            </section>

            {/* How it works */}
            <section className="space-y-2">
              <h3 className="font-semibold">How it works</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>blah.chat uses a two-database architecture:</p>
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div>
                    <span className="font-medium text-foreground">
                      Main database (blah.chat)
                    </span>
                    <p className="text-xs">
                      User accounts, settings, preferences, templates, admin
                      data
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Your database (BYOD)
                    </span>
                    <p className="text-xs">
                      Conversations, messages, memories, files, projects, notes,
                      tasks
                    </p>
                  </div>
                </div>
                <p>
                  When you send a message, it flows through blah.chat for AI
                  processing, then gets stored on your Convex instance.
                  blah.chat never persists your conversation content on its
                  servers.
                </p>
              </div>
            </section>

            {/* What you need */}
            <section className="space-y-2">
              <h3 className="font-semibold">What you need</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  <strong>Convex account</strong> — Free tier works fine
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    asChild
                  >
                    <a
                      href="https://convex.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      convex.dev{" "}
                      <ExternalLink className="h-3 w-3 ml-0.5 inline" />
                    </a>
                  </Button>
                </li>
                <li>
                  <strong>New Convex project</strong> — Create one specifically
                  for blah.chat
                </li>
                <li>
                  <strong>Deploy key</strong> — Found in Convex Dashboard →
                  Settings → Deploy Key
                </li>
              </ol>
            </section>

            {/* Setup steps */}
            <section className="space-y-2">
              <h3 className="font-semibold">Setup steps</h3>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Create a new project at dashboard.convex.dev</li>
                <li>Go to Settings → Deploy Key and copy it</li>
                <li>
                  Copy your deployment URL (e.g.,
                  https://your-project.convex.cloud)
                </li>
                <li>Enter both in the form and click "Save & Continue"</li>
                <li>Download the schema package (ZIP file)</li>
                <li>
                  Unzip and run{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                    bunx convex deploy
                  </code>{" "}
                  in the folder
                </li>
                <li>Click "Verify Deployment" to confirm setup</li>
                <li>Done! Your data will now be stored on your instance</li>
              </ol>
            </section>

            {/* Cost implications */}
            <section className="space-y-2">
              <h3 className="font-semibold">Cost implications</h3>
              <div className="text-sm text-muted-foreground">
                <p>
                  With BYOD, <strong>you pay for your own Convex usage</strong>.
                  Convex offers a generous free tier that's sufficient for most
                  personal use:
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>1M function calls/month</li>
                  <li>1GB database storage</li>
                  <li>1GB file storage</li>
                </ul>
                <p className="mt-2">
                  Check{" "}
                  <a
                    href="https://convex.dev/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Convex pricing
                  </a>{" "}
                  for details. Heavy usage may require their paid plan.
                </p>
              </div>
            </section>

            {/* What happens when disconnecting */}
            <section className="space-y-2">
              <h3 className="font-semibold">Disconnecting BYOD</h3>
              <p className="text-sm text-muted-foreground">
                When you disconnect, you choose what happens to your data:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">Keep:</span>
                  <span>
                    Data stays on your instance, accessible via Convex dashboard
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">Migrate:</span>
                  <span>Move data back to blah.chat servers (coming soon)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">Delete:</span>
                  <span>
                    Permanently remove from your instance (coming soon)
                  </span>
                </li>
              </ul>
            </section>

            {/* Connection issues */}
            <section className="space-y-2">
              <h3 className="font-semibold">Connection issues</h3>
              <p className="text-sm text-muted-foreground">
                If your database becomes unreachable, blah.chat will block the
                app to protect data integrity. You'll see a connection error
                screen with options to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mt-2 list-disc list-inside">
                <li>Retry the connection</li>
                <li>Update your credentials</li>
                <li>Check Convex status page</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                We run health checks every 6 hours to detect issues early.
              </p>
            </section>

            {/* Schema Updates */}
            <section className="space-y-2">
              <h3 className="font-semibold">Schema updates</h3>
              <p className="text-sm text-muted-foreground">
                When blah.chat releases schema updates, you'll see a
                notification banner. To update:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 mt-2 list-decimal list-inside">
                <li>Download the new schema package from Settings</li>
                <li>
                  Run{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                    bunx convex deploy
                  </code>{" "}
                  again
                </li>
                <li>Click "Verify" to confirm the update</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-2">
                We'll also send you an email when updates are available.
              </p>
            </section>

            {/* Limitations */}
            <section className="space-y-2">
              <h3 className="font-semibold">Current limitations</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Schema updates require manual re-deployment (CLI command)
                </li>
                <li>
                  File storage currently stays on blah.chat (migration planned)
                </li>
                <li>
                  You must maintain an active connection for the app to work
                </li>
              </ul>
            </section>

            {/* Security */}
            <section className="space-y-2">
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">
                Your deploy key is encrypted with AES-256-GCM before storage and
                never logged. Only encrypted credentials are stored, and
                decryption happens server-side when needed for database
                operations.
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
