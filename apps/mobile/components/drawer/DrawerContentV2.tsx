import { useUser } from "@clerk/clerk-expo";
import {
  type DrawerContentComponentProps,
  useDrawerStatus,
} from "@react-navigation/drawer";
import { FlashList } from "@shopify/flash-list";
import { toast } from "burnt";
import { useRouter, useSegments } from "expo-router";
import {
  Bookmark,
  FileText,
  FolderOpen,
  MessageSquarePlus,
  MessagesSquare,
  Search,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationActionSheet } from "@/components/drawer/ConversationActionSheet";
import { ProjectFilterSheet } from "@/components/drawer/ProjectFilterSheet";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { ShimmerPlaceholder } from "@/components/ui/ShimmerPlaceholder";
import { useSidebarAnalytics } from "@/lib/analytics/sidebar";
import type { Doc } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import {
  useArchiveConversation,
  useConversationSearch,
  useConversations,
  useDeleteConversation,
  useProjects,
  useRenameConversation,
  useToggleConversationPin,
  useToggleConversationStar,
} from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { groupConversationsByRecency } from "@/lib/utils/conversationGrouping";
import { getTimeAgo } from "@/lib/utils/time";

type Conversation = Doc<"conversations">;
type Project = Doc<"projects">;

type GroupedConversationItem =
  | {
      kind: "header";
      id: string;
      label: string;
    }
  | {
      kind: "conversation";
      id: string;
      conversation: Conversation;
    };

type ConversationWithTimestamp = Conversation & { lastMessageAt: number };

function getConversationTitle(conversation: Conversation): string {
  return conversation.title?.trim() || "Untitled chat";
}

function getConversationTimestamp(conversation: Conversation): number {
  if (typeof conversation.lastMessageAt === "number")
    return conversation.lastMessageAt;
  if (typeof conversation.updatedAt === "number") return conversation.updatedAt;
  if (typeof conversation.createdAt === "number") return conversation.createdAt;
  return Date.now();
}

function getProjectLabel(
  projectId: string | null,
  projects: Project[],
): string {
  if (projectId === null) return "All";
  if (projectId === "none") return "Unassigned";
  const project = projects.find((p) => p._id === projectId);
  return project?.name ?? "Project";
}

function DrawerTopBar({
  searchQuery,
  onSearchChange,
  onNewChat,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewChat: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <View
        style={{
          flex: 1,
          minHeight: 44,
          borderRadius: layout.radius.sm,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          backgroundColor: palette.glassLow,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Search size={18} color={palette.starlightDim} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search"
          accessibilityLabel="Search conversations"
          placeholderTextColor={palette.starlightDim}
          style={{
            flex: 1,
            minHeight: 44,
            color: palette.starlight,
            fontFamily: typography.body,
            fontSize: 16,
          }}
        />
      </View>

      <AnimatedPressable
        onPress={onNewChat}
        accessibilityRole="button"
        accessibilityLabel="Start new chat"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: palette.glassBorder,
          backgroundColor: palette.glassLow,
        }}
      >
        <MessageSquarePlus size={20} color={palette.starlight} />
      </AnimatedPressable>
    </View>
  );
}

