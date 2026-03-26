"use client";

import { motion } from "framer-motion";
import type React from "react";

export function DeploymentCard({
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
