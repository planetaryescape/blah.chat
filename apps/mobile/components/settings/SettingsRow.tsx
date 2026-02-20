import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { PanResponder, Switch, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { palette, spacing, typography } from "@/lib/theme/designSystem";

/** Pure-JS slider — no native module needed (avoids @react-native-community/slider linking issue) */
function PureSlider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
}: {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (v: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
}) {
  const trackWidth = useRef(0);
  // Store latest props in refs so PanResponder (created once) always reads fresh values
  const propsRef = useRef({ minimumValue, maximumValue, step, onValueChange });
  propsRef.current = { minimumValue, maximumValue, step, onValueChange };

  const valueFromX = useCallback((x: number) => {
    const { minimumValue: min, maximumValue: max, step: s } = propsRef.current;
    if (trackWidth.current <= 0) return min;
    const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
    const raw = min + ratio * (max - min);
    const stepped = s ? Math.round(raw / s) * s : raw;
    return Math.min(max, Math.max(min, stepped));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        propsRef.current.onValueChange(valueFromX(e.nativeEvent.locationX));
      },
      onPanResponderMove: (e) => {
        propsRef.current.onValueChange(valueFromX(e.nativeEvent.locationX));
      },
    }),
  ).current;

  const pct =
    maximumValue === minimumValue
      ? 0
      : ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

  return (
    <View
      style={{ height: 40, justifyContent: "center", marginTop: spacing.sm }}
      onLayout={(e) => {
        trackWidth.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: maximumTrackTintColor,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: minimumTrackTintColor,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: `${pct}%`,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: thumbTintColor,
          marginLeft: -10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 3,
        }}
      />
    </View>
  );
}

type BaseProps = {
  label: string;
  description?: string;
  icon?: LucideIcon;
};

type ToggleProps = BaseProps & {
  variant: "toggle";
  value: boolean;
  onToggle: (v: boolean) => void;
};

type NavProps = BaseProps & {
  variant: "nav";
  value?: string;
  onPress: () => void;
};

type ValueProps = BaseProps & {
  variant: "value";
  value: string;
  onPress: () => void;
};

type ActionProps = BaseProps & {
  variant: "action";
  onPress: () => void;
  destructive?: boolean;
};

type SliderProps = BaseProps & {
  variant: "slider";
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
};

export type SettingsRowProps =
  | ToggleProps
  | NavProps
  | ValueProps
  | ActionProps
  | SliderProps;

export function SettingsRow(props: SettingsRowProps) {
  const { label, description, icon: Icon, variant } = props;

  const isDestructive = variant === "action" && props.destructive;
  const labelColor = isDestructive ? palette.error : palette.starlight;

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        minHeight: 48,
      }}
    >
      {Icon && (
        <Icon
          size={20}
          color={isDestructive ? palette.error : palette.starlightDim}
          style={{ marginRight: spacing.sm }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: typography.bodyMedium,
            fontSize: 15,
            color: labelColor,
          }}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 12,
              color: palette.starlightDim,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        )}
      </View>
      {variant === "toggle" && (
        <Switch
          value={props.value}
          onValueChange={(v) => {
            haptic.selection();
            props.onToggle(v);
          }}
          trackColor={{
            false: palette.glassMedium,
            true: palette.roseQuartzDim,
          }}
          thumbColor={props.value ? palette.roseQuartz : palette.starlightDim}
        />
      )}
      {(variant === "nav" || variant === "value") && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {"value" in props && props.value && (
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlightDim,
              }}
            >
              {props.value}
            </Text>
          )}
          <ChevronRight size={18} color={palette.starlightDim} />
        </View>
      )}
    </View>
  );

  if (variant === "slider") {
    return (
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {Icon && (
            <Icon
              size={20}
              color={palette.starlightDim}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text
            style={{
              flex: 1,
              fontFamily: typography.bodyMedium,
              fontSize: 15,
              color: palette.starlight,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 13,
              color: palette.starlightDim,
            }}
          >
            {props.value}
          </Text>
        </View>
        {description && (
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 12,
              color: palette.starlightDim,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        )}
        <PureSlider
          minimumValue={props.min}
          maximumValue={props.max}
          step={props.step}
          value={props.value}
          onValueChange={props.onValueChange}
          minimumTrackTintColor={palette.roseQuartz}
          maximumTrackTintColor={palette.glassMedium}
          thumbTintColor={palette.roseQuartz}
        />
      </View>
    );
  }

  if (variant === "toggle") {
    return content;
  }

  return (
    <AnimatedPressable
      onPress={() => {
        haptic.light();
        if ("onPress" in props) props.onPress();
      }}
    >
      {content}
    </AnimatedPressable>
  );
}
