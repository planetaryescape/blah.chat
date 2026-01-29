import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Check, FolderOpen, Inbox, Pin } from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Project = Doc<"projects">;

interface NoteFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  pinnedOnly: boolean;
  onTogglePinned: (value: boolean) => void;
  projects: Project[];
}

export function NoteFilterSheet({
  isOpen,
  onClose,
  selectedProjectId,
  onSelectProject,
  pinnedOnly,
  onTogglePinned,
  projects,
}: NoteFilterSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "75%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const handleSelectProject = useCallback(
    (projectId: string | null) => {
      onSelectProject(projectId);
      bottomSheetRef.current?.close();
    },
    [onSelectProject],
  );

  const handleTogglePinned = useCallback(() => {
    onTogglePinned(!pinnedOnly);
    bottomSheetRef.current?.close();
  }, [pinnedOnly, onTogglePinned]);

  if (!isOpen) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: palette.nebula,
        borderTopLeftRadius: layout.radius.xl,
        borderTopRightRadius: layout.radius.xl,
      }}
      handleIndicatorStyle={{
        backgroundColor: palette.starlightDim,
        width: 40,
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
        }}
      >
        <Text
          style={{
            fontFamily: typography.heading,
            fontSize: 20,
            color: palette.starlight,
            marginBottom: spacing.lg,
            marginTop: spacing.sm,
          }}
        >
          Filter Notes
        </Text>

        {/* Pinned Filter */}
        <AnimatedPressable
          onPress={handleTogglePinned}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: spacing.md,
            borderRadius: layout.radius.md,
            backgroundColor: pinnedOnly
              ? palette.glassMedium
              : palette.glassLow,
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: pinnedOnly ? palette.roseQuartz : palette.glassBorder,
          }}
        >
          <Pin
            size={20}
            color={pinnedOnly ? palette.roseQuartz : palette.starlightDim}
            fill={pinnedOnly ? palette.roseQuartz : "transparent"}
            style={{ marginRight: spacing.sm }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              Pinned Only
            </Text>
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlightDim,
                marginTop: 2,
              }}
            >
              Show only pinned notes
            </Text>
          </View>
          {pinnedOnly && <Check size={20} color={palette.roseQuartz} />}
        </AnimatedPressable>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: palette.glassBorder,
            marginBottom: spacing.lg,
          }}
        />

        <Text
          style={{
            fontFamily: typography.bodySemiBold,
            fontSize: 13,
            color: palette.starlightDim,
            marginBottom: spacing.sm,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          By Project
        </Text>

        {/* All Projects Option */}
        <AnimatedPressable
          onPress={() => handleSelectProject(null)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: spacing.md,
            borderRadius: layout.radius.md,
            backgroundColor:
              selectedProjectId === null
                ? palette.glassMedium
                : palette.glassLow,
            marginBottom: spacing.xs,
            borderWidth: 1,
            borderColor:
              selectedProjectId === null
                ? palette.roseQuartz
                : palette.glassBorder,
          }}
        >
          <FolderOpen
            size={20}
            color={
              selectedProjectId === null
                ? palette.roseQuartz
                : palette.starlightDim
            }
            style={{ marginRight: spacing.sm }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              All Projects
            </Text>
          </View>
          {selectedProjectId === null && (
            <Check size={20} color={palette.roseQuartz} />
          )}
        </AnimatedPressable>

        {/* Unassigned Option */}
        <AnimatedPressable
          onPress={() => handleSelectProject("none")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: spacing.md,
            borderRadius: layout.radius.md,
            backgroundColor:
              selectedProjectId === "none"
                ? palette.glassMedium
                : palette.glassLow,
            marginBottom: spacing.xs,
            borderWidth: 1,
            borderColor:
              selectedProjectId === "none"
                ? palette.roseQuartz
                : palette.glassBorder,
          }}
        >
          <Inbox
            size={20}
            color={
              selectedProjectId === "none"
                ? palette.roseQuartz
                : palette.starlightDim
            }
            style={{ marginRight: spacing.sm }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              No Project
            </Text>
          </View>
          {selectedProjectId === "none" && (
            <Check size={20} color={palette.roseQuartz} />
          )}
        </AnimatedPressable>

        {/* Projects List */}
        {projects.map((project) => {
          const isSelected = selectedProjectId === project._id;

          return (
            <AnimatedPressable
              key={project._id}
              onPress={() => handleSelectProject(project._id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: spacing.md,
                borderRadius: layout.radius.md,
                backgroundColor: isSelected
                  ? palette.glassMedium
                  : palette.glassLow,
                marginBottom: spacing.xs,
                borderWidth: 1,
                borderColor: isSelected
                  ? palette.roseQuartz
                  : palette.glassBorder,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 15,
                    color: palette.starlight,
                  }}
                >
                  {project.name}
                </Text>
              </View>
              {isSelected && (
                <Check
                  size={20}
                  color={palette.roseQuartz}
                  style={{ marginLeft: spacing.sm }}
                />
              )}
            </AnimatedPressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