function ConversationSectionHeader({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
      }}
    >
      <Text
        style={{
          fontFamily: typography.bodySemiBold,
          fontSize: 12,
          color: palette.starlightDim,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ConversationRow({
  conversation,
  isActive,
  onPress,
  onLongPress,
}: {
  conversation: Conversation;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={260}
      accessibilityRole="button"
      accessibilityLabel={`Open ${getConversationTitle(conversation)}`}
      style={{
        minHeight: 48,
        marginHorizontal: spacing.sm,
        marginBottom: 2,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: layout.radius.md,
        borderWidth: 1,
        borderColor: isActive ? "rgba(244, 224, 220, 0.45)" : "transparent",
        backgroundColor: isActive ? "rgba(244, 224, 220, 0.12)" : "transparent",
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
      >
        <MessagesSquare
          size={16}
          color={isActive ? palette.roseQuartz : palette.starlightDim}
        />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: typography.body,
            fontSize: 17,
            color: palette.starlight,
          }}
        >
          {getConversationTitle(conversation)}
        </Text>
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 12,
            color: palette.starlightDim,
          }}
        >
          {getTimeAgo(getConversationTimestamp(conversation))}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function ConversationSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <View
          key={item}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <ShimmerPlaceholder width={16} height={16} borderRadius={8} />
          <ShimmerPlaceholder width="72%" height={16} borderRadius={4} />
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
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: 42,
        marginHorizontal: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: layout.radius.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: isActive ? palette.glassLow : "transparent",
      }}
    >
      <Icon
        size={18}
        color={isActive ? palette.roseQuartz : palette.starlightDim}
      />
      <Text
        style={{
          fontFamily: isActive ? typography.bodySemiBold : typography.body,
          fontSize: 13,
          color: isActive ? palette.roseQuartz : palette.starlightDim,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function DrawerContentV2({ navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const routeSegments = segments as string[];
  const drawerStatus = useDrawerStatus();
  const { user } = useUser();

  const trackSidebarEvent = useSidebarAnalytics();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [actionConversation, setActionConversation] =
    useState<Conversation | null>(null);

  const wasOpenRef = useRef(false);
  const lastTrackedSearchRef = useRef("");

  const projects = useProjects();
  const conversations = useConversations(selectedProjectId);

  const {
    results: searchResults,
    isSearching,
    search,
  } = useConversationSearch(selectedProjectId, 250);

  const togglePin = useToggleConversationPin();
  const toggleStar = useToggleConversationStar();
  const archiveConversation = useArchiveConversation();
  const deleteConversation = useDeleteConversation();
  const renameConversation = useRenameConversation();

  const activeSection = routeSegments[1];
  const activeConversationFromRoute =
    routeSegments[1] === "chat" &&
    routeSegments[2] &&
    routeSegments[2] !== "new"
      ? routeSegments[2]
      : null;

  useEffect(() => {
    if (!activeConversationFromRoute) return;
    setSelectedConversationId(activeConversationFromRoute);
  }, [activeConversationFromRoute]);

  useEffect(() => {
    if (drawerStatus === "open" && !wasOpenRef.current) {
      trackSidebarEvent("sidebar_open", {
        section: activeSection,
      });
      wasOpenRef.current = true;
    }

    if (drawerStatus !== "open") {
      wasOpenRef.current = false;
    }
  }, [activeSection, drawerStatus, trackSidebarEvent]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      search(value);

      const trimmed = value.trim();
      if (!trimmed) {
        lastTrackedSearchRef.current = "";
        return;
      }

      if (trimmed !== lastTrackedSearchRef.current) {
        trackSidebarEvent("sidebar_search", {
          queryLength: trimmed.length,
          projectId: selectedProjectId ?? "all",
        });
        lastTrackedSearchRef.current = trimmed;
      }
    },
    [search, selectedProjectId, trackSidebarEvent],
  );

  const closeDrawer = useCallback(() => {
    navigation.closeDrawer();
  }, [navigation]);

  const handleNewChat = useCallback(() => {
    haptic.medium();
    router.push("/(drawer)/chat/new");
    closeDrawer();
  }, [closeDrawer, router]);

  const handleConversationPress = useCallback(
    (conversationId: string) => {
      haptic.light();
      setSelectedConversationId(conversationId);
      trackSidebarEvent(
        "sidebar_select_conversation",
        {
          source: searchQuery.trim() ? "search" : "list",
          projectId: selectedProjectId ?? "all",
        },
        conversationId,
      );
      router.push(`/(drawer)/chat/${conversationId}`);
      closeDrawer();
    },
    [closeDrawer, router, searchQuery, selectedProjectId, trackSidebarEvent],
  );

  const handleConversationLongPress = useCallback(
    (conversation: Conversation) => {
      haptic.selection();
      setActionConversation(conversation);
    },
    [],
  );

  const handleRunAction = useCallback(
    async (
      actionName: "rename" | "pin" | "star" | "archive" | "delete",
      action: () => Promise<void>,
      conversationId: string,
    ) => {
      try {
        await action();
        trackSidebarEvent(
          "sidebar_action",
          { action: actionName, projectId: selectedProjectId ?? "all" },
          conversationId,
        );
        haptic.success();
      } catch {
        haptic.error();
        toast({ preset: "error", title: "Could not update conversation" });
      }
    },
    [selectedProjectId, trackSidebarEvent],
  );

  const isSearchMode = searchQuery.trim().length > 0;

  const localSearchResults = useMemo(() => {
    if (!isSearchMode || !conversations) return [];
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((conversation) =>
      getConversationTitle(conversation).toLowerCase().includes(query),
    );
  }, [conversations, isSearchMode, searchQuery]);

  const displayedSearchResults = useMemo(() => {
    if (!isSearchMode) return [];
    if (isSearching) return localSearchResults;
    return searchResults ?? localSearchResults;
  }, [isSearchMode, isSearching, localSearchResults, searchResults]);

  const groupedConversationItems = useMemo<GroupedConversationItem[]>(() => {
    if (isSearchMode) {
      return displayedSearchResults.map((conversation) => ({
        kind: "conversation",
        id: `conversation-${conversation._id}`,
        conversation,
      }));
    }

    const baseConversations: ConversationWithTimestamp[] = (
      conversations ?? []
    ).map((conversation) => ({
      ...conversation,
      lastMessageAt: getConversationTimestamp(conversation),
    }));
    const grouped = groupConversationsByRecency(baseConversations);

    const flattened: GroupedConversationItem[] = [];
    for (const group of grouped) {
      flattened.push({
        kind: "header",
        id: `header-${group.label}`,
        label: group.label,
      });

      for (const conversation of group.items) {
        flattened.push({
          kind: "conversation",
          id: `conversation-${conversation._id}`,
          conversation,
        });
      }
    }

    return flattened;
  }, [conversations, displayedSearchResults, isSearchMode]);

  const hasProjects = (projects?.length ?? 0) > 0;
  const isFiltered = selectedProjectId !== null;
  const isLoading = conversations === undefined;
  const isActionSheetOpen = !!actionConversation;

  const renderConversationItem = useCallback(
    ({ item }: { item: GroupedConversationItem }) => {
      if (item.kind === "header") {
        return <ConversationSectionHeader label={item.label} />;
      }
      return (
        <ConversationRow
          conversation={item.conversation}
          isActive={selectedConversationId === item.conversation._id}
          onPress={() => handleConversationPress(item.conversation._id)}
          onLongPress={() => handleConversationLongPress(item.conversation)}
        />
      );
    },
    [
      selectedConversationId,
      handleConversationPress,
      handleConversationLongPress,
    ],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.void,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <DrawerTopBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onNewChat={handleNewChat}
      />

      {hasProjects ? (
        <View
          style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}
        >
          <AnimatedPressable
            onPress={() => {
              haptic.light();
              setIsProjectPickerOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Filter by project"
            style={{
              minHeight: 36,
              borderRadius: layout.radius.sm,
              borderWidth: 1,
              borderColor: isFiltered
                ? palette.roseQuartz
                : palette.glassBorder,
              backgroundColor: isFiltered
                ? palette.glassMedium
                : palette.glassLow,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
            }}
          >
            <FolderOpen
              size={16}
              color={isFiltered ? palette.roseQuartz : palette.starlightDim}
            />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontFamily: typography.body,
                fontSize: 13,
                color: isFiltered ? palette.starlight : palette.starlightDim,
              }}
            >
              {getProjectLabel(selectedProjectId, projects ?? [])}
            </Text>
          </AnimatedPressable>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        {!isSearchMode ? (
          <Text
            style={{
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xs,
              fontFamily: typography.bodySemiBold,
              fontSize: 13,
              color: palette.starlightDim,
            }}
          >
            Your chats
          </Text>
        ) : null}

        {isLoading ? (
          <ConversationSkeleton />
        ) : groupedConversationItems.length === 0 ? (
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
              {isSearchMode
                ? "No conversations match your search"
                : isFiltered
                  ? "No conversations in this project"
                  : "No conversations yet"}
            </Text>
          </View>
        ) : (
          <FlashList<GroupedConversationItem>
            data={groupedConversationItems}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationItem}
          />
        )}
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: palette.glassBorder,
          paddingVertical: spacing.xs,
        }}
      >
        <FooterItem
          icon={FileText}
          label="Notes"
          isActive={activeSection === "notes"}
          onPress={() => {
            haptic.light();
            router.push("/(drawer)/notes");
            closeDrawer();
          }}
        />
        <FooterItem
          icon={FolderOpen}
          label="Projects"
          isActive={activeSection === "projects"}
          onPress={() => {
            haptic.light();
            router.push("/(drawer)/projects");
            closeDrawer();
          }}
        />
        <FooterItem
          icon={Bookmark}
          label="Bookmarks"
          isActive={activeSection === "bookmarks"}
          onPress={() => {
            haptic.light();
            router.push("/(drawer)/bookmarks");
            closeDrawer();
          }}
        />
      </View>

      <AnimatedPressable
        onPress={() => {
          haptic.light();
          router.push("/(drawer)/settings");
          closeDrawer();
        }}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: palette.glassBorder,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        }}
      >
        {user?.imageUrl ? (
          <Image
            source={{ uri: user.imageUrl }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: palette.glassLow,
            }}
          />
        ) : (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.roseQuartz,
            }}
          >
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 12,
                color: palette.void,
              }}
            >
              {user?.firstName?.[0] ||
                user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
                "?"}
            </Text>
          </View>
        )}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: typography.body,
            fontSize: 15,
            color: palette.starlight,
          }}
        >
          {user?.firstName || "Settings"}
        </Text>
      </AnimatedPressable>

      <ProjectFilterSheet
        isOpen={isProjectPickerOpen}
        onClose={() => setIsProjectPickerOpen(false)}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        projects={projects ?? []}
      />

      <ConversationActionSheet
        isOpen={isActionSheetOpen}
        conversation={actionConversation}
        onClose={() => setActionConversation(null)}
        onRename={async (conversationId, title) => {
          await handleRunAction(
            "rename",
            () => renameConversation({ conversationId, title }),
            conversationId,
          );
        }}
        onTogglePin={async (conversationId) => {
          await handleRunAction(
            "pin",
            () => togglePin({ conversationId }),
            conversationId,
          );
        }}
        onToggleStar={async (conversationId) => {
          await handleRunAction(
            "star",
            () => toggleStar({ conversationId }),
            conversationId,
          );
        }}
        onArchive={async (conversationId) => {
          await handleRunAction(
            "archive",
            () => archiveConversation({ conversationId }),
            conversationId,
          );
        }}
        onDelete={async (conversationId) => {
          await handleRunAction(
            "delete",
            () => deleteConversation({ conversationId }),
            conversationId,
          );
        }}
      />
    </View>
  );
}
