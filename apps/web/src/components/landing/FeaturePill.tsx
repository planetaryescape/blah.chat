"use client";

import { motion } from "framer-motion";
import type React from "react";

export function FeaturePill({
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
