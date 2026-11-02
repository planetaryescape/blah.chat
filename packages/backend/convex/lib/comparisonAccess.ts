import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { canAccessConversation } from "../conversations/branching";

export async function getAuthorizedComparison(
  ctx: MutationCtx,
  groupId: string,
  userId: Id<"users">,
  destinationId?: Id<"conversations">,
) {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_comparison_group", (q) => q.eq("comparisonGroupId", groupId))
    .collect();
  if (!messages.length) throw new Error("Invalid comparison group");
  const conversationId = messages[0].conversationId;
  for (const message of messages) {
    if (!(await canAccessConversation(ctx, message.conversationId, userId)))
      throw new Error("Unauthorized");
    if (message.conversationId !== conversationId)
      throw new Error("Comparison group spans conversations");
  }
  const prompts = messages.filter((message) => message.role === "user");
  if (prompts.length > 1)
    throw new Error("Invalid comparison group: multiple prompts");
  if (prompts[0]) {
    for (const response of messages.filter(
      (message) => message.role === "assistant",
    )) {
      const parents = response.parentMessageIds?.length
        ? response.parentMessageIds
        : response.parentMessageId
          ? [response.parentMessageId]
          : [];
      if (
        parents.length &&
        (parents.length !== 1 || parents[0] !== prompts[0]._id)
      )
        throw new Error(
          "Invalid comparison group: response does not match prompt",
        );
    }
  }
  if (destinationId) {
    if (!(await canAccessConversation(ctx, destinationId, userId)))
      throw new Error("Unauthorized");
    if (destinationId !== conversationId)
      throw new Error("Comparison group does not belong to destination");
  }
  return messages;
}
