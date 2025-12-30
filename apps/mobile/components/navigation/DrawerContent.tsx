import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "expo-router";
import {
  Bookmark,
  FileText,
  FolderOpen,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
} from "lucide-react-native";
import { useCallback } from "react";
import {
  ActionSheetIOS,
  Alert,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

type Conversation = Doc<"conversations">;

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const conversations = useQuery(api.conversations.list) as
    | Conversation[]
    | undefined;

  // Mutations for conversation actions
  const togglePin = useMutation(
    // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
    api.conversations.togglePin,
  );
  const toggleStar = useMutation(
    // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
    api.conversations.toggleStar,
  );
  const archiveConversation = useMutation(
    // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
    api.conversations.archive,
  );
  const deleteConversation = useMutation(
    // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
    api.conversations.deleteConversation,
  );

  const handleConversationAction = useCallback(
    (conversation: Conversation) => {
      haptics.medium();

      const isPinned = conversation.pinned;
      const isStarred = conversation.starred;

      const options = [
        isPinned ? "Unpin" : "Pin",
        isStarred ? "Unstar" : "Star",
        "Archive",
        "Delete",
        "Cancel",
      ];

      const destructiveButtonIndex = 3;
      const cancelButtonIndex = 4;

      const handleAction = async (index: number) => {
        const convId = conversation._id as Id<"conversations">;
        try {
          if (index === 0) {
            await togglePin({ conversationId: convId });
            haptics.success();
          } else if (index === 1) {
            await toggleStar({ conversationId: convId });
            haptics.success();
          } else if (index === 2) {
            // Animate the list before archiving
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            await archiveConversation({ conversationId: convId });
            haptics.success();
          } else if (index === 3) {
            Alert.alert(
              "Delete Conversation",
              "This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    // Animate the list before deleting
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut,
                    );
                    haptics.heavy();
                    await deleteConversation({ conversationId: convId });
                    haptics.success();
                  },
                },
              ],
            );
          }
        } catch (error) {
          console.error("Failed to perform action:", error);
          haptics.error();
        }
      };

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            destructiveButtonIndex,
            cancelButtonIndex,
            title: conversation.title || "Untitled",
          },
          handleAction,
        );
      } else {
        Alert.alert(conversation.title || "Untitled", "Choose an action", [
          { text: isPinned ? "Unpin" : "Pin", onPress: () => handleAction(0) },
          {
            text: isStarred ? "Unstar" : "Star",
            onPress: () => handleAction(1),
          },
          { text: "Archive", onPress: () => handleAction(2) },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleAction(3),
          },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    },
    [togglePin, toggleStar, archiveConversation, deleteConversation],
  );

  const handleNewChat = () => {
    router.push("/chat/new");
    props.navigation.closeDrawer();
  };

  const handleConversation = (id: string) => {
    router.push(`/chat/${id}`);
    props.navigation.closeDrawer();
  };

  const handleSettings = () => {
    router.push("/settings");
    props.navigation.closeDrawer();
  };

  const handleHome = () => {
    router.push("/");
    props.navigation.closeDrawer();
  };

  const handleProjects = () => {
    router.push("/projects" as never);
    props.navigation.closeDrawer();
  };

  const handleBookmarks = () => {
    router.push("/bookmarks" as never);
    props.navigation.closeDrawer();
  };

  const handleSearch = () => {
    router.push("/search" as never);
    props.navigation.closeDrawer();
  };

  const handleNotes = () => {
    router.push("/notes" as never);
    props.navigation.closeDrawer();
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isActive = pathname === `/chat/${item._id}`;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isActive && styles.conversationItemActive,
        ]}
        onPress={() => handleConversation(item._id)}
        onLongPress={() => handleConversationAction(item)}
        delayLongPress={400}
        activeOpacity={0.7}
      >
        <View style={styles.conversationRow}>
          <Text
            style={[
              styles.conversationTitle,
              isActive && styles.conversationTitleActive,
            ]}
            numberOfLines={1}
          >
            {item.title || "Untitled"}
          </Text>
          <View style={styles.badges}>
            {item.pinned && (
              <Pin
                size={12}
                color={colors.mutedForeground}
                fill={colors.mutedForeground}
              />
            )}
            {item.starred && (
              <Star size={12} color={colors.star} fill={colors.star} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with branding and New Chat */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoContainer}>
            <Sparkles size={18} color={colors.primary} />
          </View>
          <Text style={styles.brandText}>blah.chat</Text>
        </View>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChat}
          activeOpacity={0.8}
        >
          <Plus size={18} color={colors.primaryForeground} />
          <Text style={styles.newChatText}>New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* All Chats nav item */}
      <TouchableOpacity
        style={[styles.navItem, pathname === "/" && styles.navItemActive]}
        onPress={handleHome}
        activeOpacity={0.7}
      >
        <MessageSquare
          size={18}
          color={pathname === "/" ? colors.primary : colors.mutedForeground}
        />
        <Text
          style={[
            styles.navItemText,
            pathname === "/" && styles.navItemTextActive,
          ]}
        >
          All Chats
        </Text>
      </TouchableOpacity>

      {/* Projects nav item */}
      <TouchableOpacity
        style={[
          styles.navItem,
          pathname.startsWith("/projects") && styles.navItemActive,
        ]}
        onPress={handleProjects}
        activeOpacity={0.7}
      >
        <FolderOpen
          size={18}
          color={
            pathname.startsWith("/projects")
              ? colors.primary
              : colors.mutedForeground
          }
        />
        <Text
          style={[
            styles.navItemText,
            pathname.startsWith("/projects") && styles.navItemTextActive,
          ]}
        >
          Projects
        </Text>
      </TouchableOpacity>

      {/* Bookmarks nav item */}
      <TouchableOpacity
        style={[
          styles.navItem,
          pathname === "/bookmarks" && styles.navItemActive,
        ]}
        onPress={handleBookmarks}
        activeOpacity={0.7}
      >
        <Bookmark
          size={18}
          color={
            pathname === "/bookmarks" ? colors.primary : colors.mutedForeground
          }
        />
        <Text
          style={[
            styles.navItemText,
            pathname === "/bookmarks" && styles.navItemTextActive,
          ]}
        >
          Bookmarks
        </Text>
      </TouchableOpacity>

      {/* Search nav item */}
      <TouchableOpacity
        style={[styles.navItem, pathname === "/search" && styles.navItemActive]}
        onPress={handleSearch}
        activeOpacity={0.7}
      >
        <Search
          size={18}
          color={
            pathname === "/search" ? colors.primary : colors.mutedForeground
          }
        />
        <Text
          style={[
            styles.navItemText,
            pathname === "/search" && styles.navItemTextActive,
          ]}
        >
          Search
        </Text>
      </TouchableOpacity>

      {/* Conversations list */}
      <View style={styles.conversationsList}>
        <Text style={styles.sectionTitle}>Recent</Text>
        {conversations && conversations.length > 0 ? (
          <FlashList
            data={conversations.slice(0, 20)}
            renderItem={renderConversation}
            keyExtractor={(item) => item._id}
          />
        ) : (
          <View style={styles.emptyState}>
            <MessageSquare size={32} color={colors.border} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Start a new chat to begin</Text>
          </View>
        )}
      </View>

      {/* Footer with Notes and Settings */}
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}
      >
        <TouchableOpacity
          style={[
            styles.navItem,
            pathname.startsWith("/notes") && styles.navItemActive,
          ]}
          onPress={handleNotes}
          activeOpacity={0.7}
        >
          <FileText
            size={18}
            color={
              pathname.startsWith("/notes")
                ? colors.primary
                : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.navItemText,
              pathname.startsWith("/notes")
                ? styles.navItemTextActive
                : styles.navItemTextMuted,
            ]}
          >
            Notes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navItem,
            pathname === "/settings" && styles.navItemActive,
          ]}
          onPress={handleSettings}
          activeOpacity={0.7}
        >
          <Settings
            size={18}
            color={
              pathname === "/settings" ? colors.primary : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.navItemText,
              pathname === "/settings"
                ? styles.navItemTextActive
                : styles.navItemTextMuted,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.foreground,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  newChatText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.primaryForeground,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
  navItemActive: {
    backgroundColor: `${colors.primary}15`,
  },
  navItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  navItemTextActive: {
    color: colors.primary,
  },
  navItemTextMuted: {
    color: colors.mutedForeground,
  },
  conversationsList: {
    flex: 1,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  conversationItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.sm,
    marginVertical: 1,
    borderRadius: radius.md,
  },
  conversationItemActive: {
    backgroundColor: `${colors.primary}15`,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  conversationTitle: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
  },
  conversationTitleActive: {
    fontFamily: fonts.bodyMedium,
    color: colors.primary,
  },
  badges: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
});
