import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Shield, Trash2, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
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

type KeyType = "vercelGateway" | "openRouter" | "groq" | "deepgram";

const KEY_LABELS: Record<KeyType, { label: string; placeholder: string }> = {
  vercelGateway: {
    label: "Vercel AI Gateway",
    placeholder: "sk-...",
  },
  openRouter: {
    label: "OpenRouter",
    placeholder: "sk-or-...",
  },
  groq: {
    label: "Groq",
    placeholder: "gsk_...",
  },
  deepgram: {
    label: "Deepgram (Voice)",
    placeholder: "dg-...",
  },
};

function KeyCard({
  keyType,
  isConfigured,
  lastValidated,
  onSave,
  onRemove,
}: {
  keyType: KeyType;
  isConfigured: boolean;
  lastValidated?: number;
  onSave: (key: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const info = KEY_LABELS[keyType];

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(value.trim());
      setValue("");
      setEditing(false);
    } catch {
      Alert.alert("Validation Failed", "The API key could not be validated.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    Alert.alert("Remove Key", `Remove ${info.label} key?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          haptic.medium();
          await onRemove();
        },
      },
    ]);
  };

  return (
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
          {info.label}
        </Text>
        {isConfigured ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Check size={14} color={palette.success} />
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 11,
                color: palette.success,
              }}
            >
              Configured
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <X size={14} color={palette.starlightDim} />
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 11,
                color: palette.starlightDim,
              }}
            >
              Not set
            </Text>
          </View>
        )}
      </View>

      {lastValidated && (
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 11,
            color: palette.starlightDim,
            marginTop: 2,
          }}
        >
          Validated{" "}
          {new Date(lastValidated).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </Text>
      )}

      {editing ? (
        <View style={{ marginTop: spacing.sm }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: palette.void,
              borderRadius: 8,
              paddingHorizontal: spacing.sm,
            }}
          >
            <TextInput
              placeholder={info.placeholder}
              placeholderTextColor={palette.starlightDim}
              value={value}
              onChangeText={setValue}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                fontFamily: typography.body,
                fontSize: 14,
                color: palette.starlight,
                paddingVertical: spacing.sm,
              }}
            />
            <TouchableOpacity onPress={() => setVisible(!visible)}>
              {visible ? (
                <EyeOff size={18} color={palette.starlightDim} />
              ) : (
                <Eye size={18} color={palette.starlightDim} />
              )}
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: spacing.sm,
              marginTop: spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <FluidButton
                title={saving ? "Validating..." : "Save"}
                onPress={handleSave}
                disabled={saving || !value.trim()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FluidButton
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setEditing(false);
                  setValue("");
                }}
              />
            </View>
          </View>
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            marginTop: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <FluidButton
              title={isConfigured ? "Update" : "Add Key"}
              variant="glass"
              onPress={() => setEditing(true)}
            />
          </View>
          {isConfigured && (
            <TouchableOpacity
              onPress={handleRemove}
              style={{
                padding: spacing.sm,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={18} color={palette.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function AdvancedSettingsScreen() {
  const { getToken } = useAuth();
  const configQuery = useQuery({
    queryKey: ["mobile", "byok-config"],
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.getByokConfig();
    },
  });
  const enableByokMutation = useMutation({
    mutationFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.enableByok();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "byok-config"] });
    },
  });
  const disableByokMutation = useMutation({
    mutationFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.disableByok();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "byok-config"] });
    },
  });
  const saveApiKeyMutation = useMutation({
    mutationFn: async (args: { keyType: KeyType; apiKey: string }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.saveByokApiKey(args);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "byok-config"] });
    },
  });
  const removeApiKeyMutation = useMutation({
    mutationFn: async (keyType: KeyType) => {
      const client = createMobileSdkClient(() => getToken());
      return client.removeByokApiKey({ keyType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "byok-config"] });
    },
  });
  const config = configQuery.data;
  const resolvedConfig = config ?? {
    _id: "pending",
    byokEnabled: false,
    hasVercelGatewayKey: false,
    hasOpenRouterKey: false,
    hasGroqKey: false,
    hasDeepgramKey: false,
    lastValidated: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const handleToggle = useCallback(
    async (enabled: boolean) => {
      haptic.medium();
      try {
        if (enabled) {
          if (!config?.hasVercelGatewayKey) {
            Alert.alert(
              "Gateway Key Required",
              "You need to configure a Vercel AI Gateway key first.",
            );
            return;
          }
          await enableByokMutation.mutateAsync();
        } else {
          await disableByokMutation.mutateAsync();
        }
      } catch {
        Alert.alert("Error", "Failed to update BYOK setting.");
      }
    },
    [config, disableByokMutation, enableByokMutation],
  );

  const handleSave = useCallback(
    (keyType: KeyType) => async (apiKey: string) => {
      await saveApiKeyMutation.mutateAsync({ keyType, apiKey });
      haptic.success();
    },
    [saveApiKeyMutation],
  );

  const handleRemove = useCallback(
    (keyType: KeyType) => async () => {
      await removeApiKeyMutation.mutateAsync(keyType);
      haptic.success();
    },
    [removeApiKeyMutation],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader title="Bring Your Own Keys" leftAction="back" />

      {config === undefined ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xxl,
          }}
        >
          {/* Master toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: palette.glassLow,
              borderRadius: 12,
              padding: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <Shield size={20} color={palette.roseQuartz} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text
                style={{
                  fontFamily: typography.bodyMedium,
                  fontSize: 15,
                  color: palette.starlight,
                }}
              >
                Use Own API Keys
              </Text>
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 12,
                  color: palette.starlightDim,
                  marginTop: 2,
                }}
              >
                Route requests through your own provider keys
              </Text>
            </View>
            <Switch
              value={resolvedConfig.byokEnabled}
              onValueChange={handleToggle}
              trackColor={{
                false: palette.glassMedium,
                true: palette.roseQuartzDim,
              }}
              thumbColor={
                resolvedConfig.byokEnabled
                  ? palette.roseQuartz
                  : palette.starlightDim
              }
            />
          </View>

          {/* Key cards */}
          {(
            ["vercelGateway", "openRouter", "groq", "deepgram"] as KeyType[]
          ).map((keyType) => {
            const isConfigured =
              keyType === "vercelGateway"
                ? resolvedConfig.hasVercelGatewayKey
                : keyType === "openRouter"
                  ? resolvedConfig.hasOpenRouterKey
                  : keyType === "groq"
                    ? resolvedConfig.hasGroqKey
                    : resolvedConfig.hasDeepgramKey;
            const lastValidated = resolvedConfig.lastValidated?.[keyType];
            return (
              <KeyCard
                key={keyType}
                keyType={keyType}
                isConfigured={isConfigured}
                lastValidated={lastValidated}
                onSave={handleSave(keyType)}
                onRemove={handleRemove(keyType)}
              />
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
