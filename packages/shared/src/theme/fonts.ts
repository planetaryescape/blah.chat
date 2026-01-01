/**
 * Font configuration for the mobile app
 *
 * Uses Google Fonts: Syne (headings) and Manrope (body)
 * to match the web app's typography.
 */

export const fonts = {
  // Headings (Syne)
  heading: "Syne_700Bold",
  headingMedium: "Syne_600SemiBold",
  headingRegular: "Syne_400Regular",

  // Body (Manrope)
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemibold: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",

  // Code (fallback to system monospace)
  mono: "SpaceMono",
};

/**
 * Font family names for StyleSheet usage
 */
export const fontFamily = {
  syne: {
    regular: "Syne_400Regular",
    semibold: "Syne_600SemiBold",
    bold: "Syne_700Bold",
  },
  manrope: {
    regular: "Manrope_400Regular",
    medium: "Manrope_500Medium",
    semibold: "Manrope_600SemiBold",
    bold: "Manrope_700Bold",
  },
};
