"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Code2,
  Eye,
  Mic,
  ShieldCheck,
  Users,
  Webhook,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

// Note: Auth redirect is handled server-side in middleware.ts for better LCP
export default function LandingPage() {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef(null);
  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);
  const section3Ref = useRef<HTMLElement>(null);
  const section4Ref = useRef<HTMLElement>(null);
  const section5Ref = useRef<HTMLElement>(null);
  const [isDarkSection, setIsDarkSection] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Simple scroll-based section detection
  useEffect(() => {
    const isLightMode = resolvedTheme === "light";

    const sections = [
      { ref: section1Ref, isDark: isLightMode ? false : true }, // bg-background
      { ref: section2Ref, isDark: isLightMode ? true : false }, // bg-foreground
      { ref: section3Ref, isDark: isLightMode ? false : true }, // bg-background
      { ref: section4Ref, isDark: true }, // bg-zinc-950 (always dark)
      { ref: section5Ref, isDark: true }, // bg-zinc-950 (always dark)
    ];

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 10; // Small offset to avoid edge cases

      // Loop through sections from last to first to find which one we're in
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.ref.current) {
          const sectionTop = section.ref.current.offsetTop;

          if (scrollPosition >= sectionTop) {
            setIsDarkSection(section.isDark);
            return;
          }
        }
      }
    };

    // Initial check and scroll listener
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="min-h-[400vh] bg-background text-foreground font-sans selection:bg-primary/30"
    >
      {/* Sticky Navigation */}
      <nav
        aria-label="Main navigation"
        className={`fixed top-0 w-full z-50 p-6 flex justify-between items-center transition-colors duration-300 ${
          isDarkSection ? "text-white" : "text-black"
        }`}
      >
        <div className="scale-75 origin-left">
          <Logo />
        </div>
        <Button
          asChild
          variant="outline"
          className={`rounded-full backdrop-blur-sm transition-colors duration-300 ${
            isDarkSection
              ? "border-white/20 bg-transparent hover:bg-white/10 hover:text-white text-white"
              : "border-foreground/20 bg-transparent hover:bg-foreground/10"
          }`}
        >
          <Link href="/sign-up">Get Started</Link>
        </Button>
      </nav>

      {/* Section 1: The Hook */}
      <section
        ref={section1Ref}
        className="h-screen sticky top-0 flex items-center justify-center overflow-hidden"
      >
        <div className="container px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="font-syne text-[12vw] leading-[0.8] font-black tracking-tighter mb-8 mix-blend-overlay opacity-90">
              WHY?
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-2xl md:text-4xl font-light tracking-tight text-muted-foreground"
            >
              Another chat app. Really?
            </motion.p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ChevronDown className="w-10 h-10 text-foreground" />
          </motion.div>
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background pointer-events-none" />
        <BackgroundGrid />
      </section>

      {/* Section 2: The Fragmentation (Scroll driven) */}
      <section
        ref={section2Ref}
        className="min-h-screen sticky top-0 flex items-center justify-center bg-foreground text-background z-20 py-12 md:py-0"
      >
        <div className="container px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="font-syne text-4xl md:text-6xl lg:text-8xl font-bold leading-none mb-6 md:mb-8">
                The <br />
                <span className="text-background/50 italic">Mess.</span>
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl font-medium leading-relaxed opacity-80 mb-6 md:mb-8">
                ChatGPT for personalization & memories. <br />
                Perplexity for web search & latest info. <br />
                Gemini for Google Workspace, video & voice. <br />
                Grok for speed. <br />
                Nano Banana for images.
              </p>
              <p className="text-base md:text-lg text-background/60 font-medium border-l-2 border-background/20 pl-4">
                5 Subscriptions. 5x the Cost. <br />
                Paying for repeated functionality just to get one feature from
                each.
              </p>
            </div>
            <div className="relative aspect-square order-1 md:order-2 max-w-[300px] md:max-w-none mx-auto">
              {/* Abstract representation of scattered tools */}
              <motion.div
                style={{
                  rotate: useTransform(scrollYProgress, [0, 0.25], [0, 45]),
                }}
                className="absolute inset-0 border-4 border-background/20 rounded-full"
              />
              <motion.div
                style={{
                  rotate: useTransform(scrollYProgress, [0, 0.25], [0, -45]),
                  scale: 0.8,
                }}
                className="absolute inset-0 border-4 border-background/20 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-center font-syne text-xl md:text-3xl font-bold">
                  Why are your superpowers <br />
                  scattered?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: The Solution (Control & Unification) */}
      <section
        ref={section3Ref}
        className="min-h-screen sticky top-0 flex items-center justify-center bg-background z-30 py-12 md:py-0"
      >
        <div className="container px-4 max-w-6xl">
          <div className="grid gap-12 md:gap-24">
            <div className="space-y-4">
              <h3 className="text-xs md:text-sm font-mono uppercase tracking-widest text-primary">
                The Philosophy
              </h3>
              <h2 className="font-syne text-4xl md:text-5xl lg:text-7xl font-bold">
                Total Control. <br />
                One Interface.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                Everything you need, unified in one place. <br />
                Stop paying for the same thing 5 times. <br />
                <strong>
                  One subscription. All the models. All the features.
                </strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: The Gallery (Creative Toolkit - Dense & Compact) */}
      <section
        ref={section4Ref}
        className="h-screen sticky top-0 bg-zinc-950 text-zinc-50 z-35 flex flex-col justify-center py-4 md:py-8 overflow-hidden"
      >
        <div className="container px-4 max-w-[1400px] h-full flex flex-col">
          <div className="mb-4 md:mb-8 text-center shrink-0">
            <h2 className="font-syne text-3xl md:text-6xl font-bold mb-2 md:mb-4 tracking-tighter">
              The Toolkit.
            </h2>
            <p className="text-sm md:text-lg text-zinc-400 max-w-2xl mx-auto">
              A dense, powerful grid of tools. Everything you need.
            </p>
          </div>

          <div className="flex-1 grid grid-cols-2 grid-rows-6 md:grid-cols-4 md:grid-rows-4 gap-2 md:gap-3 min-h-0">
            {/* 1. The Brain (Large) - Mobile: Row 1 (Col 1-2), Desktop: Row 1-2 (Col 1-2) */}
            <div className="col-span-2 row-span-1 md:row-span-2 relative rounded-xl md:rounded-2xl overflow-hidden group border border-white/10">
              <Image
                src="/assets/landing/neural_glass_abstract_1764891914296.png"
                alt="Neural Glass"
                fill
                priority
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBRIhBhMiMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEQA/ANF0zqC+0+yhtoLVZI4wFVy5G4fT4UVb/9k="
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 max-w-md">
                <h3 className="font-syne text-lg md:text-2xl font-bold mb-0.5 md:mb-1">
                  The Brain
                </h3>
                <p className="text-zinc-300 text-[10px] md:text-sm leading-tight line-clamp-2 md:line-clamp-none">
                  OpenAI, Google, Anthropic, Perplexity. All models. Switch
                  mid-chat. Universal access.
                </p>
              </div>
            </div>

            {/* 2. Voice Mode (Small) - Mobile: Row 2 (Col 1), Desktop: Row 1 (Col 3) */}
            <div className="col-span-1 row-span-1 bg-zinc-900/50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-white/10 flex flex-col justify-between hover:bg-zinc-900/80 transition-colors">
              <Mic className="w-4 h-4 md:w-6 md:h-6 text-white" />
              <div>
                <h4 className="font-bold text-sm md:text-lg leading-none mb-0.5 md:mb-1">
                  Voice
                </h4>
                <p className="text-[10px] md:text-xs text-zinc-400 leading-tight">
                  Hands-free.
                </p>
              </div>
            </div>

            {/* 3. Vision (Small) - Mobile: Row 2 (Col 2), Desktop: Row 1 (Col 4) */}
            <div className="col-span-1 row-span-1 bg-zinc-900/50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-white/10 flex flex-col justify-between hover:bg-zinc-900/80 transition-colors">
              <Eye className="w-4 h-4 md:w-6 md:h-6 text-white" />
              <div>
                <h4 className="font-bold text-sm md:text-lg leading-none mb-0.5 md:mb-1">
                  Vision
                </h4>
                <p className="text-[10px] md:text-xs text-zinc-400 leading-tight">
                  Analyze images.
                </p>
              </div>
            </div>

            {/* 4. The Structure (Large Vertical -> Small Mobile) - Mobile: Row 3 (Col 1), Desktop: Row 2-3 (Col 3) */}
            <div className="col-span-1 row-span-1 md:row-span-2 relative rounded-xl md:rounded-2xl overflow-hidden group border border-white/10">
              <Image
                src="/assets/landing/abstract_flow_branching_1764891937677.png"
                alt="Abstract Flow"
                fill
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBRIhBhMiMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEQA/ANF0zqC+0+yhtoLVZI4wFVy5G4fT4UVb/9k="
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6">
                <h3 className="font-syne text-sm md:text-xl font-bold mb-0.5 md:mb-1">
                  The Flow
                </h3>
                <p className="text-zinc-300 text-[10px] md:text-xs leading-tight">
                  Branch conversations anytime. Explore multiple paths.
                </p>
              </div>
            </div>

            {/* 5. Code Artifacts (Small) - Mobile: Row 3 (Col 2), Desktop: Row 2 (Col 4) */}
            <div className="col-span-1 row-span-1 bg-zinc-900/50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-white/10 flex flex-col justify-between hover:bg-zinc-900/80 transition-colors">
              <Code2 className="w-4 h-4 md:w-6 md:h-6 text-white" />
              <div>
                <h4 className="font-bold text-sm md:text-lg leading-none mb-0.5 md:mb-1">
                  Code
                </h4>
                <p className="text-[10px] md:text-xs text-zinc-400 leading-tight">
                  Run code.
                </p>
              </div>
            </div>

            {/* 6. Privacy (Small) - Mobile: Row 4 (Col 1), Desktop: Row 3 (Col 4) */}
            <div className="col-span-1 row-span-1 bg-zinc-900/50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-white/10 flex flex-col justify-between hover:bg-zinc-900/80 transition-colors">
              <ShieldCheck className="w-4 h-4 md:w-6 md:h-6 text-white" />
              <div>
                <h4 className="font-bold text-sm md:text-lg leading-none mb-0.5 md:mb-1">
                  Privacy
                </h4>
                <p className="text-[10px] md:text-xs text-zinc-400 leading-tight">
                  Local storage.
                </p>
              </div>
            </div>

            {/* 7. The Library (Wide -> Small Mobile) - Mobile: Row 4 (Col 2), Desktop: Row 3 (Col 1-2) */}
            <div className="col-span-1 md:col-span-2 row-span-1 relative rounded-xl md:rounded-2xl overflow-hidden group border border-white/10">
              <Image
                src="/assets/landing/structured_light_abstract_1764891925820.png"
                alt="Structured Light"
                fill
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBRIhBhMiMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEQA/ANF0zqC+0+yhtoLVZI4wFVy5G4fT4UVb/9k="
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 max-w-sm">
                <h3 className="font-syne text-sm md:text-xl font-bold mb-0.5 md:mb-1">
                  The Library
                </h3>
                <p className="text-zinc-300 text-[10px] md:text-xs leading-tight">
                  Hybrid Search. Projects. Bookmarks. Find anything, instantly.
                </p>
              </div>
            </div>

            {/* 8. Team Spaces (Small) - Mobile: Row 5 (Col 1), Desktop: Row 4 (Col 1) */}
            <div className="col-span-1 row-span-1 bg-zinc-900/50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-white/10 flex flex-col justify-between hover:bg-zinc-900/80 transition-colors">
              <Users className="w-4 h-4 md:w-6 md:h-6 text-white" />
              <div>
                <h4 className="font-bold text-sm md:text-lg leading-none mb-0.5 md:mb-1">
                  Teams
                </h4>
                <p className="text-[10px] md:text-xs text-zinc-400 leading-tight">
                  Collaborate.
                </p>
              </div>
            </div>

            {/* 9. API Access (Small) - Mobile: Row 5 (Col 2), Desktop: Row 4 (Col 2) */}
            <div className="col-span-1 row-span-1 bg-zinc-900/50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-white/10 flex flex-col justify-between hover:bg-zinc-900/80 transition-colors">
              <Webhook className="w-4 h-4 md:w-6 md:h-6 text-white" />
              <div>
                <h4 className="font-bold text-sm md:text-lg leading-none mb-0.5 md:mb-1">
                  API
                </h4>
                <p className="text-[10px] md:text-xs text-zinc-400 leading-tight">
                  Your keys.
                </p>
              </div>
            </div>

            {/* 10. The Control (Wide) - Mobile: Row 6 (Col 1-2), Desktop: Row 4 (Col 3-4) */}
            <div className="col-span-2 row-span-1 relative rounded-xl md:rounded-2xl overflow-hidden group border border-white/10">
              <Image
                src="/assets/landing/control_interface_abstract_1764891952530.png"
                alt="Control Interface"
                fill
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBRIhBhMiMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEQA/ANF0zqC+0+yhtoLVZI4wFVy5G4fT4UVb/9k="
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6">
                <h3 className="font-syne text-lg md:text-xl font-bold mb-0.5 md:mb-1">
                  The Control
                </h3>
                <p className="text-zinc-300 text-[10px] md:text-xs leading-tight">
                  Transparent Cost Tracking. Know exactly what you pay. NOTES &
                  SHARING.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: CTA */}
      <section
        ref={section5Ref}
        className="h-screen sticky top-0 flex items-center justify-center bg-zinc-950 text-zinc-50 z-40"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,90vw)] h-[min(800px,90vw)] bg-primary/20 rounded-full blur-[120px] opacity-50 animate-pulse" />
        </div>

        <div className="container px-4 relative z-10 text-center max-w-4xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <div className="flex justify-center mb-6 md:mb-8 scale-100 md:scale-150">
              <Logo />
            </div>
            <p className="text-xl md:text-2xl lg:text-3xl font-light text-zinc-400 mb-8 md:mb-12 max-w-3xl mx-auto">
              Give it a shot. <br />
              You'll understand why.
            </p>
            <Button
              asChild
              size="lg"
              className="h-12 md:h-16 px-8 md:px-12 rounded-full text-base md:text-xl font-bold bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105 w-full max-w-xs md:w-auto"
            >
              <Link
                href="/sign-up"
                className="flex items-center justify-center gap-2"
              >
                Start Chatting <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function BackgroundGrid() {
  return (
    <div
      className="absolute inset-0 z-0 opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }}
    />
  );
}
