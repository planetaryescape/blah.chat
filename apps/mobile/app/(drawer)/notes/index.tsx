import { api } from "@blah-chat/backend/convex/_generated/api";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteForm } from "@/components/notes/NoteForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { spacing } from "@/lib/theme/spacing";

// Explicit type to avoid Convex type depth issues
interface Note {
  _id: string;
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  updatedAt: number;
}

export default function NotesScreen() {
  const router = useRouter();
  const formRef = useRef<BottomSheetModal>(null);

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const notes = useQuery(api.notes.listNotes) as Note[] | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const createNote = useMutation(api.notes.createNote);

  const handleCreate = useCallback(
    async (data: { title?: string; content: string }) => {
      await (
        createNote as (args: {
          content: string;
          title?: string;
        }) => Promise<string>
      )({
        content: data.content,
        title: data.title,
      });
    },
    [createNote],
  );

  const renderNote = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        // @ts-ignore - Type casting for Convex Doc
        note={item}
        onPress={() => router.push(`/notes/${item._id}` as never)}
      />
    ),
    [router],
  );

  if (notes === undefined) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notes.length === 0 ? (
        <EmptyState
          icon={<FileText size={56} color={colors.border} strokeWidth={1.5} />}
          title="No notes yet"
          subtitle="Create a note to get started"
        />
      ) : (
        <FlashList
          data={notes}
          renderItem={renderNote}
          keyExtractor={(item: Note) => item._id}
          // @ts-ignore - FlashList estimatedItemSize prop
          estimatedItemSize={120}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB onPress={() => formRef.current?.present()} />

      <NoteForm ref={formRef} mode="create" onSave={handleCreate} />
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
