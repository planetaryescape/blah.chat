"use client";

import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface StyleOption {
  id: string;
  name: string;
  description: string;
  imageSrc: string; // Placeholder for now, or use a component/icon
  category: "illustrated" | "photorealistic" | "abstract" | "minimal";
}

const STYLES: StyleOption[] = [
  {
    id: "minimalist-line",
    name: "Minimalist Line",
    description:
      "Clean, elegant line art with subtle colors. Professional and modern.",
    category: "minimal",
    imageSrc: "/styles/minimal-line.jpg",
  },
  {
    id: "corporate-vector",
    name: "Corporate Vector",
    description:
      "Flat, professional vector illustrations suitable for business decks.",
    category: "illustrated",
    imageSrc: "/styles/corporate-vector.jpg",
  },
  {
    id: "photorealistic",
    name: "Photorealistic",
    description: "High-quality photographic imagery for impactful visuals.",
    category: "photorealistic",
    imageSrc: "/styles/photo.jpg",
  },
  {
    id: "collage-art",
    name: "Collage Art",
    description: "Creative mixed-media collage style. Unique and artistic.",
    category: "abstract",
    imageSrc: "/styles/collage.jpg",
  },
  {
    id: "3d-render",
    name: "3D Render",
    description: "Soft, modern 3D shapes and objects.",
    category: "illustrated",
    imageSrc: "/styles/3d.jpg",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Neon, high-contrast, futuristic tech aesthetic.",
    category: "abstract",
    imageSrc: "/styles/cyberpunk.jpg",
  },
];

interface StyleSelectorProps {
  selectedStyleId: string;
  onSelect: (styleId: string) => void;
  className?: string;
}

export function StyleSelector({
  selectedStyleId,
  onSelect,
  className,
}: StyleSelectorProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-3", className)}>
      {STYLES.map((style) => {
        const isSelected = selectedStyleId === style.id;
        return (
          <motion.button
            key={style.id}
            type="button"
            onClick={() => onSelect(style.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative flex flex-col items-start text-left p-3 rounded-xl border-2 transition-all overflow-hidden h-full",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-primary/50 hover:bg-muted/30",
            )}
          >
            {/* Visual Preview Placeholder - In real app, use next/image or dynamic preview */}
            <div
              className={cn(
                "w-full aspect-[16/9] rounded-lg mb-3 overflow-hidden bg-muted/50 flex items-center justify-center relative",
                isSelected ? "ring-2 ring-primary/20" : "",
              )}
            >
              {/* Gradients to simulate style */}
              <div
                className={cn(
                  "absolute inset-0 opacity-50",
                  style.category === "minimal" &&
                    "bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900",
                  style.category === "illustrated" &&
                    "bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-800",
                  style.category === "photorealistic" &&
                    "bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900 dark:to-orange-800",
                  style.category === "abstract" &&
                    "bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-900 dark:to-pink-800",
                )}
              />

              <span className="text-xs font-semibold opacity-50 z-10">
                {style.category}
              </span>
            </div>

            <div className="flex justify-between items-start w-full">
              <div>
                <span className="font-semibold text-sm block mb-1">
                  {style.name}
                </span>
                <span className="text-xs text-muted-foreground leading-tight line-clamp-2">
                  {style.description}
                </span>
              </div>
              {isSelected && (
                <div className="bg-primary text-primary-foreground rounded-full p-0.5 ml-2 mt-0.5 shrink-0">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Hover Info */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{style.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.button>
        );
      })}
    </div>
  );
}
