import {
  Calendar,
  CheckCircle,
  Circle,
  FolderOpen,
  Star,
  Sun,
} from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  deadline?: number;
  urgency?: "low" | "medium" | "high" | "urgent";
  projectId?: string;
  projectName?: string;
  tags?: string[];
  updatedAt: number;
}

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
  onToggleUrgency: () => void;
}

function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isOverdue(timestamp: number): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return timestamp < now.getTime();
}

function formatDeadline(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(timestamp)) {
    return "Today";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getUrgencyColor(urgency?: string): string {
  switch (urgency) {
    case "urgent":
      return colors.destructive;
    case "high":
      return "#f97316"; // orange
    case "medium":
      return colors.primary;
    default:
      return colors.mutedForeground;
  }
}

export function TaskCard({
  task,
  onPress,
  onToggleComplete,
  onToggleUrgency,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const isImportant = task.urgency === "urgent" || task.urgency === "high";
  const isTodayTask = task.deadline && isToday(task.deadline);
  const isOverdueTask =
    task.deadline && !isCompleted && isOverdue(task.deadline);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        isCompleted && styles.cardCompleted,
      ]}
      onPress={onPress}
    >
      <View style={styles.row}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={onToggleComplete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.checkbox}
        >
          {isCompleted ? (
            <CheckCircle
              size={22}
              color={colors.primary}
              fill={colors.primary}
            />
          ) : (
            <Circle size={22} color={colors.border} />
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.title, isCompleted && styles.titleCompleted]}
            numberOfLines={1}
          >
            {task.title}
          </Text>

          {/* Metadata row */}
          <View style={styles.metadata}>
            {/* My Day indicator */}
            {isTodayTask && !isCompleted && (
              <View style={styles.badge}>
                <Sun size={12} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  My Day
                </Text>
              </View>
            )}

            {/* Status indicator */}
            {task.status === "in_progress" && !isCompleted && (
              <View style={styles.badge}>
                <View style={[styles.statusDot, styles.statusDotActive]} />
                <Text style={styles.badgeText}>In Progress</Text>
              </View>
            )}

            {/* Urgency badge */}
            {isImportant && !isCompleted && (
              <View
                style={[
                  styles.urgencyBadge,
                  { backgroundColor: `${getUrgencyColor(task.urgency)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.urgencyText,
                    { color: getUrgencyColor(task.urgency) },
                  ]}
                >
                  {task.urgency === "urgent" ? "Urgent" : "High"}
                </Text>
              </View>
            )}

            {/* Project name */}
            {task.projectName && (
              <View style={styles.badge}>
                <FolderOpen size={12} color={colors.mutedForeground} />
                <Text style={styles.badgeText} numberOfLines={1}>
                  {task.projectName}
                </Text>
              </View>
            )}

            {/* Deadline */}
            {task.deadline && (
              <View style={styles.badge}>
                <Calendar
                  size={12}
                  color={
                    isOverdueTask ? colors.destructive : colors.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.badgeText,
                    isOverdueTask ? { color: colors.destructive } : undefined,
                  ]}
                >
                  {formatDeadline(task.deadline)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Star toggle */}
        <TouchableOpacity
          onPress={onToggleUrgency}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.starButton}
        >
          <Star
            size={18}
            color={isImportant ? colors.star : colors.border}
            fill={isImportant ? colors.star : "transparent"}
          />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  cardPressed: {
    backgroundColor: colors.secondary,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  checkbox: {
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.foreground,
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: colors.mutedForeground,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mutedForeground,
  },
  statusDotActive: {
    backgroundColor: colors.primary,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  urgencyText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    textTransform: "uppercase",
  },
  starButton: {
    marginTop: 2,
  },
});
