"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Trash2,
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
import { Switch } from "@/components/ui/switch";

type KeyType = "vercelGateway" | "openRouter" | "groq" | "deepgram";

/** Extract error message from ConvexError or regular Error */
function getErrorMessage(error: unknown, fallback: string): string {
  const errorObj = error as { data?: string; message?: string };
  return errorObj.data || errorObj.message || fallback;
}

const KEY_CONFIG: Record<
  KeyType,
  {
    label: string;
    description: string;
    required: boolean;
    placeholder: string;
    hint?: string;
    disabledWarning?: string;
  }
> = {
  vercelGateway: {
    label: "Vercel AI Gateway",
    description:
      "Routes requests to OpenAI, Anthropic, Google, and other providers",
    required: true,
    placeholder: "vrcl_...",
    hint: "Create at vercel.com/account/tokens",
  },
  openRouter: {
    label: "OpenRouter",
    description: "Access to DeepSeek, Llama, Mistral, and 15+ other models",
    required: false,
    placeholder: "sk-or-...",
    hint: "Create at openrouter.ai/keys",
    disabledWarning: "Without this key, OpenRouter models will be unavailable",
  },
  groq: {
    label: "Groq",
    description: "Powers voice input (speech-to-text)",
    required: false,
    placeholder: "gsk_...",
    hint: "Create at console.groq.com/keys",
    disabledWarning: "Without this key, voice input will be disabled",
  },
  deepgram: {
    label: "Deepgram",
    description: "Powers voice responses (text-to-speech)",
    required: false,
    placeholder: "dg_...",
    hint: "Create at console.deepgram.com",
    disabledWarning: "Without this key, text-to-speech will be disabled",
  },
};

function ApiKeyCard({
  keyType,
  hasKey,
  lastValidated,
  onSave,
  onRemove,
}: {
  keyType: KeyType;
  hasKey: boolean;
  lastValidated?: number;
  onSave: (key: string) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}) {
  const config = KEY_CONFIG[keyType];
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    try {
      await onSave(key);
      setKey("");
      toast.success(`${config.label} key saved and validated`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to save key"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove();
      toast.success(`${config.label} key removed`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to remove key"));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{config.label}</CardTitle>
            {config.required && (
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            )}
          </div>
          {hasKey && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Configured</span>
            </div>
          )}
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasKey ? (
          <>
            {config.disabledWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {config.disabledWarning}
              </p>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder={config.placeholder}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleSave} disabled={!key.trim() || saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Validate & Save"
                )}
              </Button>
            </div>
            {config.hint && (
              <p className="text-xs text-muted-foreground">{config.hint}</p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Key className="h-4 w-4" />
              <span>Key configured</span>
              {lastValidated && (
                <span className="text-xs">
                  (validated {new Date(lastValidated).toLocaleDateString()})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
              className="text-destructive hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BYOKSettings() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const config = useQuery(api.byok.credentials.getConfig);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const enableByok = useMutation(api.byok.credentials.enable);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const disableByok = useMutation(api.byok.credentials.disable);
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const saveApiKey = useAction(api.byok.saveCredentials.saveApiKey);
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const removeApiKey = useAction(api.byok.saveCredentials.removeApiKey);

  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!config?.hasVercelGatewayKey) {
        toast.error("Please add a Vercel AI Gateway key first");
        return;
      }
      try {
        await enableByok();
        toast.success("BYOK enabled! Using your own API keys now.");
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Failed to enable BYOK"));
      }
    } else {
      setShowDisableDialog(true);
    }
  };

  const confirmDisable = async () => {
    try {
      await disableByok();
      toast.success("BYOK disabled. Using platform keys now.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to disable BYOK"));
    }
    setShowDisableDialog(false);
  };

  if (config === undefined) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Bring Your Own API Keys
          </CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              Pay for AI inference directly through your own accounts instead of
              using platform credits. You control your usage and costs.
            </span>
            <span className="block text-xs">
              Keys are encrypted with AES-256-GCM and validated before saving.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!config?.hasVercelGatewayKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Step 1:</strong> Add your Vercel AI Gateway key below,
                then enable BYOK mode. Optional keys unlock additional features.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="byok-enabled">Enable BYOK Mode</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, all AI requests use your API keys
              </p>
            </div>
            <Switch
              id="byok-enabled"
              checked={config?.byokEnabled ?? false}
              onCheckedChange={handleToggle}
              disabled={!config?.hasVercelGatewayKey}
            />
          </div>

          {config?.byokEnabled && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                BYOK mode is active. All AI requests use your API keys.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Required Key */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Required
        </h3>

        <ApiKeyCard
          keyType="vercelGateway"
          hasKey={config?.hasVercelGatewayKey ?? false}
          lastValidated={config?.lastValidated?.vercelGateway}
          onSave={(key) =>
            saveApiKey({ keyType: "vercelGateway", apiKey: key })
          }
          onRemove={() => removeApiKey({ keyType: "vercelGateway" })}
        />
      </div>

      {/* Optional Keys */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Optional
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            These keys enable additional features. Without them, those features
            will be disabled when BYOK is active.
          </p>
        </div>

        <ApiKeyCard
          keyType="openRouter"
          hasKey={config?.hasOpenRouterKey ?? false}
          lastValidated={config?.lastValidated?.openRouter}
          onSave={(key) => saveApiKey({ keyType: "openRouter", apiKey: key })}
          onRemove={() => removeApiKey({ keyType: "openRouter" })}
        />

        <ApiKeyCard
          keyType="groq"
          hasKey={config?.hasGroqKey ?? false}
          lastValidated={config?.lastValidated?.groq}
          onSave={(key) => saveApiKey({ keyType: "groq", apiKey: key })}
          onRemove={() => removeApiKey({ keyType: "groq" })}
        />

        <ApiKeyCard
          keyType="deepgram"
          hasKey={config?.hasDeepgramKey ?? false}
          lastValidated={config?.lastValidated?.deepgram}
          onSave={(key) => saveApiKey({ keyType: "deepgram", apiKey: key })}
          onRemove={() => removeApiKey({ keyType: "deepgram" })}
        />
      </div>

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable BYOK Mode?</DialogTitle>
            <DialogDescription className="pt-4">
              Switching back to platform keys means your AI requests will use
              shared platform resources. Your saved API keys will be preserved
              for when you want to re-enable BYOK.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisableDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmDisable}>Disable BYOK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
