import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      redirectUrl="/app"
      appearance={{
        elements: {
          rootBox: "w-full flex justify-center",
          card: "bg-transparent shadow-none border-none w-full p-0 flex flex-col items-center min-h-[500px]",
          header: "hidden", // Hide Clerk's header, we have our own in layout
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          logoBox: "hidden", // Hide Clerk's logo
          logoImage: "hidden",
          main: "w-full",
          footer: "bg-transparent",
          footerAction: "bg-transparent",
          socialButtonsBlockButton:
            "bg-background/50 border-border hover:bg-background/80 text-foreground transition-all duration-200",
          socialButtonsBlockButtonText: "text-foreground font-medium",
          dividerLine: "bg-border",
          dividerText: "text-muted-foreground",
          formFieldLabel: "text-foreground",
          formFieldInput:
            "bg-background/50 border-border text-foreground transition-all duration-200 focus:border-primary",
          footerActionLink: "text-primary hover:text-primary/90",
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200",
          identityPreview: "bg-background/50 border-border",
          identityPreviewText: "text-foreground",
          identityPreviewEditButton: "text-primary hover:text-primary/90",
          formResendCodeLink: "text-primary hover:text-primary/90",
          otpCodeFieldInput:
            "bg-background/50 border-border text-foreground transition-all duration-200",
        },
        layout: {
          shimmer: false, // Disable shimmer animation for cleaner transitions
        },
      }}
    />
  );
}
