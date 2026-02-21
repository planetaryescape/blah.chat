import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Camera, FileText, Image } from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

interface ChatAttachmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
  onChooseFile: () => void;
  disabled?: boolean;
}

function AttachmentOption({
  title,
  subtitle,
  icon,
  onPress,
  disabled,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: palette.glassLow,
        borderWidth: 1,
        borderColor: palette.glassBorder,
        borderRadius: layout.radius.md,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.glassMedium,
          borderWidth: 1,
          borderColor: palette.glassBorder,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: typography.bodySemiBold,
            fontSize: 15,
            color: palette.starlight,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 13,
            color: palette.starlightDim,
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export function ChatAttachmentSheet({
  isOpen,
  onClose,
  onTakePhoto,
  onChoosePhoto,
  onChooseFile,
  disabled = false,
}: ChatAttachmentSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["34%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handlePress = useCallback((action: () => void) => {
    bottomSheetRef.current?.close();
    action();
  }, []);

  if (!isOpen) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderStandardBackdrop}
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
      <BottomSheetView
        style={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            fontFamily: typography.heading,
            fontSize: 18,
            color: palette.starlight,
            marginTop: spacing.sm,
            marginBottom: spacing.xs,
          }}
        >
          Attach
        </Text>

        <AttachmentOption
          title="Take Photo"
          subtitle="Capture from camera"
          icon={<Camera size={18} color={palette.starlight} />}
          onPress={() => handlePress(onTakePhoto)}
          disabled={disabled}
        />

        <AttachmentOption
          title="Choose Photo"
          subtitle="Select from library"
          icon={<Image size={18} color={palette.starlight} />}
          onPress={() => handlePress(onChoosePhoto)}
          disabled={disabled}
        />

        <AttachmentOption
          title="Choose File"
          subtitle="Select documents or audio"
          icon={<FileText size={18} color={palette.starlight} />}
          onPress={() => handlePress(onChooseFile)}
          disabled={disabled}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}
