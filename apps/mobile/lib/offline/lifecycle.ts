type ConnectivityState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type AppStateStatus = "active" | "background" | "inactive";

export function isDeviceOnline(state: ConnectivityState) {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function createMobileLifecycleCoordinator(config: {
  setOnline: (online: boolean) => void;
  onReconnect: () => void | Promise<void>;
  onForeground: () => void | Promise<void>;
}) {
  let online = true;
  let appState: AppStateStatus = "active";

  return {
    async handleNetworkChange(state: ConnectivityState) {
      const nextOnline = isDeviceOnline(state);
      config.setOnline(nextOnline);

      if (!online && nextOnline) {
        await config.onReconnect();
      }

      online = nextOnline;
    },

    async handleAppStateChange(nextState: AppStateStatus) {
      const wasBackgrounded = appState !== "active";
      appState = nextState;

      if (nextState === "active" && wasBackgrounded) {
        await config.onForeground();
      }
    },
  };
}
