"use client";

import { Database, HelpCircle, Plus, Settings2 } from "lucide-react";
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
import { useBYODConfig } from "@/lib/hooks/queries/useBYODConfig";
import {
  BYODConfigForm,
  BYODInfoDialog,
  ConnectionStatusCard,
  DisconnectDialog,
  InstanceInfoCard,
} from "./byod";

export function BYODSettings() {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const { config, isLoading, mutate } = useBYODConfig();
  const hasConfig = config !== null && config !== undefined;

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
            Store your conversations and data on your own Neon Postgres
            instance.
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
              Use your own Neon Postgres instance to store your data. You
              maintain full control and can export anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showConfigForm ? (
              <BYODConfigForm
                onSuccess={() => {
                  setShowConfigForm(false);
                  mutate();
                  toast.success("Neon database connected!");
                }}
                onCancel={() => setShowConfigForm(false)}
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">Before you start</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Create a Neon account at neon.tech</li>
                    <li>2. Create a new project</li>
                    <li>3. Copy your connection string from the dashboard</li>
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
                  Update Connection
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

      {/* Update Connection Form */}
      {hasConfig && showConfigForm && (
        <Card>
          <CardHeader>
            <CardTitle>Update Connection</CardTitle>
            <CardDescription>
              Update your Neon connection string.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BYODConfigForm
              isUpdate
              onSuccess={() => {
                setShowConfigForm(false);
                mutate();
                toast.success("Connection updated!");
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
        onDisconnected={() => mutate()}
      />

      {/* Info Dialog */}
      <BYODInfoDialog open={showInfo} onOpenChange={setShowInfo} />
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
