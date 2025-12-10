export default {
  providers: [
    {
      // biome-ignore lint/style/noNonNullAssertion: Required env var for Clerk auth
      domain: process.env.CLERK_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
