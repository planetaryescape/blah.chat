import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { getMobileTransportMode } from "@/lib/transport/mode";

export function useDeleteMessage() {
  getMobileTransportMode();
  return useMutation(api.chat.deleteMessage);
}

export function useEditMessage() {
  getMobileTransportMode();
  return useMutation(api.chat.editMessage);
}

export function useRegenerateMessage() {
  getMobileTransportMode();
  return useMutation(api.chat.regenerate);
}

export function useBranchMessage() {
  getMobileTransportMode();
  return useMutation(api.chat.branchFromMessage);
}

export function useSwitchBranch() {
  getMobileTransportMode();
  return useMutation(api.chat.switchBranch);
}
