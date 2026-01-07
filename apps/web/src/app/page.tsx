"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Cloud,
  Code2,
  Database,
  DollarSign,
  ExternalLink,
  FileText,
  FolderKanban,
  Github,
  Key,
  ListTodo,
  Mic,
  Search,
  Server,
  Sparkles,
  Split,
  WifiOff,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

// Typewriter hook for hero
function useTypewriter(text: string, speed = 50, delay = 500) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, delay]);

  return { displayText, isComplete };
}

// Subscription item component for Problem section
function SubscriptionItem({
  name,
  price,
  reason,
  index,
  isVisible,
}: {
  name: string;
  price: string;
  reason: string;
  index: number;
  isVisible: boolean;
}) {
  const [showStrike, setShowStrike] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowStrike(true), 300 + index * 200);
      return () => clearTimeout(timer);
    }
  }, [isVisible, index]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={isVisible ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="flex items-center justify-between py-3 border-b border-foreground/10 text-sm md:text-base"
    >
      <div className={`flex-1 ${showStrike ? "text-muted-foreground" : ""}`}>
        <span className="relative font-mono">
          {name}
          {showStrike && (
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.3 }}
              className="absolute left-0 top-1/2 h-[2px] bg-destructive"
            />
          )}
        </span>
        <span className="text-background/50 text-xs md:text-sm ml-2">
          — {reason}
        </span>
      </div>
      <span
        className={`font-mono font-bold ${showStrike ? "text-muted-foreground" : ""}`}
      >
        {price}
      </span>
    </motion.div>
  );
}

// Feature Pill component
function FeaturePill({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4, type: "spring" }}
      whileHover={{ scale: 1.05, y: -2 }}
      className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium backdrop-blur-sm hover:bg-primary/15 hover:border-primary/30 transition-colors cursor-default"
    >
      {children}
    </motion.span>
  );
}

