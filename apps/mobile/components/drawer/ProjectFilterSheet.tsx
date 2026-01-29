import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Check, FolderOpen, Inbox } from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Project = Doc<"projects">;

interface ProjectFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  projects: Project[];
}

export function ProjectFilterSheet({
  isOpen,
  onClose,
  selectedProjectId,
  onSelectProject,
  projects,
}: ProjectFilterSheetProps) {
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

  const handleSelect = useCallback(
    (projectId: string | null) => {
      onSelectProject(projectId);
      bottomSheetRef.current?.close();
    },
    [onSelectProject],
  );

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
          Filter by Project
        </Text>

        {/* All Projects Option */}
        <AnimatedPressable
          onPress={() => handleSelect(null)}
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
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlightDim,
                marginTop: 2,
              }}
            >
              Show all conversations
            </Text>
          </View>
          {selectedProjectId === null && (
            <Check size={20} color={palette.roseQuartz} />
          )}
        </AnimatedPressable>

        {/* Unassigned Option */}
        <AnimatedPressable
          onPress={() => handleSelect("none")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: spacing.md,
            borderRadius: layout.radius.md,
            backgroundColor:
              selectedProjectId === "none"
                ? palette.glassMedium
                : palette.glassLow,
            marginBottom: spacing.lg,
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
              Unassigned
            </Text>
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlightDim,
                marginTop: 2,
              }}
            >
              Conversations without a project
            </Text>
          </View>
          {selectedProjectId === "none" && (
            <Check size={20} color={palette.roseQuartz} />
          )}
        </AnimatedPressable>

        {/* Projects List */}
        {projects.length > 0 && (
          <>
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
              Projects
            </Text>

            {projects.map((project) => {
              const isSelected = selectedProjectId === project._id;

              return (
                <AnimatedPressable
                  key={project._id}
                  onPress={() => handleSelect(project._id)}
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
                    {project.description && (
                      <Text
                        numberOfLines={2}
                        style={{
                          fontFamily: typography.body,
                          fontSize: 13,
                          color: palette.starlightDim,
                          marginTop: 2,
                        }}
                      >
                        {project.description}
                      </Text>
                    )}
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
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
