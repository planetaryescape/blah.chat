import { createSignal } from "solid-js";
import { createSimpleContext } from "./context-helper.js";

interface KeybindContextValue {
  inputMode: () => "typing" | "command";
  setInputMode: (mode: "typing" | "command") => void;
}

export const { provider: KeybindProvider, use: useKeybind } =
  createSimpleContext<KeybindContextValue, object>({
    name: "Keybind",
    init: () => {
      const [inputMode, setInputMode] = createSignal<"typing" | "command">(
        "typing",
      );

      return {
        inputMode,
        setInputMode,
      };
    },
  });
