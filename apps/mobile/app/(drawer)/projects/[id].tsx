import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MessageSquare, Paperclip, Plus, Trash2 } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ProjectFileCard } from "@/components/projects/ProjectFileCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";
import { uploadToConvex } from "@/lib/upload";

interface Project {
  _id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  updatedAt: number;
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as Id<"projects">;
  const router = useRouter();
  const formRef = useRef<BottomSheetModal>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const project = useQuery(api.projects.get, { id: projectId }) as
    | Project
    | null
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const updateProject = useMutation(api.projects.update);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const deleteProject = useMutation(api.projects.deleteProject);

  // File-related queries and mutations
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const resources = useQuery(api.projects.resources.getProjectResources, {
    projectId,
  }) as
    | {
        files: Array<{
          _id: string;
          name: string;
          mimeType: string;
          size: number;
        }>;
      }
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const saveFile = useMutation(api.files.saveFile);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const addFileToProject = useMutation(api.projects.files.addFileToProject);
  const removeFileFromProject = useMutation(
    // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
    api.projects.files.removeFileFromProject,
  );

  const [isUploading, setIsUploading] = useState(false);

  const handleStartEdit = useCallback(() => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description ?? "");
      setEditSystemPrompt(project.systemPrompt ?? "");
      setIsEditing(true);
    }
  }, [project]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditName("");
    setEditDescription("");
    setEditSystemPrompt("");
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving || !editName.trim()) return;

    setIsSaving(true);
    try {
      await (
        updateProject as (args: {
          id: Id<"projects">;
          name?: string;
          description?: string;
          systemPrompt?: string;
        }) => Promise<void>
      )({
        id: projectId,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        systemPrompt: editSystemPrompt.trim() || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    projectId,
    editName,
    editDescription,
    editSystemPrompt,
    isSaving,
    updateProject,
  ]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Project",
      "Are you sure you want to delete this project? Conversations will be unlinked but not deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await (
              deleteProject as (args: { id: Id<"projects"> }) => Promise<void>
            )({ id: projectId });
            router.back();
          },
        },
      ],
    );
  }, [projectId, deleteProject, router]);

  const handleUploadFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setIsUploading(true);
      haptics.light();

      // Upload to Convex storage
      const storageId = await uploadToConvex({
        fileUri: file.uri,
        generateUploadUrl: generateUploadUrl as () => Promise<string>,
        mimeType: file.mimeType || "application/octet-stream",
      });

      // Save file record
      const fileId = await (
        saveFile as (args: {
          storageId: string;
          name: string;
          mimeType: string;
          size: number;
        }) => Promise<string>
      )({
        storageId,
        name: file.name,
        mimeType: file.mimeType || "application/octet-stream",
        size: file.size || 0,
      });

      // Link to project
      await (
        addFileToProject as (args: {
          projectId: Id<"projects">;
          fileId: Id<"files">;
        }) => Promise<void>
      )({
        projectId,
        fileId: fileId as Id<"files">,
      });

      haptics.success();
    } catch (error) {
      console.error("File upload failed:", error);
      Alert.alert(
        "Upload Failed",
        "Could not upload the file. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }, [projectId, generateUploadUrl, saveFile, addFileToProject]);

  const handleDeleteFile = useCallback(
    (fileId: string, fileName: string) => {
      Alert.alert("Remove File", `Remove "${fileName}" from this project?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            haptics.light();
            await (
              removeFileFromProject as (args: {
                projectId: Id<"projects">;
                fileId: Id<"files">;
              }) => Promise<void>
            )({
              projectId,
              fileId: fileId as Id<"files">,
            });
            haptics.success();
          },
        },
      ]);
    },
    [projectId, removeFileFromProject],
  );

  if (project === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </>
    );
  }

  if (project === null) {
    return (
      <>
        <Stack.Screen options={{ title: "Not Found" }} />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Project not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {isEditing ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Project name"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Brief description..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>System Prompt</Text>
              <TextInput
                style={[styles.input, styles.promptInput]}
                value={editSystemPrompt}
                onChangeText={setEditSystemPrompt}
                placeholder="Custom instructions for AI..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!editName.trim() || isSaving) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!editName.trim() || isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{project.name}</Text>

            {project.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{project.description}</Text>
              </View>
            )}

            {project.systemPrompt && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>System Prompt</Text>
                <View style={styles.promptBox}>
                  <Text style={styles.promptText}>{project.systemPrompt}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={handleStartEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Edit Project</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Conversations</Text>
              <View style={styles.emptyConversations}>
                <MessageSquare
                  size={32}
                  color={colors.border}
                  strokeWidth={1.5}
                />
                <Text style={styles.emptyText}>No conversations yet</Text>
                <Text style={styles.emptySubtext}>
                  Start a chat and assign it to this project
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Files</Text>
                <TouchableOpacity
                  onPress={handleUploadFile}
                  disabled={isUploading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Plus size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
              {resources?.files && resources.files.length > 0 ? (
                <View style={styles.filesList}>
                  {resources.files.map((file) => (
                    <ProjectFileCard
                      key={file._id}
                      file={file}
                      onDelete={() => handleDeleteFile(file._id, file.name)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyFiles}>
                  <Paperclip
                    size={32}
                    color={colors.border}
                    strokeWidth={1.5}
                  />
                  <Text style={styles.emptyText}>No files yet</Text>
                  <Text style={styles.emptySubtext}>
                    Tap + to attach files to this project
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ProjectForm
        ref={formRef}
        mode="edit"
        project={project}
        onSave={async (data) => {
          await (
            updateProject as (args: {
              id: Id<"projects">;
              name?: string;
              description?: string;
              systemPrompt?: string;
            }) => Promise<void>
          )({
            id: projectId,
            ...data,
          });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 22,
  },
  promptBox: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  promptText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
  editButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  editButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.foreground,
  },
  emptyConversations: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  filesList: {
    gap: spacing.xs,
  },
  emptyFiles: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    opacity: 0.7,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
  },
  descriptionInput: {
    minHeight: 80,
    paddingTop: spacing.sm + 2,
  },
  promptInput: {
    minHeight: 120,
    paddingTop: spacing.sm + 2,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  cancelButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.foreground,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
});
