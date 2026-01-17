import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  FolderOpen,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
  User,
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BentoCard } from "@/components/ui/BentoCard";
import { FluidButton } from "@/components/ui/FluidButton";
import { GlassPane } from "@/components/ui/GlassPane";
import { palette, spacing, typography } from "@/lib/theme/designSystem";

type Conversation = Doc<"conversations">;

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // @ts-ignore - Type depth exceeded
  const conversations = useQuery(api.conversations.list) as
    | Conversation[]
    | undefined;

  const handleNewChat = () => {
    router.push("/chat/new");
    props.navigation.closeDrawer();
  };

  const navTo = (path: string) => {
    router.push(path as any);
    props.navigation.closeDrawer();
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient Layer */}
      <View style={styles.backgroundLayer} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile / Header Bento */}
        <BentoCard
          style={{ ...styles.profileCard, height: 120 }}
          variant="featured"
          delay={100}
        >
          <View style={styles.profileContent}>
            <View style={styles.avatar}>
              <User size={24} color={palette.roseQuartz} />
            </View>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              {/* TODO: Replace with actual username from user profile/context when available */}
              <Text style={styles.username}>User</Text>
            </View>
          </View>
          <View style={styles.brandTag}>
            <Sparkles size={12} color={palette.roseQuartz} />
            <Text style={styles.brandText}>blah.chat</Text>
          </View>
        </BentoCard>

        {/* New Chat Action */}
        <FluidButton
          title="New Chat"
          icon={<Plus size={20} color={palette.void} />}
          onPress={handleNewChat}
          variant="primary"
        />

        {/* Navigation Grid */}
        <View style={styles.grid}>
          {/* Recent Chats Tile - Spans full width */}
          <BentoCard
            title="Recent"
            style={styles.recentCard}
            icon={<MessageSquare size={18} color={palette.starlight} />}
            delay={200}
          >
            <View style={styles.recentList}>
              {conversations?.slice(0, 3).map((chat) => (
                <GlassPane
                  key={chat._id}
                  style={styles.miniChatItem}
                  intensity={10}
                  borderOpacity={0.05}
                >
                  <Text numberOfLines={1} style={styles.miniChatTitle}>
                    {chat.title || "Untitled Conversation"}
                  </Text>
                </GlassPane>
              ))}
              {(!conversations || conversations.length === 0) && (
                <Text style={styles.emptyText}>No recent chats</Text>
              )}
            </View>
            <FluidButton
              title="View All"
              variant="ghost"
              onPress={() => navTo("/")}
            />
          </BentoCard>

          {/* Row 2: Projects & Settings */}
          <View style={styles.row}>
            <BentoCard
              title="Projects"
              icon={<FolderOpen size={20} color={palette.starlight} />}
              style={styles.halfCard}
              onPress={() => navTo("/projects")}
              delay={300}
            />
            <BentoCard
              title="Settings"
              icon={<Settings size={20} color={palette.starlight} />}
              style={styles.halfCard}
              onPress={() => navTo("/settings")}
              delay={350}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.void,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.void,
    // Could add a big gradient image here later
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  profileCard: {
    justifyContent: "space-between",
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(244, 224, 220, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.roseQuartz,
  },
  greeting: {
    fontFamily: typography.bodyMedium,
    color: palette.starlightDim,
    fontSize: 12,
  },
  username: {
    fontFamily: typography.heading,
    color: palette.starlight,
    fontSize: 20,
  },
  brandTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    opacity: 0.5,
  },
  brandText: {
    fontFamily: typography.display,
    color: palette.roseQuartz,
    fontSize: 10,
    letterSpacing: 1,
  },
  grid: {
    gap: spacing.md,
  },
  recentCard: {
    minHeight: 180,
  },
  recentList: {
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  miniChatItem: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  miniChatTitle: {
    color: palette.starlight,
    fontFamily: typography.body,
    fontSize: 13,
  },
  emptyText: {
    color: palette.starlightDim,
    fontFamily: typography.body,
    fontStyle: "italic",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
    height: 120,
    justifyContent: "space-between",
  },
});
