"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

import Image from "next/image";

export function Logo({
  size = "md",
  animated = true,
  showText = true,
}: LogoProps & { showText?: boolean }) {
  const sizes = {
    sm: { text: "text-lg", icon: 20 },
    md: { text: "text-2xl", icon: 28 },
    lg: { text: "text-4xl", icon: 40 },
  };

  const iconSize = sizes[size].icon;

  return (
    <div className="flex items-center gap-2.5">
      {/* Logo Icon */}
      <div className="relative">
        <Image
          src="/icon.png"
          alt="blah.chat logo"
          width={iconSize}
          height={iconSize}
          className={animated ? "animate-pulse-subtle" : ""}
          priority
        />
      </div>

      {/* Text lockup */}
      {showText && (
        <div
          className={`${sizes[size].text} font-[family-name:var(--font-syne)] leading-none flex items-baseline`}
        >
          <span className="text-foreground font-bold tracking-tighter">
            blah
          </span>
          <span className="text-muted-foreground font-medium tracking-tight">
            .chat
          </span>
        </div>
      )}
    </div>
  );
}
