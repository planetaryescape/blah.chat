import {
  INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  type IntegrationCategory,
} from "@blah-chat/shared/integrations";
import { useAuth } from "@clerk/clerk-expo";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Link2, Plus, Search, Unlink } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
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
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { FluidButton } from "@/components/ui/FluidButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { queryClient } from "@/lib/cache/queryClient";
import { haptic } from "@/lib/haptics";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { palette, spacing, typography } from "@/lib/theme/designSystem";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

const STATUS_COLORS: Record<string, string> = {
  active: palette.success,
  initiated: palette.roseQuartz,
  expired: palette.starlightDim,
  failed: palette.error,
};

const SORTED_CATEGORIES = Object.entries(INTEGRATION_CATEGORIES)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([key, val]) => ({ key: key as IntegrationCategory, label: val.label }));

export default function IntegrationsScreen() {
  const { getToken } = useAuth();
  const connectionsQuery = useQuery({
    queryKey: ["mobile", "composio-connections"],
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.listComposioConnections();
    },
  });
  const initiateConnectionMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const client = createMobileSdkClient(() => getToken());
      return client.initiateComposioConnection({
        integrationId,
        redirectUrl: "blahchat://composio/callback",
      });
    },
  });
  const revokeConnectionMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const client = createMobileSdkClient(() => getToken());
      return client.revokeComposioConnection({ integrationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mobile", "composio-connections"],
      });
    },
  });
  const connections = connectionsQuery.data;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    IntegrationCategory | "all"
  >("all");
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const connectedIds = useMemo(() => {
    if (!connections) return new Set<string>();
    return new Set(
      connections.map((c: { integrationId: string }) => c.integrationId),
    );
  }, [connections]);

  const filteredIntegrations = useMemo(() => {
    let filtered = INTEGRATIONS;
    if (activeCategory !== "all") {
      filtered = filtered.filter((i) => i.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [activeCategory, searchQuery]);

  const { run: runConnect } = useAsyncAction(
    async (integrationId: string) => {
      const result =
        await initiateConnectionMutation.mutateAsync(integrationId);
      if (result.redirectUrl) {
        await WebBrowser.openAuthSessionAsync(
          result.redirectUrl,
          "blahchat://composio/callback",
        );
      }
      await queryClient.invalidateQueries({
        queryKey: ["mobile", "composio-connections"],
      });
      setSheetOpen(false);
    },
    {
      onError: () =>
        Alert.alert("Error", "Failed to start connection. Please try again."),
    },
  );

  const handleConnect = useCallback(
    async (integrationId: string) => {
      haptic.medium();
      setConnectingId(integrationId);
      await runConnect(integrationId);
      setConnectingId(null);
    },
    [runConnect],
  );

  const handleDisconnect = useCallback(
    (integrationId: string, name: string) => {
      Alert.alert("Disconnect", `Disconnect ${name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            haptic.medium();
            try {
              await revokeConnectionMutation.mutateAsync(integrationId);
            } catch {
              Alert.alert("Error", "Failed to disconnect.");
            }
          },
        },
      ]);
    },
    [revokeConnectionMutation],
  );

  const rightAction = (
    <TouchableOpacity
      onPress={() => {
        haptic.light();
        setSheetOpen(true);
      }}
      style={{ padding: spacing.xs }}
    >
      <Plus size={22} color={palette.roseQuartz} />
    </TouchableOpacity>
  );

  const renderConnectionItem = useCallback(
    ({ item }: { item: NonNullable<typeof connections>[number] }) => {
      const statusColor = STATUS_COLORS[item.status] || palette.starlightDim;
      const isActive = item.status === "active";
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: palette.glassLow,
            borderRadius: 12,
            padding: spacing.md,
            marginBottom: spacing.sm,
            gap: spacing.sm,
          }}
        >
          <Link2 size={20} color={palette.starlightDim} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: typography.bodyMedium,
                fontSize: 14,
                color: palette.starlight,
              }}
            >
              {item.integrationName || item.integrationId}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                marginTop: 2,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: statusColor,
                }}
              />
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 11,
                  color: palette.starlightDim,
                }}
              >
                {item.status}
              </Text>
            </View>
          </View>
          {isActive ? (
            <AnimatedPressable
              onPress={() =>
                handleDisconnect(
                  item.integrationId,
                  item.integrationName || item.integrationId,
                )
              }
            >
              <Unlink size={18} color={palette.error} />
            </AnimatedPressable>
          ) : (
            <AnimatedPressable
              onPress={() => handleConnect(item.integrationId)}
            >
              <Text
                style={{
                  fontFamily: typography.bodyMedium,
                  fontSize: 12,
                  color: palette.roseQuartz,
                }}
              >
                {item.status === "expired" ? "Reconnect" : "Connect"}
              </Text>
            </AnimatedPressable>
          )}
        </View>
      );
    },
    [handleConnect, handleDisconnect],
  );

  type CategoryItem = { key: "all" | IntegrationCategory; label: string };

  const renderCategoryItem = useCallback(
    ({ item }: { item: CategoryItem }) => (
      <AnimatedPressable
        onPress={() => {
          haptic.selection();
          setActiveCategory(item.key);
        }}
        style={{
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor:
            activeCategory === item.key
              ? palette.roseQuartzDim
              : palette.glassLow,
        }}
      >
        <Text
          style={{
            fontFamily: typography.bodyMedium,
            fontSize: 12,
            color:
              activeCategory === item.key
                ? palette.starlight
                : palette.starlightDim,
          }}
        >
          {item.label}
        </Text>
      </AnimatedPressable>
    ),
    [activeCategory],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader
        title="Integrations"
        leftAction="back"
        rightAction={rightAction}
      />

      {connections === undefined ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      ) : connections.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          <Link2 size={48} color={palette.starlightDim} strokeWidth={1.5} />
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 16,
              color: palette.starlight,
              marginTop: spacing.md,
              textAlign: "center",
            }}
          >
            No connected services
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
            Tap + to browse and connect services.
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <FluidButton
              title="Browse Integrations"
              onPress={() => {
                haptic.light();
                setSheetOpen(true);
              }}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={renderConnectionItem}
        />
      )}

      {/* Add Integration Bottom Sheet */}
      {sheetOpen && (
        <BottomSheet
          enablePanDownToClose
          snapPoints={["80%"]}
          onClose={() => {
            setSheetOpen(false);
            setSearchQuery("");
            setActiveCategory("all");
          }}
          backgroundStyle={{ backgroundColor: palette.nebula }}
          handleIndicatorStyle={{ backgroundColor: palette.glassBorder }}
          backdropComponent={renderStandardBackdrop}
        >
          <BottomSheetScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          >
            <Text
              style={{
                fontFamily: typography.heading,
                fontSize: 16,
                color: palette.starlight,
                marginBottom: spacing.md,
              }}
            >
              Add Integration
            </Text>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: palette.glassLow,
                borderRadius: 8,
                paddingHorizontal: spacing.sm,
                marginBottom: spacing.md,
              }}
            >
              <Search size={16} color={palette.starlightDim} />
              <TextInput
                placeholder="Search services..."
                placeholderTextColor={palette.starlightDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  fontFamily: typography.body,
                  fontSize: 14,
                  color: palette.starlight,
                  paddingVertical: spacing.sm,
                  marginLeft: spacing.xs,
                }}
              />
            </View>

            {/* Category filter chips */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { key: "all" as const, label: "All" },
                ...SORTED_CATEGORIES,
              ]}
              keyExtractor={(item) => item.key}
              style={{ marginBottom: spacing.md }}
              contentContainerStyle={{ gap: spacing.xs }}
              renderItem={renderCategoryItem}
            />

            {/* Integration list */}
            {filteredIntegrations.map((integration) => {
              const isConnected = connectedIds.has(integration.id);
              const isConnecting = connectingId === integration.id;
              return (
                <View
                  key={integration.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: palette.glassLow,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    gap: spacing.sm,
                  }}
                >
                  <Link2 size={18} color={palette.starlightDim} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: typography.bodyMedium,
                        fontSize: 14,
                        color: palette.starlight,
                      }}
                    >
                      {integration.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.body,
                        fontSize: 11,
                        color: palette.starlightDim,
                        marginTop: 1,
                      }}
                    >
                      {integration.description}
                    </Text>
                  </View>
                  {isConnected ? (
                    <Text
                      style={{
                        fontFamily: typography.body,
                        fontSize: 11,
                        color: palette.success,
                      }}
                    >
                      Connected
                    </Text>
                  ) : (
                    <AnimatedPressable
                      onPress={() => handleConnect(integration.id)}
                      style={{
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: palette.roseQuartzDim,
                      }}
                    >
                      {isConnecting ? (
                        <ActivityIndicator
                          size="small"
                          color={palette.starlight}
                        />
                      ) : (
                        <Text
                          style={{
                            fontFamily: typography.bodyMedium,
                            fontSize: 12,
                            color: palette.starlight,
                          }}
                        >
                          Connect
                        </Text>
                      )}
                    </AnimatedPressable>
                  )}
                </View>
              );
            })}

            {filteredIntegrations.length === 0 && (
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 14,
                  color: palette.starlightDim,
                  textAlign: "center",
                  marginTop: spacing.lg,
                }}
              >
                No integrations match your search.
              </Text>
            )}
          </BottomSheetScrollView>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
}
