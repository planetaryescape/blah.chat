import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Gradient background - using global theme vars */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />

      {/* Animated glow orbs - using primary/accent colors */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center">
        {/* Logo and branding */}
        <div className="text-center mb-8 scale-125">
          <Logo size="lg" />
        </div>

        {/* Auth card - using glassmorphism utility */}
        <div className="surface-glass rounded-2xl p-6 shadow-2xl w-full border border-white/10 relative overflow-hidden flex flex-col items-center">
          {/* Glass Highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10 w-full flex justify-center">
            {children}
          </div>
        </div>

        {/* Footer text */}
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <span>Powered by</span>
            <span className="font-semibold text-foreground/80">blah.chat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
