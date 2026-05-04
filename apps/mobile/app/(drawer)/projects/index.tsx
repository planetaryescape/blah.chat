import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { ChevronRight, FolderOpen } from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import type { Doc } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import { useProjects } from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { getTimeAgo } from "@/lib/utils/time";

type Project = Doc<"projects">;

function ProjectRow({
  project,
  onPress,
}: {
  project: Project;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        borderRadius: layout.radius.md,
        backgroundColor: palette.glassLow,
        borderWidth: 1,
        borderColor: palette.glassBorder,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
      >
        <FolderOpen size={18} color={palette.roseQuartz} />
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 15,
              color: palette.starlight,
            }}
          >
            {project.name}
          </Text>
          {project.description ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlightDim,
                marginTop: 2,
              }}
            >
              {project.description}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 12,
              color: palette.starlightDim,
              marginBottom: 2,
            }}
          >
            {getTimeAgo(
              project.updatedAt || project._creationTime || Date.now(),
            )}
          </Text>
          <ChevronRight size={16} color={palette.starlightDim} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function ProjectsListScreen() {
  const router = useRouter();
  const projects = useProjects();

  const handleProjectPress = useCallback(
    (projectId: string) => {
      haptic.light();
      router.push(`/(drawer)/projects/${projectId}`);
    },
    [router],
  );

  const isLoading = projects === undefined;

  const renderProjectItem = useCallback(
    ({ item }: { item: Project }) => (
      <ProjectRow project={item} onPress={() => handleProjectPress(item._id)} />
    ),
    [handleProjectPress],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader title="Projects" leftAction="menu" />

      {isLoading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      ) : !projects || projects.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          <FolderOpen size={36} color={palette.starlightDim} />
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 16,
              color: palette.starlight,
              marginTop: spacing.sm,
            }}
          >
            No projects yet
          </Text>
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 14,
              color: palette.starlightDim,
              textAlign: "center",
              marginTop: spacing.xs,
            }}
          >
            Create a project on web, then it will appear here.
          </Text>
        </View>
      ) : (
        <FlashList<Project>
          data={projects}
          renderItem={renderProjectItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
        />
      )}
    </SafeAreaView>
  );
}