// Deployment Card component
function DeploymentCard({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor,
  isTerminal = false,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  isTerminal?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative p-6 rounded-xl border transition-all duration-300 ${
        isTerminal
          ? "bg-[oklch(15%_0.03_145_/_0.3)] border-[var(--terminal-green,oklch(75%_0.15_145))]/30 hover:border-[var(--terminal-green)]/50"
          : "bg-card/50 border-border/50 hover:border-primary/30 hover:bg-card/70"
      }`}
    >
      {badge && (
        <span
          className={`absolute top-4 right-4 px-2 py-0.5 text-xs font-mono rounded ${badgeColor}`}
        >
          {badge}
        </span>
      )}
      <Icon
        className={`w-8 h-8 mb-4 ${isTerminal ? "text-[var(--terminal-green,oklch(75%_0.15_145))]" : "text-primary"}`}
      />
      <h3
        className={`font-syne font-bold text-xl mb-2 ${isTerminal ? "text-[var(--terminal-green)]" : ""}`}
      >
        {title}
      </h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </motion.div>
  );
}

// Feature Card component for bento grid
function FeatureCard({
  icon: Icon,
  title,
  description,
  large = false,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  large?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      className={`relative p-5 md:p-6 rounded-xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm hover:border-primary/30 hover:bg-zinc-900/80 transition-all duration-300 group ${
        large ? "col-span-2 row-span-2" : ""
      }`}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Icon className="w-6 h-6 text-primary mb-3 relative z-10" />
      <h3 className="font-syne font-bold text-lg mb-1 relative z-10">
        {title}
      </h3>
      <p className="text-zinc-400 text-sm leading-relaxed relative z-10">
        {description}
      </p>
    </motion.div>
  );
}

// Trust Block component
function TrustBlock({
  icon: Icon,
  title,
  children,
  index,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      className="p-6 rounded-xl bg-zinc-900/40 border border-[var(--terminal-green,oklch(75%_0.15_145))]/20"
    >
      <Icon className="w-6 h-6 text-[var(--terminal-green)] mb-4" />
      <h3 className="font-mono text-[var(--terminal-green)] font-bold mb-3">
        {title}
      </h3>
      <div className="text-zinc-400 text-sm">{children}</div>
    </motion.div>
  );
}

export default function LandingPage() {
  const containerRef = useRef(null);
  const heroRef = useRef<HTMLElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const problemInView = useInView(problemRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const { displayText, isComplete } = useTypewriter(
    "One interface. Every model.",
    40,
    300,
  );

  // Parallax transforms
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const subscriptions = [
    {
      name: "ChatGPT Pro",
      price: "$20/mo",
      reason: "memory + GPT-5 for reasoning",
    },
    {
      name: "Claude Pro",
      price: "$20/mo",
      reason: "artifacts + best for code",
    },
    { name: "Perplexity Pro", price: "$20/mo", reason: "real-time web search" },
    {
      name: "Gemini Advanced",
      price: "$20/mo",
      reason: "long context + Google integration",
    },
    { name: "Grok", price: "$16/mo", reason: "unfiltered + real-time X data" },
  ];

  const features = [
    "50+ models",
    "Memory",
    "Projects",
    "Notes",
    "Tasks",
    "Web Search",
    "Code Execution",
    "Cost Tracking",
    "Knowledge Bank",
    "Voice Input",
  ];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30"
    >
      {/* Fixed Navigation */}
      <nav className="fixed top-0 w-full z-50 px-4 md:px-8 py-4 flex justify-between items-center backdrop-blur-md bg-background/80 border-b border-border/50">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
          >
            <Link
              href="https://github.com/planetaryescape/blah.chat"
              target="_blank"
            >
              <Github className="w-4 h-4 mr-1.5" />
              GitHub
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* ===== SECTION 1: HERO ===== */}
      <section
        ref={heroRef}
        className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-12 relative overflow-hidden"
      >
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          {/* Main headline with typewriter */}
          <h1 className="font-syne text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[0.9]">
            <span className="inline-block">
              {displayText}
              <span
                className={`inline-block w-[3px] md:w-[4px] h-[0.9em] bg-primary ml-1 align-middle ${isComplete ? "cursor-blink" : ""}`}
              />
            </span>
          </h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.6 }}
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 font-light"
          >
            GPT, Claude, Gemini, Grok, GLM, MiniMax, Kimi, and more.{" "}
            <span className="text-foreground font-medium">
              Switch mid-chat. Compare responses.
            </span>{" "}
            Own your data.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="rounded-full px-8 text-base">
              <Link href="/sign-up">
                Start chatting
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 text-base"
            >
              <Link
                href="https://github.com/planetaryescape/blah.chat"
                target="_blank"
              >
                <Github className="w-4 h-4 mr-2" />
                Self-host
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <span className="font-mono text-muted-foreground text-sm">
            scroll<span className="cursor-blink">_</span>
          </span>
        </motion.div>

        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </section>

      {/* ===== SECTION 2: THE PROBLEM ===== */}
      <section className="py-20 md:py-32 bg-foreground text-background relative">
        <div ref={problemRef} className="container px-4 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={problemInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-syne text-3xl md:text-5xl lg:text-6xl font-bold mb-4">
              The subscription sprawl.
            </h2>
            <p className="text-background/60 text-lg mb-12">Sound familiar?</p>

            {/* Subscription list */}
            <div className="mb-8">
              {subscriptions.map((sub, i) => (
                <SubscriptionItem
                  key={sub.name}
                  name={sub.name}
                  price={sub.price}
                  reason={sub.reason}
                  index={i}
                  isVisible={problemInView}
                />
              ))}
            </div>

            {/* Total */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={problemInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="flex items-center justify-between py-4 border-t-2 border-background/20"
            >
              <span className="font-mono text-xl font-bold">TOTAL</span>
              <span className="font-mono text-2xl md:text-3xl font-black text-destructive">
                $96+/mo
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={problemInView ? { opacity: 1 } : {}}
              transition={{ delay: 1.8, duration: 0.5 }}
              className="mt-8 text-background/50 text-center italic"
            >
              ...for scattered superpowers you can barely remember to use.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 3: THE SOLUTION ===== */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="container px-4 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-syne text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
              Everything. <span className="text-primary">One place.</span>
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-12">
              Access every model. Switch mid-conversation. Keep context forever.
              Pay once.
            </p>
          </motion.div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {features.map((feature, i) => (
              <FeaturePill key={feature} delay={0.1 + i * 0.05}>
                {feature}
              </FeaturePill>
            ))}
          </div>
        </div>

        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      </section>

      {/* ===== SECTION 4: DEPLOYMENT SPECTRUM ===== */}
      <section className="py-20 md:py-32 bg-zinc-950">
        <div className="container px-4 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-syne text-3xl md:text-5xl font-bold text-white mb-4">
              Your way.
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              From fully managed to fully yours. Pick your level of control.
            </p>
          </motion.div>

          {/* Spectrum line */}
          <div className="relative mb-8 hidden md:block">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-primary/50 via-zinc-700 to-[var(--terminal-green,oklch(75%_0.15_145))]/50" />
            <div className="flex justify-between">
              {["Easiest", "", "", "Full control"].map((label, i) => (
                <span key={i} className="text-xs text-zinc-500 font-mono">
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DeploymentCard
              icon={Cloud}
              title="Cloud"
              description="We handle everything. Sign up, chat. Zero config."
              index={0}
            />
            <DeploymentCard
              icon={Key}
              title="BYOK"
              description="Your API keys, your inference costs. We handle the rest."
              badge="Live"
              badgeColor="bg-primary/20 text-primary"
              index={1}
            />
            <DeploymentCard
              icon={Database}
              title="BYOD"
              description="Your Convex database. Your data stays yours."
              badge="Coming Soon"
              badgeColor="bg-zinc-700 text-zinc-300"
              index={2}
            />
            <DeploymentCard
              icon={Server}
              title="Self-host"
              description="Run it yourself. Fork it. Modify it. Own it."
              badge="AGPLv3"
              badgeColor="bg-[var(--terminal-green,oklch(75%_0.15_145))]/20 text-[var(--terminal-green)]"
              isTerminal
              index={3}
            />
          </div>

          {/* GitHub link */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <Link
              href="https://github.com/planetaryescape/blah.chat"
              target="_blank"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-mono text-sm transition-colors"
            >
              <Github className="w-4 h-4" />
              github.com/planetaryescape/blah.chat
              <ExternalLink className="w-3 h-3" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===== SECTION 5: FEATURES GRID ===== */}
      <section className="py-20 md:py-32 bg-zinc-950">
        <div className="container px-4 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-syne text-3xl md:text-5xl font-bold text-white mb-4">
              The toolkit.
            </h2>
            <p className="text-zinc-400 text-lg">
              Everything you need. Nothing you don't.
            </p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Large: All Models */}
            <FeatureCard
              icon={Sparkles}
              title="All Models"
              description="OpenAI, Anthropic, Google, Perplexity, Groq, xAI, and more. 50+ models, one interface."
              large
              index={0}
            />

            {/* Regular cards - Row 1 */}
            <FeatureCard
              icon={Zap}
              title="Mid-chat Switch"
              description="Change models without losing context."
              index={1}
            />
            <FeatureCard
              icon={Brain}
              title="Memory"
              description="Remembers you across conversations."
              index={2}
            />

            {/* Regular cards - Row 2 */}
            <FeatureCard
              icon={FolderKanban}
              title="Projects"
              description="Isolated contexts for different work."
              index={3}
            />
            <FeatureCard
              icon={FileText}
              title="Notes"
              description="Save, tag, search. Semantic retrieval."
              index={4}
            />
            <FeatureCard
              icon={ListTodo}
              title="Tasks"
              description="AI extracts tasks from conversations."
              index={5}
            />
            <FeatureCard
              icon={Search}
              title="Knowledge Bank"
              description="PDFs, URLs, YouTube. All searchable."
              index={6}
            />

            {/* Large: Tools */}
            <FeatureCard
              icon={Code2}
              title="20+ Tools"
              description="Web search, code execution, calculator, weather, URL reader, and more. Every model gets superpowers."
              large
              index={7}
            />

            {/* Regular cards - Row 3 */}
            <FeatureCard
              icon={DollarSign}
              title="Cost Tracking"
              description="Per-message transparency. No surprises."
              index={8}
            />
            <FeatureCard
              icon={WifiOff}
              title="Offline"
              description="Works without connection."
              index={9}
            />
            <FeatureCard
              icon={Mic}
              title="Voice"
              description="Talk to any model."
              index={10}
            />
            <FeatureCard
              icon={Split}
              title="Branching"
              description="Fork conversations. Explore paths."
              index={11}
            />
          </div>
        </div>
      </section>

      {/* ===== SECTION 6: TRUST ===== */}
      <section className="py-20 md:py-32 bg-zinc-950 border-t border-zinc-900">
        <div className="container px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-syne text-3xl md:text-5xl font-bold text-white mb-4">
              Open & transparent.
            </h2>
            <p className="text-zinc-400 text-lg">
              No black boxes. No hidden costs. No data hostage.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TrustBlock icon={Github} title="// CODE_IS_PUBLIC" index={0}>
              <div className="font-mono bg-black/50 rounded-lg p-3 mb-4 text-xs overflow-x-auto">
                <span className="text-zinc-500">$</span>{" "}
                <span className="text-[var(--terminal-green)]">git clone</span>{" "}
                github.com/planetaryescape/blah.chat
              </div>
              <p>Fork it. Audit it. Improve it. AGPLv3 licensed.</p>
            </TrustBlock>

            <TrustBlock icon={DollarSign} title="// COSTS_VISIBLE" index={1}>
              <div className="font-mono bg-black/50 rounded-lg p-3 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">input:</span>
                  <span>1,247 tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">output:</span>
                  <span>892 tokens</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 mt-2 pt-2">
                  <span className="text-zinc-500">cost:</span>
                  <span className="text-[var(--terminal-green)]">$0.0043</span>
                </div>
              </div>
              <p>Every message. Every token. Every cent.</p>
            </TrustBlock>

            <TrustBlock icon={Database} title="// DATA_IS_YOURS" index={2}>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[var(--terminal-green)]" />
                  <span>BYOD: Your database</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[var(--terminal-green)]" />
                  <span>Export anytime</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[var(--terminal-green)]" />
                  <span>Delete anytime</span>
                </div>
              </div>
              <p>No lock-in. No hostage data. Your stuff.</p>
            </TrustBlock>
          </div>
        </div>
      </section>

      {/* ===== SECTION 7: CTA ===== */}
      <section className="py-24 md:py-40 bg-zinc-950 relative overflow-hidden">
        <div className="container px-4 max-w-2xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8 flex justify-center">
              <Logo size="lg" />
            </div>

            <h2 className="font-syne text-2xl md:text-4xl font-bold text-white mb-4">
              Ready to unify?
            </h2>
            <p className="text-zinc-400 mb-10 text-lg">
              One interface. All models. Your way.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="rounded-full px-10 text-base w-full sm:w-auto"
              >
                <Link href="/sign-up">
                  Start chatting
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8 text-base w-full sm:w-auto"
              >
                <Link
                  href="https://github.com/planetaryescape/blah.chat"
                  target="_blank"
                >
                  <Github className="w-4 h-4 mr-2" />
                  View on GitHub
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[150px] pointer-events-none" />
      </section>

      {/* Footer */}
      <footer className="py-8 bg-zinc-950 border-t border-zinc-900">
        <div className="container px-4 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-zinc-500 text-sm">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
            </div>
            <div className="flex items-center gap-6 font-mono text-xs">
              <Link
                href="https://github.com/planetaryescape/blah.chat"
                target="_blank"
                className="hover:text-white transition-colors"
              >
                GitHub
              </Link>
              <Link
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
