import { useAuth } from "@clerk/clerk-expo";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FileText,
  Globe,
  Loader2,
  Plus,
  Trash2,
  Type,
  Youtube,
} from "lucide-react-native";
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
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { FluidButton } from "@/components/ui/FluidButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { queryClient } from "@/lib/cache/queryClient";
import { haptic } from "@/lib/haptics";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { palette, spacing, typography } from "@/lib/theme/designSystem";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

const TYPE_ICONS: Record<string, typeof FileText> = {
  file: FileText,
  text: Type,
  web: Globe,
  youtube: Youtube,
};

const STATUS_COLORS: Record<string, string> = {
  completed: palette.success,
  processing: palette.roseQuartz,
  pending: palette.starlightDim,
  failed: palette.error,
};

export default function KnowledgeBankScreen() {
  const { getToken } = useAuth();
  const sourcesQuery = useQuery({
    queryKey: ["mobile", "knowledge-sources"],
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.listKnowledgeSources();
    },
  });
  const createSourceMutation = useMutation({
    mutationFn: async (
      args:
        | {
            type: "text";
            title: string;
            content: string;
          }
        | {
            type: "web";
            title: string;
            url: string;
          },
    ) => {
      const client = createMobileSdkClient(() => getToken());
      if (args.type === "text") {
        return client.createKnowledgeSource(args);
      }

      return client.createKnowledgeSource(args);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mobile", "knowledge-sources"],
      });
    },
  });
  const removeSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const client = createMobileSdkClient(() => getToken());
      return client.deleteKnowledgeSource(sourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mobile", "knowledge-sources"],
      });
    },
  });
  const sources = sourcesQuery.data;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [addType, setAddType] = useState<"text" | "url">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { run: handleAdd, isPending: saving } = useAsyncAction(
    async () => {
      if (!title.trim()) return;
      haptic.medium();
      if (addType === "text") {
        await createSourceMutation.mutateAsync({
          type: "text",
          title: title.trim(),
          content: content.trim(),
        });
      } else {
        await createSourceMutation.mutateAsync({
          type: "web",
          url: content.trim(),
          title: title.trim(),
        });
      }
      setTitle("");
      setContent("");
      setSheetOpen(false);
    },
    {
      onError: () =>
        Alert.alert("Error", "Failed to add source. Please try again."),
    },
  );

  const handleDelete = useCallback(
    (sourceId: string) => {
      Alert.alert("Delete Source", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            haptic.medium();
            try {
              await removeSourceMutation.mutateAsync(sourceId);
            } catch {
              Alert.alert("Error", "Failed to delete source.");
            }
          },
        },
      ]);
    },
    [removeSourceMutation],
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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader
        title="Knowledge Bank"
        leftAction="back"
        rightAction={rightAction}
      />

      {/* Source List */}
      {sources === undefined ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      ) : sources.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          <FileText size={48} color={palette.starlightDim} strokeWidth={1.5} />
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 16,
              color: palette.starlight,
              marginTop: spacing.md,
              textAlign: "center",
            }}
          >
            No knowledge sources
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
            Add text or web sources to give the AI context about your work.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item }) => {
            const Icon = TYPE_ICONS[item.type] || FileText;
            const statusColor =
              STATUS_COLORS[item.status] || palette.starlightDim;
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
                <Icon size={20} color={palette.starlightDim} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: typography.bodyMedium,
                      fontSize: 14,
                      color: palette.starlight,
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
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
                      {item.chunkCount ? ` · ${item.chunkCount} chunks` : ""}
                    </Text>
                  </View>
                </View>
                {item.status === "processing" ? (
                  <Loader2 size={18} color={palette.roseQuartz} />
                ) : (
                  <TouchableOpacity
                    onPress={() => handleDelete(item._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={18} color={palette.error} />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Add Source Bottom Sheet */}
      {sheetOpen && (
        <BottomSheet
          enablePanDownToClose
          snapPoints={["55%"]}
          onClose={() => setSheetOpen(false)}
          backgroundStyle={{ backgroundColor: palette.nebula }}
          handleIndicatorStyle={{ backgroundColor: palette.glassBorder }}
          backdropComponent={renderStandardBackdrop}
        >
          <BottomSheetScrollView
            contentContainerStyle={{ padding: spacing.md }}
          >
            <Text
              style={{
                fontFamily: typography.heading,
                fontSize: 16,
                color: palette.starlight,
                marginBottom: spacing.md,
              }}
            >
              Add Source
            </Text>

            {/* Type selector */}
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                marginBottom: spacing.md,
              }}
            >
              {(["text", "url"] as const).map((t) => (
                <AnimatedPressable
                  key={t}
                  onPress={() => {
                    haptic.selection();
                    setAddType(t);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: 8,
                    backgroundColor:
                      addType === t ? palette.roseQuartzDim : palette.glassLow,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.bodyMedium,
                      fontSize: 14,
                      color:
                        addType === t
                          ? palette.starlight
                          : palette.starlightDim,
                    }}
                  >
                    {t === "text" ? "Text" : "Web URL"}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>

            <TextInput
              placeholder="Title"
              placeholderTextColor={palette.starlightDim}
              value={title}
              onChangeText={setTitle}
              style={{
                fontFamily: typography.body,
                fontSize: 15,
                color: palette.starlight,
                backgroundColor: palette.glassLow,
                borderRadius: 8,
                padding: spacing.sm,
                marginBottom: spacing.sm,
              }}
            />

            <TextInput
              placeholder={addType === "text" ? "Content..." : "https://..."}
              placeholderTextColor={palette.starlightDim}
              value={content}
              onChangeText={setContent}
              multiline={addType === "text"}
              numberOfLines={addType === "text" ? 5 : 1}
              autoCapitalize={addType === "url" ? "none" : "sentences"}
              keyboardType={addType === "url" ? "url" : "default"}
              style={{
                fontFamily: typography.body,
                fontSize: 15,
                color: palette.starlight,
                backgroundColor: palette.glassLow,
                borderRadius: 8,
                padding: spacing.sm,
                marginBottom: spacing.md,
                minHeight: addType === "text" ? 100 : undefined,
                textAlignVertical: "top",
              }}
            />

            <FluidButton
              title={saving ? "Saving..." : "Add Source"}
              onPress={handleAdd}
              disabled={saving || !title.trim() || !content.trim()}
            />
          </BottomSheetScrollView>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
}
