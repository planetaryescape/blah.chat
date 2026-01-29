import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { DrawerActions } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useRouter } from "expo-router";
import { Filter, Menu, Plus, Search } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyNotes,
  NoteFilterSheet,
  NoteListItem,
  NoteMenuSheet,
} from "@/components/notes";
import { haptic } from "@/lib/haptics";
import {
  useCreateNote,
  useDeleteNote,
  useProjects,
  useSearchNotes,
  useToggleNotePin,
} from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Note = Doc<"notes">;

export default function NotesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const projects = useProjects();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useToggleNotePin();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const notes = useSearchNotes(searchQuery, {
    projectId:
      selectedProjectId === "none"
        ? undefined
        : selectedProjectId
          ? (selectedProjectId as Id<"projects">)
          : undefined,
    filterPinned: pinnedOnly,
  });

  const filteredNotes =
    selectedProjectId === "none"
      ? notes?.filter((note) => !note.projectId)
      : notes;

  const handleOpenDrawer = useCallback(() => {
    haptic.light();
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const handleCreateNote = useCallback(async () => {
    haptic.medium();
    try {
      const noteId = await createNote({
        content: "",
        title: "Untitled Note",
        projectId: selectedProjectId
          ? (selectedProjectId as Id<"projects">)
          : undefined,
      });
      router.push(`/(drawer)/notes/${noteId}`);
    } catch (_error) {
      haptic.error();
    }
  }, [createNote, router, selectedProjectId]);

  const handleNotePress = useCallback(
    (noteId: Id<"notes">) => {
      haptic.light();
      router.push(`/(drawer)/notes/${noteId}`);
    },
    [router],
  );

  const handleNoteLongPress = useCallback((note: Note) => {
    haptic.medium();
    setSelectedNote(note);
    setIsMenuOpen(true);
  }, []);

  const handleTogglePin = useCallback(async () => {
    if (!selectedNote) return;
    try {
      await togglePin({ noteId: selectedNote._id });
    } catch (_error) {
      haptic.error();
    }
  }, [selectedNote, togglePin]);

  const handleDeleteNote = useCallback(async () => {
    if (!selectedNote) return;
    try {
      await deleteNote({ noteId: selectedNote._id });
    } catch (_error) {
      haptic.error();
    }
  }, [selectedNote, deleteNote]);

  const isLoading = notes === undefined;
  const isFiltered = selectedProjectId !== null || pinnedOnly;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.void }}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: palette.glassBorder,
          height: layout.headerHeight,
          gap: spacing.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            haptic.light();
            handleOpenDrawer();
          }}
          style={{ padding: spacing.xs }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={24} color={palette.starlight} />
        </TouchableOpacity>

        <Text
          style={{
            flex: 1,
            fontFamily: typography.heading,
            fontSize: 18,
            color: palette.starlight,
          }}
        >
          Notes
        </Text>

        <TouchableOpacity
          onPress={() => {
            haptic.light();
            handleCreateNote();
          }}
          style={{
            padding: spacing.xs,
            backgroundColor: palette.roseQuartz,
            borderRadius: layout.radius.sm,
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Plus size={20} color={palette.void} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
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
            onChangeText={setSearchQuery}
            placeholder="Search notes..."
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

        {/* Filter Button */}
        <TouchableOpacity
          onPress={() => {
            haptic.light();
            setIsFilterOpen(true);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            backgroundColor: isFiltered
              ? palette.glassMedium
              : palette.glassLow,
            borderRadius: layout.radius.sm,
            borderWidth: 1,
            borderColor: isFiltered ? palette.roseQuartz : palette.glassBorder,
            gap: spacing.xs,
          }}
        >
          <Filter
            size={14}
            color={isFiltered ? palette.roseQuartz : palette.starlightDim}
          />
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 13,
              color: isFiltered ? palette.starlight : palette.starlightDim,
            }}
          >
            {isFiltered ? "Filtered" : "Filter"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
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
      ) : !filteredNotes || filteredNotes.length === 0 ? (
        <EmptyNotes
          isFiltered={isFiltered}
          isSearching={isSearching}
          onCreateNote={handleCreateNote}
        />
      ) : (
        <FlashList<Note>
          data={filteredNotes}
          renderItem={({ item }) => (
            <NoteListItem
              note={item}
              onPress={() => handleNotePress(item._id)}
              onLongPress={() => handleNoteLongPress(item)}
            />
          )}
          estimatedItemSize={80}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingVertical: spacing.sm,
          }}
        />
      )}

      {/* Filter Sheet */}
      <NoteFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        pinnedOnly={pinnedOnly}
        onTogglePinned={setPinnedOnly}
        projects={projects ?? []}
      />

      {/* Note Menu Sheet */}
      <NoteMenuSheet
        isOpen={isMenuOpen}
        onClose={() => {
          setIsMenuOpen(false);
          setSelectedNote(null);
        }}
        note={selectedNote}
        onTogglePin={handleTogglePin}
        onDelete={handleDeleteNote}
      />
    </SafeAreaView>
  );
}
