import { useAuth } from "@clerk/clerk-expo";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Copy, Key, Plus, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { FluidButton } from "@/components/ui/FluidButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { queryClient } from "@/lib/cache/queryClient";
import { haptic } from "@/lib/haptics";
import { palette, spacing, typography } from "@/lib/theme/designSystem";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

export default function ApiKeysScreen() {
  const { getToken } = useAuth();

  const keysQuery = useQuery({
    queryKey: ["mobile", "cli-api-keys"],
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.listCliApiKeys();
    },
  });
  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const client = createMobileSdkClient(() => getToken());
      return client.createCliApiKey({ name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "cli-api-keys"] });
    },
  });
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const client = createMobileSdkClient(() => getToken());
      return client.revokeCliApiKey(keyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "cli-api-keys"] });
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    haptic.medium();
    try {
      const result = await createKeyMutation.mutateAsync(keyName.trim());
      setNewKey(result.key);
      setKeyName("");
    } catch {
      Alert.alert("Error", "Failed to create API key.");
    } finally {
      setCreating(false);
    }
  }, [createKeyMutation, keyName]);

  const handleRevoke = useCallback(
    (keyId: string, prefix: string) => {
      Alert.alert(
        "Revoke Key",
        `Revoke key ${prefix}...? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Revoke",
            style: "destructive",
            onPress: async () => {
              haptic.medium();
              try {
                await revokeKeyMutation.mutateAsync(keyId);
              } catch {
                Alert.alert("Error", "Failed to revoke key.");
              }
            },
          },
        ],
      );
    },
    [revokeKeyMutation],
  );

  const handleCopy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    haptic.success();
    Alert.alert("Copied", "Key copied to clipboard.");
  }, []);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const rightAction = (
    <TouchableOpacity
      onPress={() => {
        haptic.light();
        setNewKey(null);
        setCreateOpen(true);
      }}
      style={{ padding: spacing.xs }}
    >
      <Plus size={22} color={palette.roseQuartz} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader
        title="API Keys"
        leftAction="back"
        rightAction={rightAction}
      />

      {/* Key List */}
      {keysQuery.data === undefined ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      ) : keysQuery.data.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          <Key size={48} color={palette.starlightDim} strokeWidth={1.5} />
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 16,
              color: palette.starlight,
              marginTop: spacing.md,
              textAlign: "center",
            }}
          >
            No API keys
          </Text>
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 14,
              color: palette.starlightDim,
              marginTop: spacing.xs,
              textAlign: "center",
            }}
          >
            Create a key to use the CLI or API.
          </Text>
        </View>
      ) : (
        <FlatList
          data={keysQuery.data}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: palette.glassLow,
                borderRadius: 12,
                padding: spacing.md,
                marginBottom: spacing.sm,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.bodyMedium,
                    fontSize: 14,
                    color: palette.starlight,
                  }}
                >
                  {item.name || "Unnamed Key"}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRevoke(item._id, item.keyPrefix)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={palette.error} />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  fontFamily: typography.mono || typography.body,
                  fontSize: 12,
                  color: palette.starlightDim,
                  marginTop: 4,
                }}
              >
                {item.keyPrefix}...
              </Text>
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 11,
                  color: palette.starlightDim,
                  marginTop: 2,
                }}
              >
                Created {formatDate(item.createdAt)}
                {item.lastUsedAt
                  ? ` · Last used ${formatDate(item.lastUsedAt)}`
                  : " · Never used"}
              </Text>
            </View>
          )}
        />
      )}

      {/* Create Key Bottom Sheet */}
      {createOpen && (
        <BottomSheet
          enablePanDownToClose
          snapPoints={[newKey ? "45%" : "35%"]}
          onClose={() => {
            setCreateOpen(false);
            setNewKey(null);
          }}
          backgroundStyle={{ backgroundColor: palette.nebula }}
          handleIndicatorStyle={{ backgroundColor: palette.glassBorder }}
          backdropComponent={renderStandardBackdrop}
        >
          <BottomSheetView style={{ padding: spacing.md }}>
            {newKey ? (
              <>
                <Text
                  style={{
                    fontFamily: typography.heading,
                    fontSize: 16,
                    color: palette.starlight,
                    marginBottom: spacing.sm,
                  }}
                >
                  Key Created
                </Text>
                <Text
                  style={{
                    fontFamily: typography.body,
                    fontSize: 13,
                    color: palette.starlightDim,
                    marginBottom: spacing.md,
                  }}
                >
                  Copy this key now — it won't be shown again.
                </Text>
                <TouchableOpacity
                  onPress={() => handleCopy(newKey)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: palette.glassLow,
                    borderRadius: 8,
                    padding: spacing.sm,
                    gap: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: typography.mono || typography.body,
                      fontSize: 12,
                      color: palette.starlight,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {newKey}
                  </Text>
                  <Copy size={18} color={palette.roseQuartz} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text
                  style={{
                    fontFamily: typography.heading,
                    fontSize: 16,
                    color: palette.starlight,
                    marginBottom: spacing.md,
                  }}
                >
                  Create API Key
                </Text>
                <TextInput
                  placeholder="Key name (e.g. CLI, Raycast)"
                  placeholderTextColor={palette.starlightDim}
                  value={keyName}
                  onChangeText={setKeyName}
                  autoFocus
                  style={{
                    fontFamily: typography.body,
                    fontSize: 15,
                    color: palette.starlight,
                    backgroundColor: palette.glassLow,
                    borderRadius: 8,
                    padding: spacing.sm,
                    marginBottom: spacing.md,
                  }}
                />
                <FluidButton
                  title={creating ? "Creating..." : "Create Key"}
                  onPress={handleCreate}
                  disabled={creating || !keyName.trim()}
                />
              </>
            )}
          </BottomSheetView>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
}
