import type { AppStateSource, ConnectivitySource } from "./types";

/** Best-effort NetInfo connectivity source; always-connected if peer is missing. */
export function createDefaultConnectivitySource(): ConnectivitySource {
  try {
    const NetInfo = require("@react-native-community/netinfo") as {
      fetch: () => Promise<{ isConnected: boolean | null }>;
      addEventListener: (listener: (state: { isConnected: boolean | null }) => void) => () => void;
    };

    return {
      async getIsConnected() {
        const state = await NetInfo.fetch();
        return state.isConnected !== false;
      },
      subscribe(listener) {
        return NetInfo.addEventListener((state) => {
          listener(state.isConnected !== false);
        });
      },
    };
  } catch {
    return {
      async getIsConnected() {
        return true;
      },
      subscribe() {
        return () => {};
      },
    };
  }
}

/** React Native AppState source; no-op outside RN. */
export function createDefaultAppStateSource(): AppStateSource {
  try {
    const { AppState } = require("react-native") as {
      AppState: {
        addEventListener: (
          type: string,
          listener: (state: string) => void,
        ) => { remove: () => void };
      };
    };

    return {
      subscribe(listener) {
        const sub = AppState.addEventListener("change", listener);
        return () => sub.remove();
      },
    };
  } catch {
    return {
      subscribe() {
        return () => {};
      },
    };
  }
}
