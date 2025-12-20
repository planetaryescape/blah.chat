"use client";

import { getStroke } from "perfect-freehand";
import { useCallback, useImperativeHandle, useRef, useState, forwardRef } from "react";
import type { ToolType } from "./ToolPalette";

interface Point {
	x: number;
	y: number;
	pressure: number;
}

interface Stroke {
	id: string;
	points: Point[];
	color: string;
	width: number;
	opacity: number;
}

interface AnnotationCanvasProps {
	enabled: boolean;
	tool: ToolType;
	color: string;
	width: number;
}

export interface AnnotationCanvasRef {
	undo: () => void;
	clear: () => void;
	canUndo: () => boolean;
}

// Convert stroke points to SVG path
function getSvgPathFromStroke(stroke: number[][]): string {
	if (!stroke.length) return "";

	const d = stroke.reduce(
		(acc, [x0, y0], i, arr) => {
			const [x1, y1] = arr[(i + 1) % arr.length];
			acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
			return acc;
		},
		["M", ...stroke[0], "Q"],
	);

	d.push("Z");
	return d.join(" ");
}

// Distance between two points
function distance(p1: Point, p2: Point): number {
	return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(
	function AnnotationCanvas({ enabled, tool, color, width }, ref) {
		const containerRef = useRef<HTMLDivElement>(null);
		const [strokes, setStrokes] = useState<Stroke[]>([]);
		const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
		const [isDrawing, setIsDrawing] = useState(false);
		const strokeIdRef = useRef(0);

		// Expose methods to parent
		useImperativeHandle(ref, () => ({
			undo: () => setStrokes((prev) => prev.slice(0, -1)),
			clear: () => {
				setStrokes([]);
				setCurrentPoints([]);
			},
			canUndo: () => strokes.length > 0,
		}));

		// Get current stroke settings based on tool
		const getStrokeSettings = useCallback(() => {
			switch (tool) {
				case "highlighter":
					return { color: "#ffff00", width: 24, opacity: 0.4 };
				case "eraser":
					return { color: "transparent", width: 20, opacity: 1 };
				default:
					return { color, width, opacity: 0.9 };
			}
		}, [tool, color, width]);

		// Check if point is near any stroke (for eraser)
		const eraseAtPoint = useCallback((point: Point) => {
			const eraseRadius = 20;
			setStrokes((prev) =>
				prev.filter((stroke) => {
					// Check if any point in the stroke is within eraser radius
					return !stroke.points.some((p) => distance(p, point) < eraseRadius);
				}),
			);
		}, []);

		const handlePointerDown = useCallback(
			(e: React.PointerEvent) => {
				if (!enabled) return;
				e.preventDefault();
				e.currentTarget.setPointerCapture(e.pointerId);
				setIsDrawing(true);

				const point = { x: e.clientX, y: e.clientY, pressure: e.pressure || 0.5 };

				if (tool === "eraser") {
					eraseAtPoint(point);
				} else {
					setCurrentPoints([point]);
				}
			},
			[enabled, tool, eraseAtPoint],
		);

		const handlePointerMove = useCallback(
			(e: React.PointerEvent) => {
				if (!isDrawing || !enabled) return;
				e.preventDefault();

				const point = { x: e.clientX, y: e.clientY, pressure: e.pressure || 0.5 };

				if (tool === "eraser") {
					eraseAtPoint(point);
				} else {
					setCurrentPoints((prev) => [...prev, point]);
				}
			},
			[isDrawing, enabled, tool, eraseAtPoint],
		);

		const handlePointerUp = useCallback(
			(e: React.PointerEvent) => {
				if (!isDrawing) return;
				e.preventDefault();
				e.currentTarget.releasePointerCapture(e.pointerId);
				setIsDrawing(false);

				if (currentPoints.length > 0 && tool !== "eraser") {
					const settings = getStrokeSettings();
					setStrokes((prev) => [
						...prev,
						{
							id: `stroke-${strokeIdRef.current++}`,
							points: currentPoints,
							color: settings.color,
							width: settings.width,
							opacity: settings.opacity,
						},
					]);
					setCurrentPoints([]);
				}
			},
			[isDrawing, currentPoints, tool, getStrokeSettings],
		);

		const handlePointerCancel = useCallback(() => {
			setIsDrawing(false);
			setCurrentPoints([]);
		}, []);

		if (!enabled) return null;

		const settings = getStrokeSettings();

		// Get stroke path for current drawing
		const currentStroke =
			currentPoints.length > 0 && tool !== "eraser"
				? getStroke(
						currentPoints.map((p) => [p.x, p.y, p.pressure]),
						{
							size: settings.width,
							thinning: tool === "highlighter" ? 0 : 0.5,
							smoothing: 0.5,
							streamline: 0.5,
							simulatePressure: true,
						},
					)
				: null;

		return (
			<div
				ref={containerRef}
				className="fixed inset-0 z-[90] touch-none"
				style={{ cursor: tool === "eraser" ? "crosshair" : "crosshair" }}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerCancel}
				onPointerLeave={handlePointerCancel}
			>
				<svg className="absolute inset-0 w-full h-full pointer-events-none">
					{/* Completed strokes */}
					{strokes.map((stroke) => {
						const pathPoints = getStroke(
							stroke.points.map((p) => [p.x, p.y, p.pressure]),
							{
								size: stroke.width,
								thinning: stroke.opacity < 0.5 ? 0 : 0.5, // Highlighter has no thinning
								smoothing: 0.5,
								streamline: 0.5,
								simulatePressure: true,
							},
						);
						return (
							<path
								key={stroke.id}
								d={getSvgPathFromStroke(pathPoints)}
								fill={stroke.color}
								opacity={stroke.opacity}
							/>
						);
					})}

					{/* Current stroke being drawn */}
					{currentStroke && (
						<path
							d={getSvgPathFromStroke(currentStroke)}
							fill={settings.color}
							opacity={settings.opacity}
						/>
					)}
				</svg>

				{/* Eraser cursor indicator */}
				{tool === "eraser" && isDrawing && currentPoints.length > 0 && (
					<div
						className="fixed pointer-events-none rounded-full border-2 border-white/50"
						style={{
							left: currentPoints[currentPoints.length - 1].x - 10,
							top: currentPoints[currentPoints.length - 1].y - 10,
							width: 20,
							height: 20,
						}}
					/>
				)}
			</div>
		);
	},
);
