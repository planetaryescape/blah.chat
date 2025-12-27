export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
