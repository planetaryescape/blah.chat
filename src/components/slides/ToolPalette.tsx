"use client";

import { cn } from "@/lib/utils";
import { Eraser, Highlighter, Pen, Trash2, Undo2 } from "lucide-react";
import { useCallback } from "react";

export type ToolType = "pen" | "highlighter" | "eraser";

interface ToolPaletteProps {
	currentTool: ToolType;
	currentColor: string;
	currentWidth: number;
	onToolChange: (tool: ToolType) => void;
	onColorChange: (color: string) => void;
	onWidthChange: (width: number) => void;
	onUndo: () => void;
	onClear: () => void;
	canUndo: boolean;
}

const COLORS = [
	{ value: "#ff0000", label: "Red" },
	{ value: "#ff6600", label: "Orange" },
	{ value: "#ffcc00", label: "Yellow" },
	{ value: "#00cc00", label: "Green" },
	{ value: "#0066ff", label: "Blue" },
	{ value: "#9933ff", label: "Purple" },
	{ value: "#ffffff", label: "White" },
	{ value: "#000000", label: "Black" },
];

const WIDTHS = [4, 8, 12, 20];

export function ToolPalette({
	currentTool,
	currentColor,
	currentWidth,
	onToolChange,
	onColorChange,
	onWidthChange,
	onUndo,
	onClear,
	canUndo,
}: ToolPaletteProps) {
	const getToolOpacity = useCallback((tool: ToolType) => {
		if (tool === "highlighter") return 0.4;
		return 1;
	}, []);

	return (
		<div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 pointer-events-auto">
			{/* Tools */}
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={() => onToolChange("pen")}
					className={cn(
						"p-2 rounded-full transition-colors",
						currentTool === "pen"
							? "bg-white/20 text-white"
							: "text-white/60 hover:text-white hover:bg-white/10",
					)}
					title="Pen"
				>
					<Pen className="h-5 w-5" />
				</button>
				<button
					type="button"
					onClick={() => onToolChange("highlighter")}
					className={cn(
						"p-2 rounded-full transition-colors",
						currentTool === "highlighter"
							? "bg-white/20 text-white"
							: "text-white/60 hover:text-white hover:bg-white/10",
					)}
					title="Highlighter"
				>
					<Highlighter className="h-5 w-5" />
				</button>
				<button
					type="button"
					onClick={() => onToolChange("eraser")}
					className={cn(
						"p-2 rounded-full transition-colors",
						currentTool === "eraser"
							? "bg-white/20 text-white"
							: "text-white/60 hover:text-white hover:bg-white/10",
					)}
					title="Eraser"
				>
					<Eraser className="h-5 w-5" />
				</button>
			</div>

			{/* Divider */}
			<div className="w-px h-6 bg-white/20" />

			{/* Colors */}
			{currentTool !== "eraser" && (
				<>
					<div className="flex items-center gap-1">
						{COLORS.map((color) => (
							<button
								key={color.value}
								type="button"
								onClick={() => onColorChange(color.value)}
								className={cn(
									"w-6 h-6 rounded-full border-2 transition-transform",
									currentColor === color.value
										? "border-white scale-110"
										: "border-transparent hover:scale-105",
								)}
								style={{
									backgroundColor: color.value,
									opacity: getToolOpacity(currentTool),
								}}
								title={color.label}
							/>
						))}
					</div>

					{/* Divider */}
					<div className="w-px h-6 bg-white/20" />

					{/* Widths */}
					<div className="flex items-center gap-1">
						{WIDTHS.map((width) => (
							<button
								key={width}
								type="button"
								onClick={() => onWidthChange(width)}
								className={cn(
									"w-8 h-8 rounded-full flex items-center justify-center transition-colors",
									currentWidth === width
										? "bg-white/20"
										: "hover:bg-white/10",
								)}
								title={`${width}px`}
							>
								<div
									className="rounded-full bg-white"
									style={{
										width: Math.min(width, 16),
										height: Math.min(width, 16),
									}}
								/>
							</button>
						))}
					</div>

					{/* Divider */}
					<div className="w-px h-6 bg-white/20" />
				</>
			)}

			{/* Actions */}
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={onUndo}
					disabled={!canUndo}
					className={cn(
						"p-2 rounded-full transition-colors",
						canUndo
							? "text-white/60 hover:text-white hover:bg-white/10"
							: "text-white/20 cursor-not-allowed",
					)}
					title="Undo"
				>
					<Undo2 className="h-5 w-5" />
				</button>
				<button
					type="button"
					onClick={onClear}
					className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
					title="Clear All"
				>
					<Trash2 className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}
