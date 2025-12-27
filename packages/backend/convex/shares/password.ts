import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// Pure JS password hashing using Web Crypto API
async function hashPasswordInternal(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const hashPassword = internalMutation({
  args: { password: v.string() },
  handler: async (_, args) => {
    return await hashPasswordInternal(args.password);
  },
});

export const verifyPassword = internalMutation({
  args: {
    password: v.string(),
    hash: v.string(),
  },
  handler: async (_, args) => {
    const hashedInput = await hashPasswordInternal(args.password);
    return hashedInput === args.hash;
  },
});
