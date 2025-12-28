/**
 * Typography scale for the mobile app
 *
 * Uses Syne for headings (distinctive) and Manrope for body (readable).
 * Matches web app typography system.
 */

import { fonts } from "./fonts";

export const typography = {
  // Headings (Syne)
  h1: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 34,
  },
  h2: {
    fontFamily: fonts.headingMedium,
    fontSize: 22,
    lineHeight: 28,
  },
  h3: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    lineHeight: 24,
  },

  // Body (Manrope)
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySemibold: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },

  // UI elements
  button: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  buttonSmall: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },

  // Code (fallback to system mono)
  code: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 20,
  },
};
