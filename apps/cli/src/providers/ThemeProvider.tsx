import { terminalColors } from "../lib/terminal.js";
import { createSimpleContext } from "./context-helper.js";

interface ThemeContextValue {
  colors: typeof terminalColors;
}

export const { provider: ThemeProvider, use: useTheme } = createSimpleContext<
  ThemeContextValue,
  object
>({
  name: "Theme",
  init: () => ({
    colors: terminalColors,
  }),
});
