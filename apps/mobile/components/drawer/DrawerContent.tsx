import { useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import { useRouter, useSegments } from "expo-router";
import {
  Bookmark,
  FileText,
  FolderOpen,
  MessageSquarePlus,
  MessagesSquare,
  Search,
  Settings,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { ShimmerPlaceholder } from "@/components/ui/ShimmerPlaceholder";
import type { Doc } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import {
  useConversationSearch,
  useConversations,
  useProjects,
} from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { getTimeAgo } from "@/lib/utils/time";
import { ProjectFilterSheet } from "./ProjectFilterSheet";

type Conversation = Doc<"conversations">;
type Project = Doc<"projects">;

function getProjectLabel(
  projectId: string | null,
  projects: Project[],
): string {
  if (projectId === null) return "All";
  if (projectId === "none") return "Unassigned";
  const project = projects.find((p) => p._id === projectId);
  return project?.name ?? "Project";
}

function ConversationItem({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: layout.radius.md,
        marginHorizontal: spacing.sm,
        marginBottom: spacing.xs,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
      >
        <MessagesSquare size={18} color={palette.starlightDim} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: typography.body,
            fontSize: 14,
            color: palette.starlight,
          }}
        >
          {conversation.title}
        </Text>
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 12,
            color: palette.starlightDim,
          }}
        >
          {getTimeAgo(conversation.lastMessageAt)}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function ConversationSkeleton() {
  return (
    <View
      style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.sm,
          }}
        >
          <ShimmerPlaceholder width={18} height={18} borderRadius={4} />
          <ShimmerPlaceholder width="100%" height={16} borderRadius={4} />
          <ShimmerPlaceholder width={24} height={12} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

