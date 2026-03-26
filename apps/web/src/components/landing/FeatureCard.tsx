import type React from "react";

export function FeatureCard({
  icon: Icon,
  title,
  description,
  large = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  large?: boolean;
  index?: number;
}) {
  return (
    <div
      className={`relative p-5 md:p-6 rounded-xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm hover:border-primary/30 hover:bg-zinc-900/80 transition-all duration-300 group hover:scale-[1.02] ${
        large ? "col-span-2 md:row-span-2" : ""
      }`}
    >
      <Icon className="w-6 h-6 text-primary mb-3" />
      <h3 className="font-syne font-bold text-lg text-white mb-1">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
