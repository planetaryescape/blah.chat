"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TrailPoint {
	x: number;
	y: number;
	age: number;
}

interface LaserPointerProps {
	enabled: boolean;
	color?: string;
}

export function LaserPointer({
	enabled,
	color = "#ff0000",
}: LaserPointerProps) {
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [trail, setTrail] = useState<TrailPoint[]>([]);
	const [isVisible, setIsVisible] = useState(false);
	const animationRef = useRef<number | null>(null);

	// Track mouse position
	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!enabled) return;
			setPosition({ x: e.clientX, y: e.clientY });
			setIsVisible(true);

			// Add to trail
			setTrail((prev) => [
				...prev.slice(-15),
				{ x: e.clientX, y: e.clientY, age: 0 },
			]);
		},
		[enabled],
	);

	// Hide when mouse leaves window
	const handleMouseLeave = useCallback(() => {
		setIsVisible(false);
		setTrail([]);
	}, []);

	// Animate trail aging
	useEffect(() => {
		if (!enabled) {
			setTrail([]);
			return;
		}

		const animate = () => {
			setTrail((prev) =>
				prev
					.map((p) => ({ ...p, age: p.age + 1 }))
					.filter((p) => p.age < 20),
			);
			animationRef.current = requestAnimationFrame(animate);
		};

		animationRef.current = requestAnimationFrame(animate);

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [enabled]);

	// Mouse event listeners
	useEffect(() => {
		if (!enabled) return;

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [enabled, handleMouseMove, handleMouseLeave]);

	if (!enabled || !isVisible) return null;

	return (
		<div className="fixed inset-0 pointer-events-none z-[100]">
			{/* Trail */}
			{trail.map((point, index) => {
				const opacity = 1 - point.age / 20;
				const scale = 1 - point.age / 40;
				return (
					<div
						key={`${point.x}-${point.y}-${index}`}
						className="absolute rounded-full"
						style={{
							left: point.x - 4,
							top: point.y - 4,
							width: 8,
							height: 8,
							backgroundColor: color,
							opacity: opacity * 0.5,
							transform: `scale(${scale})`,
							boxShadow: `0 0 ${8 * scale}px ${4 * scale}px ${color}40`,
						}}
					/>
				);
			})}

			{/* Main pointer */}
			<div
				className="absolute"
				style={{
					left: position.x - 8,
					top: position.y - 8,
					width: 16,
					height: 16,
				}}
			>
				{/* Outer glow */}
				<div
					className="absolute inset-0 rounded-full animate-pulse"
					style={{
						background: `radial-gradient(circle, ${color}80 0%, transparent 70%)`,
						boxShadow: `0 0 24px 12px ${color}60`,
					}}
				/>
				{/* Inner dot */}
				<div
					className="absolute rounded-full"
					style={{
						left: 4,
						top: 4,
						width: 8,
						height: 8,
						backgroundColor: color,
						boxShadow: `0 0 8px 4px ${color}`,
					}}
				/>
			</div>
		</div>
	);
}