function FooterItem({
  icon: Icon,
  label,
  onPress,
  isActive,
}: {
  icon: typeof FileText;
  label: string;
  onPress: () => void;
  isActive: boolean;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        marginHorizontal: spacing.sm,
        borderRadius: layout.radius.md,
        backgroundColor: isActive ? palette.glassLow : "transparent",
      }}
    >
      <Icon
        size={20}
        color={isActive ? palette.roseQuartz : palette.starlightDim}
      />
      <Text
        style={{
          fontFamily: isActive ? typography.bodySemiBold : typography.body,
          fontSize: 14,
          color: isActive ? palette.roseQuartz : palette.starlightDim,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function DrawerContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const routeSegments = segments as string[];
  const { user } = useUser();
  const projects = useProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);

  const conversations = useConversations(selectedProjectId);
  const {
    results: searchResults,
    isSearching,
    search,
  } = useConversationSearch(selectedProjectId);

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      search(text);
    },
    [search],
  );

  // Show search results when actively searching, otherwise show all conversations
  const displayedConversations = searchQuery.trim()
    ? searchResults
    : conversations;

  const handleNewChat = useCallback(() => {
    haptic.medium();
    router.push("/(drawer)/chat/new");
  }, [router]);

  const handleConversationPress = useCallback(
    (conversationId: string) => {
      haptic.light();
      router.push(`/(drawer)/chat/${conversationId}`);
    },
    [router],
  );

  const handleOpenProjectPicker = useCallback(() => {
    haptic.light();
    setIsProjectPickerOpen(true);
  }, []);

  const handleCloseProjectPicker = useCallback(() => {
    setIsProjectPickerOpen(false);
  }, []);

  const handleSelectProject = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
  }, []);

  const isLoading = conversations === undefined;
  const hasProjects = projects && projects.length > 0;
  const isFiltered = selectedProjectId !== null;
  const activeSection = routeSegments[1];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.void,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* User Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: palette.glassBorder,
          gap: spacing.md,
        }}
      >
        {user?.imageUrl ? (
          <Image
            source={{ uri: user.imageUrl }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: palette.glassLow,
            }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: palette.roseQuartz,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 16,
                color: palette.void,
              }}
            >
              {user?.firstName?.[0] ||
                user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
                "?"}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 16,
              color: palette.starlight,
            }}
          >
            {user?.firstName || "User"}
          </Text>
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 12,
              color: palette.starlightDim,
            }}
            numberOfLines={1}
          >
            {user?.emailAddresses?.[0]?.emailAddress}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View
        style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.md,
              paddingHorizontal: spacing.sm,
              gap: spacing.xs,
            }}
          >
            <Search size={18} color={palette.starlightDim} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search conversations..."
              placeholderTextColor={palette.starlightDim}
              style={{
                flex: 1,
                fontFamily: typography.body,
                fontSize: 14,
                color: palette.starlight,
                paddingVertical: spacing.sm,
              }}
            />
          </View>
          <AnimatedPressable
            onPress={handleNewChat}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.glassLow,
              borderWidth: 1,
              borderColor: palette.glassBorder,
            }}
          >
            <MessageSquarePlus size={20} color={palette.starlight} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Project Filter Button */}
      {hasProjects && (
        <View
          style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}
        >
          <AnimatedPressable
            onPress={handleOpenProjectPicker}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: isFiltered
                ? palette.glassMedium
                : palette.glassLow,
              borderRadius: layout.radius.md,
              borderWidth: 1,
              borderColor: isFiltered
                ? palette.roseQuartz
                : palette.glassBorder,
              gap: spacing.sm,
            }}
          >
            <FolderOpen
              size={18}
              color={isFiltered ? palette.roseQuartz : palette.starlightDim}
            />
            <Text
              style={{
                flex: 1,
                fontFamily: typography.body,
                fontSize: 14,
                color: isFiltered ? palette.starlight : palette.starlightDim,
              }}
            >
              {getProjectLabel(selectedProjectId, projects ?? [])}
            </Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Conversations List */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: typography.bodySemiBold,
            fontSize: 12,
            color: palette.starlightDim,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Recent Conversations
        </Text>

        {isLoading || isSearching ? (
          <ConversationSkeleton />
        ) : !displayedConversations || displayedConversations.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.xl,
            }}
          >
            <MessagesSquare
              size={32}
              color={palette.starlightDim}
              strokeWidth={1.5}
            />
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 14,
                color: palette.starlightDim,
                marginTop: spacing.sm,
                textAlign: "center",
              }}
            >
              {searchQuery
                ? "No conversations match your search"
                : isFiltered
                  ? "No conversations in this project"
                  : "No conversations yet"}
            </Text>
          </View>
        ) : (
          <FlashList<Conversation>
            data={displayedConversations ?? []}
            renderItem={({ item }) => (
              <ConversationItem
                conversation={item}
                onPress={() => handleConversationPress(item._id)}
              />
            )}
            keyExtractor={(item) => item._id}
          />
        )}
      </View>

      {/* Footer */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: palette.glassBorder,
          paddingVertical: spacing.sm,
        }}
      >
        <FooterItem
          icon={FileText}
          label="Notes"
          isActive={activeSection === "notes"}
          onPress={() => {
            haptic.light();
            router.push("/(drawer)/notes");
          }}
        />
        <FooterItem
          icon={FolderOpen}
          label="Projects"
          isActive={activeSection === "projects"}
          onPress={() => {
            haptic.light();
            router.push("/(drawer)/projects");
          }}
        />
        <FooterItem
          icon={Bookmark}
          label="Bookmarks"
          isActive={activeSection === "bookmarks"}
          onPress={() => {
            haptic.light();
            router.push("/(drawer)/bookmarks");
          }}
        />
        <FooterItem
          icon={Settings}
          label="Settings"
          isActive={activeSection === "settings"}
          onPress={() => {
            haptic.light();
            router.push("/(drawer)/settings");
          }}
        />
      </View>

      {/* Project Filter Sheet */}
      <ProjectFilterSheet
        isOpen={isProjectPickerOpen}
        onClose={handleCloseProjectPicker}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        projects={projects ?? []}
      />
    </View>
  );
}
