// lib/polyfills.ts
// MUST be imported as FIRST line in app/_layout.tsx
// Required for Convex and Clerk to work in React Native

// Clerk internally uses web APIs (addEventListener/removeEventListener)
// which don't exist in React Native — polyfill before Clerk loads
if (
  typeof window !== "undefined" &&
  typeof window.addEventListener !== "function"
) {
  (window as any).addEventListener = () => {};
  (window as any).removeEventListener = () => {};
}

// Buffer polyfill for Convex WebSocket
if (typeof global.Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer;
}

// Process polyfill
if (typeof global.process === "undefined") {
  global.process = require("process");
}

// Ensure process.env exists
global.process.env = global.process.env || {};
