import { z } from "zod";
import { captureServerAnalyticsEvent } from "@/lib/analytics-server";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";

const sidebarAnalyticsSchema = z.object({
  event: z.enum([
    "sidebar_open",
    "sidebar_search",
    "sidebar_select_conversation",
    "sidebar_action",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  resourceId: z.string().optional(),
});

export const sidebarAnalyticsDAL = {
  track: async (clerkUserId: string, payload: unknown) => {
    const validated = sidebarAnalyticsSchema.parse(payload);
    const captured = await captureServerAnalyticsEvent({
      distinctId: clerkUserId,
      event: validated.event,
      properties: {
        ...(validated.metadata ?? {}),
        ...(validated.resourceId
          ? {
              resourceId: validated.resourceId,
            }
          : {}),
        platform: "mobile",
        surface: "sidebar",
      },
    });

    return formatEntity({ captured }, "analytics");
  },
};
