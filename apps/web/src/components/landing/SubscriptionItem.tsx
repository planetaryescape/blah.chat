"use client";

import { m } from "framer-motion";

import { useEffect, useState } from "react";

export function SubscriptionItem({
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
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={isVisible ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="flex items-center justify-between py-3 border-b border-foreground/10 text-sm md:text-base"
    >
      <div className={`flex-1 ${showStrike ? "text-muted-foreground" : ""}`}>
        <span className="relative font-mono">
          {name}
          {showStrike && (
            <m.span
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
    </m.div>
  );
}
