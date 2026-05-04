import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FluidButton } from "@/components/ui/FluidButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { queryClient } from "@/lib/cache/queryClient";
import { haptic } from "@/lib/haptics";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { palette, spacing, typography } from "@/lib/theme/designSystem";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

export default function DangerZoneScreen() {
  const router = useRouter();
  const { getToken, signOut } = useAuth();
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.exportUserData();
    },
  });
  const deleteDataMutation = useMutation({
    mutationFn: async (confirmationText: string) => {
      const client = createMobileSdkClient(() => getToken());
      return client.deleteUserData({ confirmationText });
    },
    onSuccess: () => {
      // Wipe all cached data — user nuked their data on the server.
      queryClient.invalidateQueries();
    },
  });
  const deleteAccountMutation = useMutation({
    mutationFn: async (confirmationText: string) => {
      const client = createMobileSdkClient(() => getToken());
      return client.deleteUserAccount({ confirmationText });
    },
    onSuccess: () => {
      // Wipe all cached data — account is gone.
      queryClient.invalidateQueries();
    },
  });

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteAccountText, setDeleteAccountText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAccountConfirm, setShowAccountConfirm] = useState(false);

  const { run: handleExport, isPending: exporting } = useAsyncAction(
    async () => {
      haptic.medium();
      const data = await exportDataMutation.mutateAsync();
      const json = JSON.stringify(data, null, 2);
      const fileName = `blahchat-export-${Date.now()}.json`;
      const file = new File(Paths.document, fileName);
      file.write(json);
      Alert.alert("Export Complete", `Data saved to ${fileName}`);
    },
    {
      onError: () => Alert.alert("Error", "Failed to export data."),
    },
  );

  const { run: handleDeleteData, isPending: deletingData } = useAsyncAction(
    async () => {
      if (deleteConfirmText !== "DELETE MY DATA") return;
      haptic.error();
      await deleteDataMutation.mutateAsync("DELETE MY DATA");
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      Alert.alert("Done", "All data has been deleted.");
      router.back();
    },
    {
      onError: () => Alert.alert("Error", "Failed to delete data."),
    },
  );

  const { run: handleDeleteAccount, isPending: deletingAccount } =
    useAsyncAction(
      async () => {
        if (deleteAccountText !== "DELETE MY ACCOUNT") return;
        haptic.error();
        await deleteAccountMutation.mutateAsync("DELETE MY ACCOUNT");
        await signOut();
      },
      {
        onError: () => Alert.alert("Error", "Failed to delete account."),
      },
    );

  const deleting = deletingData || deletingAccount;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader title="Danger Zone" leftAction="back" />

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        <SettingsSection title="Data Management">
          <SettingsRow
            variant="action"
            label={exporting ? "Exporting..." : "Download My Data"}
            description="Export all your data as JSON"
            icon={AlertTriangle}
            onPress={handleExport}
          />
          <SettingsRow
            variant="action"
            label="Delete All Data"
            description="Permanently delete all conversations and memories"
            icon={AlertTriangle}
            onPress={() => {
              haptic.medium();
              setShowDeleteConfirm(true);
            }}
            destructive
          />
          <SettingsRow
            variant="action"
            label="Delete Account"
            description="Permanently delete your account and all data"
            icon={AlertTriangle}
            onPress={() => {
              haptic.medium();
              setShowAccountConfirm(true);
            }}
            destructive
          />
        </SettingsSection>

        {/* Delete Data Confirmation */}
        {showDeleteConfirm && (
          <View
            style={{
              marginHorizontal: spacing.md,
              marginTop: spacing.lg,
              backgroundColor: palette.glassLow,
              borderRadius: 12,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: palette.error,
            }}
          >
            <Text
              style={{
                fontFamily: typography.bodyMedium,
                fontSize: 14,
                color: palette.error,
                marginBottom: spacing.sm,
              }}
            >
              Type "DELETE MY DATA" to confirm
            </Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE MY DATA"
              placeholderTextColor={palette.starlightDim}
              autoCapitalize="characters"
              style={{
                fontFamily: typography.body,
                fontSize: 15,
                color: palette.starlight,
                backgroundColor: palette.void,
                borderRadius: 8,
                padding: spacing.sm,
                marginBottom: spacing.sm,
              }}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <FluidButton
                  title={deleting ? "Deleting..." : "Delete Everything"}
                  onPress={handleDeleteData}
                  variant="destructive"
                  disabled={deleting || deleteConfirmText !== "DELETE MY DATA"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FluidButton
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Delete Account Confirmation */}
        {showAccountConfirm && (
          <View
            style={{
              marginHorizontal: spacing.md,
              marginTop: spacing.lg,
              backgroundColor: palette.glassLow,
              borderRadius: 12,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: palette.error,
            }}
          >
            <Text
              style={{
                fontFamily: typography.bodyMedium,
                fontSize: 14,
                color: palette.error,
                marginBottom: spacing.sm,
              }}
            >
              Type "DELETE MY ACCOUNT" to confirm
            </Text>
            <TextInput
              value={deleteAccountText}
              onChangeText={setDeleteAccountText}
              placeholder="DELETE MY ACCOUNT"
              placeholderTextColor={palette.starlightDim}
              autoCapitalize="characters"
              style={{
                fontFamily: typography.body,
                fontSize: 15,
                color: palette.starlight,
                backgroundColor: palette.void,
                borderRadius: 8,
                padding: spacing.sm,
                marginBottom: spacing.sm,
              }}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <FluidButton
                  title={deleting ? "Deleting..." : "Delete Account"}
                  onPress={handleDeleteAccount}
                  variant="destructive"
                  disabled={
                    deleting || deleteAccountText !== "DELETE MY ACCOUNT"
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <FluidButton
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    setShowAccountConfirm(false);
                    setDeleteAccountText("");
                  }}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
