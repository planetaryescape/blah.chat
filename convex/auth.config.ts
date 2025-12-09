// biome-ignore lint/style/noNonNullAssertion: Required env var for Clerk auth
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
