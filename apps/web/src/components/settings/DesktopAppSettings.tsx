"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import {
  checkDesktopUpdate,
  type DesktopUpdateStatus,
  getDesktopSettings,
  getDesktopSettingsDefaults,
  installDesktopUpdate,
  isDesktopShell,
  setDesktopSettings,
} from "@/lib/desktop/ipc";

export function DesktopAppSettings() {
  const defaults = useMemo(() => getDesktopSettingsDefaults(), []);
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus | null>(
    null,
  );
  const updateStatusDescription = useMemo(() => {
    if (updateStatus?.error) return updateStatus.error;
    if (updateStatus?.enabled === false) {
      return "Updater not configured for this build";
    }
    if (updateStatus?.available && updateStatus.update) {
      return `Version ${updateStatus.update.version} is available`;
    }
    return "No updates currently available";
  }, [updateStatus]);

  const [companionEnabled, setCompanionEnabled] = useState(
    defaults.companionEnabled,
  );
  const [companionShortcut, setCompanionShortcut] = useState(
    defaults.companionShortcut,
  );
  const [companionAlwaysOnTop, setCompanionAlwaysOnTop] = useState(
    defaults.companionAlwaysOnTop,
  );

  const { run: load, isPending: isLoading } = useAsyncAction(
    async () => {
      if (!isDesktopShell()) return;
      const settings = await getDesktopSettings();
      if (!settings) return;
      setCompanionEnabled(settings.companionEnabled);
      setCompanionShortcut(settings.companionShortcut);
      setCompanionAlwaysOnTop(settings.companionAlwaysOnTop);
    },
    {
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load desktop settings";
        toast.error(message);
      },
    },
  );

  useEffect(() => {
    void load();
  }, [load]);

  const { run: refreshUpdateStatus, isPending: isCheckingUpdate } =
    useAsyncAction(
      async (force: boolean, notify: boolean) => {
        if (!isDesktopShell()) return;

        const status = await checkDesktopUpdate(force);
        setUpdateStatus(status);

        if (status.error) {
          toast.error(status.error);
          return;
        }

        if (!notify) return;

        if (!status.enabled) {
          toast.info("Desktop updates are not configured for this build");
          return;
        }

        if (status.available && status.update) {
          toast.success(`Update available: v${status.update.version}`);
          return;
        }

        toast.success("Desktop app is up to date");
      },
      {
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to check for updates";
          toast.error(message);
        },
      },
    );

  useEffect(() => {
    void refreshUpdateStatus(false, false);
  }, [refreshUpdateStatus]);

  const onReset = useCallback(() => {
    setCompanionEnabled(defaults.companionEnabled);
    setCompanionShortcut(defaults.companionShortcut);
    setCompanionAlwaysOnTop(defaults.companionAlwaysOnTop);
  }, [defaults]);

  const { run: onSave, isPending: isSaving } = useAsyncAction(
    async () => {
      if (!isDesktopShell()) return;
      const result = await setDesktopSettings({
        companionEnabled,
        companionShortcut,
        companionAlwaysOnTop,
      });
      if (result) {
        setCompanionEnabled(result.companionEnabled);
        setCompanionShortcut(result.companionShortcut);
        setCompanionAlwaysOnTop(result.companionAlwaysOnTop);
      }
      toast.success("Desktop settings saved");
    },
    {
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save desktop settings";
        toast.error(message);
      },
    },
  );

  const { run: onInstallUpdate, isPending: isInstallingUpdate } =
    useAsyncAction(
      async () => {
        if (!isDesktopShell()) return;
        const started = await installDesktopUpdate();
        if (!started) {
          toast.info("No update available");
          await refreshUpdateStatus(true, false);
          return;
        }
        toast.success("Installing update and restarting...");
      },
      {
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : "Failed to install update";
          toast.error(message);
        },
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desktop App</CardTitle>
        <CardDescription>
          Configure the desktop companion window
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label>Enable Companion</Label>
            <p className="text-sm text-muted-foreground">
              Global shortcut, tray toggle, and companion window
            </p>
          </div>
          <Switch
            checked={companionEnabled}
            onCheckedChange={setCompanionEnabled}
            disabled={isLoading || isSaving}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companionShortcut">Companion shortcut</Label>
          <Input
            id="companionShortcut"
            value={companionShortcut}
            onChange={(e) => setCompanionShortcut(e.target.value)}
            placeholder={defaults.companionShortcut}
            disabled={!companionEnabled || isLoading || isSaving}
          />
          <p className="text-sm text-muted-foreground">
            Example: <span className="font-mono">Alt+Space</span>,{" "}
            <span className="font-mono">CmdOrCtrl+Shift+Space</span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label>Always on top</Label>
            <p className="text-sm text-muted-foreground">
              Keep companion above other windows
            </p>
          </div>
          <Switch
            checked={companionAlwaysOnTop}
            onCheckedChange={setCompanionAlwaysOnTop}
            disabled={!companionEnabled || isLoading || isSaving}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => void onSave()}
            disabled={isLoading || isSaving}
          >
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => void onReset()}
            disabled={isLoading || isSaving}
          >
            Reset to defaults
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>App updates</Label>
            <p className="text-sm text-muted-foreground">
              {updateStatusDescription}
            </p>
          </div>
          {updateStatus?.available && updateStatus.update?.body ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md border border-border/60 bg-muted/20 px-3 py-2 max-h-32 overflow-y-auto">
              {updateStatus.update.body}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void refreshUpdateStatus(true, true)}
              disabled={isLoading || isCheckingUpdate || isInstallingUpdate}
            >
              Check for updates
            </Button>
            <Button
              onClick={() => void onInstallUpdate()}
              disabled={
                isLoading ||
                isSaving ||
                isCheckingUpdate ||
                isInstallingUpdate ||
                !updateStatus?.available
              }
            >
              Install update & restart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
