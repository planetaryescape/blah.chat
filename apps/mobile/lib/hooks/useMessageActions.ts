import { useMutation } from "convex/react";
import { api } from "@/lib/convex";

export function useDeleteMessage() {
  return useMutation(api.chat.deleteMessage);
}

export function useEditMessage() {
  return useMutation(api.chat.editMessage);
}

export function useRegenerateMessage() {
  return useMutation(api.chat.regenerate);
}

export function useBranchMessage() {
  return useMutation(api.chat.branchFromMessage);
}

export function useSwitchBranch() {
  return useMutation(api.chat.switchBranch);
}
