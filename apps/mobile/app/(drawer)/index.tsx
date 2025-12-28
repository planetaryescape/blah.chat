import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useRouter } from "expo-router";
import { colors } from "@/lib/theme/colors";

type Conversation = Doc<"conversations">;

export default function IndexScreen() {
  const router = useRouter();

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const conversations = useQuery(api.conversations.list) as
    | Conversation[]
    | undefined;

  useEffect(() => {
    if (conversations === undefined) return; // Still loading

    // Find empty conversation to reuse (no messages)
    const emptyConvo = conversations.find((c) => c.messageCount === 0);

    if (emptyConvo) {
      router.replace(`/chat/${emptyConvo._id}`);
    } else {
      router.replace("/chat/new");
    }
  }, [conversations, router]);

  // Show loading spinner while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
