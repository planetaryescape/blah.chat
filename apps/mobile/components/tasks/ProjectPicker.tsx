import { api } from "@blah-chat/backend/convex/_generated/api";
import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { Check, FolderOpen, X } from "lucide-react-native";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

interface Project {
  _id: string;
  name: string;
  description?: string;
}

interface ProjectPickerProps {
  selectedProjectId?: string;
  onSelect: (projectId: string | undefined, projectName?: string) => void;
}

export const ProjectPicker = forwardRef<BottomSheetModal, ProjectPickerProps>(
  ({ selectedProjectId, onSelect }, ref) => {
    const snapPoints = useMemo(() => ["60%"], []);
    const [search, setSearch] = useState("");

    // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
    const projects = useQuery(api.projects.list) as Project[] | undefined;

    const filteredProjects = useMemo(() => {
      if (!projects) return [];
      if (!search.trim()) return projects;
      const query = search.toLowerCase();
      return projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query),
      );
    }, [projects, search]);

    const handleSelect = useCallback(
      (project: Project | null) => {
        if (project) {
          onSelect(project._id, project.name);
        } else {
          onSelect(undefined, undefined);
        }
        // @ts-ignore - ref type forwarding
        ref?.current?.dismiss();
        setSearch("");
      },
      [onSelect, ref],
    );

    const handleDismiss = useCallback(() => {
      setSearch("");
    }, []);

    const renderProject = useCallback(
      ({ item }: { item: Project }) => {
        const isSelected = item._id === selectedProjectId;
        return (
          <TouchableOpacity
            style={[
              styles.projectItem,
              isSelected && styles.projectItemSelected,
            ]}
            onPress={() => handleSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.projectIcon}>
              <FolderOpen size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.projectInfo}>
              <Text style={styles.projectName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description && (
                <Text style={styles.projectDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </View>
            {isSelected && <Check size={18} color={colors.primary} />}
          </TouchableOpacity>
        );
      },
      [selectedProjectId, handleSelect],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={handleDismiss}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.heading}>Select Project</Text>
            {selectedProjectId && (
              <TouchableOpacity
                onPress={() => handleSelect(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchContainer}>
            <BottomSheetTextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search projects..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                style={styles.clearButton}
              >
                <X size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {!projects ? (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>Loading projects...</Text>
            </View>
          ) : filteredProjects.length === 0 ? (
            <View style={styles.empty}>
              <FolderOpen size={32} color={colors.border} />
              <Text style={styles.emptyText}>
                {search ? "No matching projects" : "No projects yet"}
              </Text>
            </View>
          ) : (
            <BottomSheetFlatList
              data={filteredProjects}
              renderItem={renderProject}
              keyExtractor={(item: Project) => item._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

ProjectPicker.displayName = "ProjectPicker";

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.foreground,
  },
  clearText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  searchContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
  },
  clearButton: {
    position: "absolute",
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  list: {
    paddingBottom: spacing.xl,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  projectItemSelected: {
    backgroundColor: `${colors.primary}15`,
  },
  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  projectDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
