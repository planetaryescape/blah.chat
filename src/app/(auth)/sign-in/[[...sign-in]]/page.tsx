import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: "w-full flex justify-center",
          card: "bg-transparent shadow-none border-none w-full p-0 flex flex-col items-center",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton:
            "bg-background/50 border-border hover:bg-background/80 text-foreground",
          socialButtonsBlockButtonText: "text-foreground font-medium",
          dividerLine: "bg-border",
          dividerText: "text-muted-foreground",
          formFieldLabel: "text-foreground",
          formFieldInput: "bg-background/50 border-border text-foreground",
          footerActionLink: "text-primary hover:text-primary/90",
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90",
        },
      }}
    />
  );
}
