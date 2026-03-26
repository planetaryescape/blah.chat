"use client";

import { motion } from "framer-motion";
import type React from "react";

export function TrustBlock({
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
