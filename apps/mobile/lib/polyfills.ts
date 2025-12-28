// lib/polyfills.ts
// MUST be imported as FIRST line in app/_layout.tsx
// Required for Convex to work in React Native

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
