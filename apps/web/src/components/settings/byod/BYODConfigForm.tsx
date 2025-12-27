"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAction } from "convex/react";
import {
  CheckCircle,
  Download,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadBYODProject } from "@/lib/byod/downloadProject";

export interface BYODConfigFormProps {
  isUpdate?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

type SetupStep = "credentials" | "download" | "deploy" | "verify";

export function BYODConfigForm({
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
