import { api } from "@blah-chat/backend/convex/_generated/api";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { FolderOpen } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { spacing } from "@/lib/theme/spacing";

interface Project {
  _id: string;
  name: string;
  description?: string;
  updatedAt: number;
}

export default function ProjectsScreen() {
  const router = useRouter();
  const formRef = useRef<BottomSheetModal>(null);

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const projects = useQuery(api.projects.list) as Project[] | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const createProject = useMutation(api.projects.create);

  const handleCreate = useCallback(
    async (data: {
      name: string;
      description?: string;
      systemPrompt?: string;
    }) => {
      await (
        createProject as (args: {
          name: string;
          description?: string;
          systemPrompt?: string;
        }) => Promise<string>
      )(data);
    },
    [createProject],
  );

  const renderProject = useCallback(
    ({ item }: { item: Project }) => (
      <ProjectCard
        project={item}
        onPress={() => router.push(`/projects/${item._id}` as never)}
      />
    ),
    [router],
  );

  if (projects === undefined) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {projects.length === 0 ? (
        <EmptyState
          icon={
            <FolderOpen size={56} color={colors.border} strokeWidth={1.5} />
          }
          title="No projects yet"
          subtitle="Create a project to organize your chats"
        />
      ) : (
        <FlashList
          data={projects}
          renderItem={renderProject}
          keyExtractor={(item: Project) => item._id}
          // @ts-ignore - FlashList estimatedItemSize prop
          estimatedItemSize={100}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB onPress={() => formRef.current?.present()} />

      <ProjectForm ref={formRef} mode="create" onSave={handleCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  list: {
    paddingVertical: spacing.sm,
  },
});
