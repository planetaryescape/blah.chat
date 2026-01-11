"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useClerk } from "@clerk/nextjs";
import { useAction, useMutation } from "convex/react";
import { AlertTriangle, Download, Loader2, Trash2, UserX } from "lucide-react";
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

export function DangerZoneSettings() {
  const { signOut } = useClerk();

  // Export
  const [isExporting, setIsExporting] = useState(false);
  const exportMyData = useAction(api.users.exportMyData);

  // Delete data
  const [isDeleteDataOpen, setIsDeleteDataOpen] = useState(false);
  const [deleteDataConfirmation, setDeleteDataConfirmation] = useState("");
  const [isDeletingData, setIsDeletingData] = useState(false);
  const deleteMyData = useMutation(api.users.deleteMyData);

  // Delete account
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] =
    useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blah-chat-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (deleteDataConfirmation !== "DELETE MY DATA") return;

    setIsDeletingData(true);
    try {
      await deleteMyData({ confirmationText: deleteDataConfirmation });
      toast.success("All your data has been deleted");
      setIsDeleteDataOpen(false);
      setDeleteDataConfirmation("");
    } catch (error) {
      toast.error("Failed to delete data");
      console.error(error);
    } finally {
      setIsDeletingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirmation !== "DELETE MY ACCOUNT") return;

    setIsDeletingAccount(true);
    try {
      await deleteMyAccount({ confirmationText: deleteAccountConfirmation });
      toast.success("Your account has been deleted");
      await signOut({ redirectUrl: "/" });
    } catch (error) {
      toast.error("Failed to delete account");
      console.error(error);
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download My Data
          </CardTitle>
          <CardDescription>Export all your data as a JSON file</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Download a copy of all your conversations, messages, memories,
            notes, tasks, projects, bookmarks, and preferences.
          </p>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Data */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Delete My Data
          </CardTitle>
          <CardDescription>
            Permanently delete all your data while keeping your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will permanently delete all your conversations, messages,
            memories, notes, tasks, projects, bookmarks, and preferences. Your
            account will remain active but empty.
          </p>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDataOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Data
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <UserX className="w-5 h-5" />
            Delete My Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will permanently delete your account and all your data. You
            will be signed out and will not be able to recover your account.
          </p>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteAccountOpen(true)}
          >
            <UserX className="w-4 h-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Data Confirmation Dialog */}
      <Dialog open={isDeleteDataOpen} onOpenChange={setIsDeleteDataOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete All Data
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your conversations, messages,
              memories, notes, tasks, projects, bookmarks, and preferences will
              be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-data-confirm">
                Type <span className="font-mono font-bold">DELETE MY DATA</span>{" "}
                to confirm
              </Label>
              <Input
                id="delete-data-confirm"
                value={deleteDataConfirmation}
                onChange={(e) => setDeleteDataConfirmation(e.target.value)}
                placeholder="DELETE MY DATA"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDataOpen(false);
                setDeleteDataConfirmation("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteData}
              disabled={
                deleteDataConfirmation !== "DELETE MY DATA" || isDeletingData
              }
            >
              {isDeletingData ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All Data"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Your account and all associated data
              will be permanently deleted. You will be signed out immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-account-confirm">
                Type{" "}
                <span className="font-mono font-bold">DELETE MY ACCOUNT</span>{" "}
                to confirm
              </Label>
              <Input
                id="delete-account-confirm"
                value={deleteAccountConfirmation}
                onChange={(e) => setDeleteAccountConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteAccountOpen(false);
                setDeleteAccountConfirmation("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                deleteAccountConfirmation !== "DELETE MY ACCOUNT" ||
                isDeletingAccount
              }
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
