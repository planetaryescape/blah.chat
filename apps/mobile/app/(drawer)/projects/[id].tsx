import { useLocalSearchParams, useRouter } from "expo-router";
import { FileText, FolderOpen, MessageSquare } from "lucide-react-native";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import type { Doc, Id } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import {
  useConversations,
  useProject,
  useProjectStats,
  useSearchNotes,
} from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { getTimeAgo } from "@/lib/utils/time";

type Project = Doc<"projects">;
type Conversation = Doc<"conversations">;
type Note = Doc<"notes">;

type ProjectStats = {
  conversationCount: number;
  noteCount: number;
  fileCount: number;
  activeTaskCount: number;
  taskStats: {
    total: number;
    active: number;
    completed: number;
  };
  lastActivityAt: number;
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "47%",
        backgroundColor: palette.glassLow,
        borderRadius: layout.radius.md,
        borderWidth: 1,
        borderColor: palette.glassBorder,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <Text
        style={{
          fontFamily: typography.heading,
          fontSize: 20,
          color: palette.starlight,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: typography.body,
          fontSize: 12,
          color: palette.starlightDim,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const projectId = typeof id === "string" ? id : null;

  const project = useProject(
    projectId ? (projectId as Id<"projects">) : null,
  ) as Project | null | undefined;
  const stats = useProjectStats(
    projectId ? (projectId as Id<"projects">) : null,
  ) as ProjectStats | null | undefined;

  const conversations = useConversations(projectId);
  const notes = useSearchNotes("", {
    projectId: projectId ? (projectId as Id<"projects">) : undefined,
  });

  const projectConversations = useMemo(() => {
    if (!projectId || !conversations) return [];
    return conversations.filter(
      (conversation: Conversation) => conversation.projectId === projectId,
    );
  }, [projectId, conversations]);

  const projectNotes = useMemo(() => {
    if (!projectId || !notes) return [];
    return notes.filter((note: Note) => note.projectId === projectId);
  }, [projectId, notes]);

  const recentConversations = projectConversations.slice(0, 6);
  const recentNotes = projectNotes.slice(0, 6);
  const isLoading =
    project === undefined ||
    stats === undefined ||
    conversations === undefined ||
    notes === undefined;

  if (!projectId) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScreenHeader title="Project" leftAction="back" />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 14,
              color: palette.starlightDim,
            }}
          >
            Invalid project id.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScreenHeader title="Project" leftAction="back" />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScreenHeader title="Project" leftAction="back" />
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
            Project not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <ScreenHeader
        title={project.name}
        leftAction="back"
        onLeftPress={() => router.push("/(drawer)/projects")}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        {project.description ? (
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 14,
              color: palette.starlightDim,
              lineHeight: 20,
            }}
          >
            {project.description}
          </Text>
        ) : null}

        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 12,
            color: palette.starlightDim,
          }}
        >
          Last activity{" "}
          {getTimeAgo(
            stats?.lastActivityAt ||
              project.updatedAt ||
              project._creationTime ||
              Date.now(),
          )}
        </Text>

        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
        >
          <StatCard
            label="Conversations"
            value={stats?.conversationCount ?? projectConversations.length}
          />
          <StatCard
            label="Notes"
            value={stats?.noteCount ?? projectNotes.length}
          />
          <StatCard label="Files" value={stats?.fileCount ?? 0} />
          <StatCard label="Active tasks" value={stats?.activeTaskCount ?? 0} />
        </View>

        <View>
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 13,
              color: palette.starlight,
              marginBottom: spacing.xs,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Conversations
          </Text>
          {recentConversations.length === 0 ? (
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 14,
                color: palette.starlightDim,
              }}
            >
              No conversations in this project.
            </Text>
          ) : (
            recentConversations.map((conversation) => (
              <AnimatedPressable
                key={conversation._id}
                onPress={() => {
                  haptic.light();
                  router.push(`/(drawer)/chat/${conversation._id}`);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: palette.glassLow,
                  borderRadius: layout.radius.md,
                  borderWidth: 1,
                  borderColor: palette.glassBorder,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  gap: spacing.sm,
                  marginBottom: spacing.xs,
                }}
              >
                <MessageSquare size={16} color={palette.starlightDim} />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: typography.bodySemiBold,
                      fontSize: 14,
                      color: palette.starlight,
                    }}
                  >
                    {conversation.title || "New Chat"}
                  </Text>
                  <Text
                    style={{
                      fontFamily: typography.body,
                      fontSize: 12,
                      color: palette.starlightDim,
                      marginTop: 2,
                    }}
                  >
                    {getTimeAgo(
                      conversation.lastMessageAt ||
                        conversation.updatedAt ||
                        conversation._creationTime ||
                        Date.now(),
                    )}
                  </Text>
                </View>
              </AnimatedPressable>
            ))
          )}
        </View>

        <View>
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 13,
              color: palette.starlight,
              marginBottom: spacing.xs,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Notes
          </Text>
          {recentNotes.length === 0 ? (
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 14,
                color: palette.starlightDim,
              }}
            >
              No notes in this project.
            </Text>
          ) : (
            recentNotes.map((note) => (
              <AnimatedPressable
                key={note._id}
                onPress={() => {
                  haptic.light();
                  router.push(`/(drawer)/notes/${note._id}`);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: palette.glassLow,
                  borderRadius: layout.radius.md,
                  borderWidth: 1,
                  borderColor: palette.glassBorder,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  gap: spacing.sm,
                  marginBottom: spacing.xs,
                }}
              >
                <FileText size={16} color={palette.starlightDim} />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: typography.bodySemiBold,
                      fontSize: 14,
                      color: palette.starlight,
                    }}
                  >
                    {note.title || "Untitled Note"}
                  </Text>
                  <Text
                    style={{
                      fontFamily: typography.body,
                      fontSize: 12,
                      color: palette.starlightDim,
                      marginTop: 2,
                    }}
                  >
                    {getTimeAgo(note.updatedAt || note.createdAt || Date.now())}
                  </Text>
                </View>
              </AnimatedPressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
