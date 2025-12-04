import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClerkProvider } from "@/components/providers/convex-clerk-provider";
import { ThemeProvider } from "@/components/theme-provider";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "blah.chat",
  description:
    "Personal AI chat assistant - self-hosted, multi-model, full control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jetbrainsMono.variable} antialiased font-sans`}
        style={{
          fontFamily: "'Clash Display', var(--font-jetbrains), sans-serif",
        }}
      >
        <ConvexClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </ConvexClerkProvider>
      </body>
    </html>
  );
}
