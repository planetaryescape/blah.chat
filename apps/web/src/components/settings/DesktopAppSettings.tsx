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
import { Switch } from "@/components/ui/switch";
import {
  getDesktopSettings,
  getDesktopSettingsDefaults,
  isDesktopShell,
  setDesktopSettings,
} from "@/lib/desktop/ipc";

export function DesktopAppSettings() {
  const defaults = useMemo(() => getDesktopSettingsDefaults(), []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [companionEnabled, setCompanionEnabled] = useState(
    defaults.companionEnabled,
  );
  const [companionShortcut, setCompanionShortcut] = useState(
    defaults.companionShortcut,
  );
  const [companionAlwaysOnTop, setCompanionAlwaysOnTop] = useState(
    defaults.companionAlwaysOnTop,
  );

  const load = useCallback(async () => {
    if (!isDesktopShell()) return;
    setIsLoading(true);
    try {
      const settings = await getDesktopSettings();
      if (!settings) return;
      setCompanionEnabled(settings.companionEnabled);
      setCompanionShortcut(settings.companionShortcut);
      setCompanionAlwaysOnTop(settings.companionAlwaysOnTop);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load desktop settings";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onReset = useCallback(async () => {
    setCompanionEnabled(defaults.companionEnabled);
    setCompanionShortcut(defaults.companionShortcut);
    setCompanionAlwaysOnTop(defaults.companionAlwaysOnTop);
  }, [defaults]);

  const onSave = useCallback(async () => {
    if (!isDesktopShell()) return;
    setIsSaving(true);
    try {
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
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save desktop settings";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [companionAlwaysOnTop, companionEnabled, companionShortcut]);

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
      </CardContent>
    </Card>
  );
}
