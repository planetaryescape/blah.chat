import { useAuth } from "@clerk/clerk-expo";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { router, usePathname } from "expo-router";
import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { queryClient } from "@/lib/cache/queryClient";
import { reconcileConversationInCache } from "@/lib/chat/conversationCache";
import { createMobileLifecycleCoordinator } from "@/lib/offline/lifecycle";
import { mobileMessageQueue } from "@/lib/offline/messageQueue";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

function invalidateMobileResumeQueries() {
  return Promise.all([
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "mobile" &&
        (query.queryKey[1] === "messages" ||
          query.queryKey[1] === "active-generation" ||
          query.queryKey[1] === "conversations"),
    }),
  ]);
}

export function MobileRuntimeBridge() {
  const { getToken } = useAuth();
  const pathname = usePathname();
  const client = useMemo(
    () => createMobileSdkClient(() => getToken()),
    [getToken],
  );

  useEffect(() => {
    const replayQueuedSends = async () => {
      const result = await mobileMessageQueue.replay({
        createConversation: (draft) => client.createConversation(draft),
        sendMessage: async (conversationId, payload) => {
          const response = await client.sendMessage(conversationId, payload);
          queryClient.setQueryData(
            ["mobile", "active-generation", conversationId],
            {
              conversationId: response.conversationId,
              requestId: response.requestId,
              streamUrl: response.streamUrl,
              status: response.status,
            },
          );
          return response;
        },
        onConversationReconciled: async ({
          localConversationId,
          conversationId,
        }) => {
          const conversation = (await client.getConversationById(
            conversationId,
          )) as unknown;
          reconcileConversationInCache(queryClient, {
            localConversationId,
            nextConversation: conversation as never,
          });

          if (pathname?.endsWith(`/chat/${localConversationId}`)) {
            router.replace(`/(drawer)/chat/${conversationId}`);
          }
        },
      });

      if (result.sent.length > 0) {
        await invalidateMobileResumeQueries();
      }
    };

    const coordinator = createMobileLifecycleCoordinator({
      setOnline: (online) => {
        onlineManager.setOnline(online);
      },
      onReconnect: async () => {
        await replayQueuedSends();
      },
      onForeground: async () => {
        focusManager.setFocused(true);
        await replayQueuedSends();
        await invalidateMobileResumeQueries();
      },
    });

    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      void coordinator.handleNetworkChange({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        focusManager.setFocused(state === "active");
        if (
          state === "active" ||
          state === "background" ||
          state === "inactive"
        ) {
          void coordinator.handleAppStateChange(state);
        }
      },
    );

    void NetInfo.fetch().then((state) => {
      void coordinator.handleNetworkChange({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return () => {
      netInfoUnsubscribe();
      appStateSubscription.remove();
    };
  }, [client, pathname]);

  return null;
}
