"use client";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { usePresentationSync } from "@/hooks/usePresentationSync";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Monitor, Pencil, Pointer, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnnotationCanvas, type AnnotationCanvasRef } from "./AnnotationCanvas";
import { LaserPointer } from "./LaserPointer";
import { RemoteQRModal } from "./RemoteQRModal";
import { ToolPalette, type ToolType } from "./ToolPalette";

interface PresentationModeProps {
	slides: Doc<"slides">[];
	initialSlideIndex?: number;
	onExit: () => void;
	presentationId: Id<"presentations">;
	sessionId?: Id<"presentationSessions">;
}

export function PresentationMode({
	slides,
	initialSlideIndex = 0,
	onExit,
	presentationId,
	sessionId,
}: PresentationModeProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);
	const [direction, setDirection] = useState(0);
	const [showControls, setShowControls] = useState(true);
	const [blackScreen, setBlackScreen] = useState(false);
	const [laserEnabled, setLaserEnabled] = useState(false);
	const [drawingEnabled, setDrawingEnabled] = useState(false);
	const [drawingTool, setDrawingTool] = useState<ToolType>("pen");
	const [drawingColor, setDrawingColor] = useState("#ff0000");
	const [drawingWidth, setDrawingWidth] = useState(8);
	const [canUndo, setCanUndo] = useState(false);
	const [showRemoteModal, setShowRemoteModal] = useState(false);
	const [internalSessionId, setInternalSessionId] = useState<Id<"presentationSessions"> | null>(null);
	const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const canvasRef = useRef<AnnotationCanvasRef>(null);

	// Touch/swipe state
	const [touchStart, setTouchStart] = useState<number | null>(null);

	// Presenter view window ref
	const presenterWindowRef = useRef<Window | null>(null);

	const currentSlide = slides[currentIndex];

	// Sync with presenter view
	const { sendSlideChange, sendLaserToggle } = usePresentationSync({
		presentationId,
		role: "presenter",
		onSlideChange: (index) => {
			setDirection(index > currentIndex ? 1 : -1);
			setCurrentIndex(index);
		},
		onLaserToggle: (enabled) => setLaserEnabled(enabled),
	});

	// Toggle laser pointer
	const toggleLaser = useCallback(() => {
		setLaserEnabled((prev) => {
			const newValue = !prev;
			sendLaserToggle(newValue);
			// Disable drawing when enabling laser
			if (newValue) setDrawingEnabled(false);
			return newValue;
		});
	}, [sendLaserToggle]);

	// Toggle drawing mode
	const toggleDrawing = useCallback(() => {
		setDrawingEnabled((prev) => {
			const newValue = !prev;
			// Disable laser when enabling drawing
			if (newValue) {
				setLaserEnabled(false);
				sendLaserToggle(false);
			}
			return newValue;
		});
	}, [sendLaserToggle]);

	// Drawing canvas actions
	const handleUndo = useCallback(() => {
		canvasRef.current?.undo();
		setCanUndo(canvasRef.current?.canUndo() ?? false);
	}, []);

	const handleClear = useCallback(() => {
		canvasRef.current?.clear();
		setCanUndo(false);
	}, []);

	// Update canUndo when strokes change
	const updateCanUndo = useCallback(() => {
		setCanUndo(canvasRef.current?.canUndo() ?? false);
	}, []);

	// Get slide image URL
	const imageUrl = useQuery(
		// @ts-ignore - Type depth exceeded with 94+ Convex modules
		api.storage.getUrl,
		currentSlide?.imageStorageId
			? { storageId: currentSlide.imageStorageId }
			: "skip",
	);

	// Use prop sessionId or internal sessionId (created via RemoteQRModal)
	const effectiveSessionId = sessionId ?? internalSessionId;

	// Session subscription for remote control sync
	// @ts-ignore - Type depth exceeded with 94+ Convex modules
	const session = useQuery(
		// @ts-ignore - Type depth exceeded with 94+ Convex modules
		api.presentationSessions.get,
		effectiveSessionId ? { sessionId: effectiveSessionId } : "skip",
	);

	// @ts-ignore - Type depth exceeded with 94+ Convex modules
	const updateSlide = useMutation(api.presentationSessions.updateSlide);

	// Sync slide index from remote control
	useEffect(() => {
		if (session && session.currentSlide !== currentIndex) {
			setDirection(session.currentSlide > currentIndex ? 1 : -1);
			setCurrentIndex(session.currentSlide);
		}
	}, [session?.currentSlide, currentIndex]);

	// Navigation functions
	const nextSlide = useCallback(() => {
		if (currentIndex < slides.length - 1) {
			setDirection(1);
			const newIndex = currentIndex + 1;
			setCurrentIndex(newIndex);
			sendSlideChange(newIndex);
			// Also update session for remote control sync
			if (effectiveSessionId) {
				updateSlide({ sessionId: effectiveSessionId, slideIndex: newIndex }).catch(() => {});
			}
		}
	}, [currentIndex, slides.length, sendSlideChange, effectiveSessionId, updateSlide]);

	const prevSlide = useCallback(() => {
		if (currentIndex > 0) {
			setDirection(-1);
			const newIndex = currentIndex - 1;
			setCurrentIndex(newIndex);
			sendSlideChange(newIndex);
			// Also update session for remote control sync
			if (effectiveSessionId) {
				updateSlide({ sessionId: effectiveSessionId, slideIndex: newIndex }).catch(() => {});
			}
		}
	}, [currentIndex, sendSlideChange, effectiveSessionId, updateSlide]);

	const jumpToSlide = useCallback(
		(index: number) => {
			if (index >= 0 && index < slides.length) {
				setDirection(index > currentIndex ? 1 : -1);
				setCurrentIndex(index);
				sendSlideChange(index);
				// Also update session for remote control sync
				if (effectiveSessionId) {
					updateSlide({ sessionId: effectiveSessionId, slideIndex: index }).catch(() => {});
				}
			}
		},
		[currentIndex, slides.length, sendSlideChange, effectiveSessionId, updateSlide],
	);

	// Open presenter view in new window
	const openPresenterView = useCallback(() => {
		const presenterUrl = `/slides/${presentationId}/presenter`;
		presenterWindowRef.current = window.open(
			presenterUrl,
			"presenter",
			"width=1200,height=800,resizable=yes",
		);
	}, [presentationId]);

	// Auto-hide controls
	const resetHideTimer = useCallback(() => {
		setShowControls(true);
		if (hideTimeoutRef.current) {
			clearTimeout(hideTimeoutRef.current);
		}
		hideTimeoutRef.current = setTimeout(() => {
			setShowControls(false);
		}, 3000);
	}, []);

	// Initialize hide timer on mount (fullscreen triggered by click handler in parent)
	useEffect(() => {
		resetHideTimer();

		return () => {
			if (hideTimeoutRef.current) {
				clearTimeout(hideTimeoutRef.current);
			}
		};
	}, [resetHideTimer]);

	// Listen for fullscreen exit (user pressed Escape natively)
	useEffect(() => {
		const handleFullscreenChange = () => {
			if (!document.fullscreenElement) {
				onExit();
			}
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () =>
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, [onExit]);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			resetHideTimer();

			switch (e.key) {
				case "ArrowRight":
				case " ":
				case "Enter":
					e.preventDefault();
					nextSlide();
					break;
				case "ArrowLeft":
				case "Backspace":
					e.preventDefault();
					prevSlide();
					break;
				case "Escape":
					e.preventDefault();
					document.exitFullscreen?.();
					onExit();
					break;
				case "Home":
					e.preventDefault();
					jumpToSlide(0);
					break;
				case "End":
					e.preventDefault();
					jumpToSlide(slides.length - 1);
					break;
				case "b":
				case "B":
					e.preventDefault();
					setBlackScreen((prev) => !prev);
					break;
				case "p":
				case "P":
					e.preventDefault();
					openPresenterView();
					break;
				case "l":
				case "L":
					e.preventDefault();
					toggleLaser();
					break;
				case "d":
				case "D":
					e.preventDefault();
					toggleDrawing();
					break;
				default:
					// Number keys 1-9, 0
					if (e.key >= "1" && e.key <= "9") {
						e.preventDefault();
						jumpToSlide(Number.parseInt(e.key) - 1);
					} else if (e.key === "0") {
						e.preventDefault();
						jumpToSlide(9);
					}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [nextSlide, prevSlide, jumpToSlide, onExit, slides.length, resetHideTimer, openPresenterView, toggleLaser, toggleDrawing]);

	// Mouse movement shows controls
	useEffect(() => {
		const handleMouseMove = () => resetHideTimer();
		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, [resetHideTimer]);

	// Touch/swipe handlers
	const handlePointerDown = (e: React.PointerEvent) => {
		setTouchStart(e.clientX);
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		if (touchStart === null) return;
		const delta = e.clientX - touchStart;
		const threshold = 50;

		if (delta > threshold) {
			prevSlide();
		} else if (delta < -threshold) {
			nextSlide();
		}
		setTouchStart(null);
	};

	const handlePointerCancel = () => {
		setTouchStart(null);
	};

	// Progress percentage
	const progress = ((currentIndex + 1) / slides.length) * 100;

	return (
		<div
			ref={containerRef}
			data-presentation-container
			className="fixed inset-0 bg-black z-50 select-none"
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerCancel}
			onMouseMove={resetHideTimer}
		>
			{/* Black screen overlay */}
			{blackScreen && (
				<div className="absolute inset-0 bg-black z-40" onClick={() => setBlackScreen(false)} />
			)}

			{/* Slide content */}
			<AnimatePresence mode="wait" initial={false}>
				<motion.div
					key={currentSlide?._id}
					initial={{ opacity: 0, x: direction * 100 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: direction * -100 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="absolute inset-0 flex items-center justify-center"
				>
					{imageUrl ? (
						<Image
							src={imageUrl}
							alt={currentSlide?.title || "Slide"}
							fill
							className="object-contain"
							priority
							sizes="100vw"
						/>
					) : (
						<div className="text-white/50 text-xl">Loading slide...</div>
					)}
				</motion.div>
			</AnimatePresence>

			{/* Auto-hide overlay controls */}
			<div
				className={cn(
					"absolute inset-0 pointer-events-none transition-opacity duration-300 z-30",
					showControls ? "opacity-100" : "opacity-0",
				)}
			>
				{/* Top right buttons */}
				<div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
					{/* Laser pointer button */}
					<button
						type="button"
						onClick={toggleLaser}
						className={cn(
							"p-2 rounded-full transition-colors",
							laserEnabled
								? "bg-red-500/80 text-white"
								: "bg-black/50 text-white hover:bg-black/70",
						)}
						aria-label="Toggle laser pointer"
						title="Laser Pointer (L)"
					>
						<Pointer className="h-6 w-6" />
					</button>
					{/* Drawing mode button */}
					<button
						type="button"
						onClick={toggleDrawing}
						className={cn(
							"p-2 rounded-full transition-colors",
							drawingEnabled
								? "bg-yellow-500/80 text-white"
								: "bg-black/50 text-white hover:bg-black/70",
						)}
						aria-label="Toggle drawing mode"
						title="Draw (D)"
					>
						<Pencil className="h-6 w-6" />
					</button>
					{/* Presenter view button */}
					<button
						type="button"
						onClick={openPresenterView}
						className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
						aria-label="Open presenter view"
						title="Presenter View (P)"
					>
						<Monitor className="h-6 w-6" />
					</button>
					{/* Remote control button */}
					<button
						type="button"
						onClick={() => setShowRemoteModal(true)}
						className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
						aria-label="Remote control"
						title="Remote Control"
					>
						<Smartphone className="h-6 w-6" />
					</button>
					{/* Exit button */}
					<button
						type="button"
						onClick={() => {
							document.exitFullscreen?.();
							onExit();
						}}
						className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
						aria-label="Exit presentation"
					>
						<X className="h-6 w-6" />
					</button>
				</div>

				{/* Navigation hints - left */}
				{currentIndex > 0 && (
					<button
						type="button"
						onClick={prevSlide}
						className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white transition-all pointer-events-auto"
						aria-label="Previous slide"
					>
						<ChevronLeft className="h-8 w-8" />
					</button>
				)}

				{/* Navigation hints - right */}
				{currentIndex < slides.length - 1 && (
					<button
						type="button"
						onClick={nextSlide}
						className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white transition-all pointer-events-auto"
						aria-label="Next slide"
					>
						<ChevronRight className="h-8 w-8" />
					</button>
				)}

				{/* Bottom bar */}
				<div className="absolute bottom-0 left-0 right-0 p-4">
					{/* Slide counter */}
					<div className="flex items-center justify-between mb-2">
						<span className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded">
							{currentIndex + 1} / {slides.length}
						</span>
						{blackScreen && (
							<span className="text-white/60 text-sm bg-black/40 px-3 py-1 rounded">
								Press B to resume
							</span>
						)}
					</div>

					{/* Progress bar */}
					<div className="h-1 bg-white/20 rounded-full overflow-hidden">
						<motion.div
							className="h-full bg-white/80"
							initial={false}
							animate={{ width: `${progress}%` }}
							transition={{ duration: 0.2 }}
						/>
					</div>
				</div>
			</div>

			{/* Keyboard hints (shown briefly on first load) */}
			<div
				className={cn(
					"absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs text-center transition-opacity duration-500 pointer-events-none",
					showControls ? "opacity-100" : "opacity-0",
				)}
			>
				<span className="bg-black/30 px-3 py-1 rounded">
					← → Navigate • L Laser • D Draw • P Presenter • B Black • Esc Exit
				</span>
			</div>

			{/* Annotation canvas overlay */}
			<AnnotationCanvas
				ref={canvasRef}
				enabled={drawingEnabled}
				tool={drawingTool}
				color={drawingColor}
				width={drawingWidth}
			/>

			{/* Tool palette for drawing */}
			{drawingEnabled && (
				<ToolPalette
					currentTool={drawingTool}
					currentColor={drawingColor}
					currentWidth={drawingWidth}
					onToolChange={setDrawingTool}
					onColorChange={setDrawingColor}
					onWidthChange={setDrawingWidth}
					onUndo={handleUndo}
					onClear={handleClear}
					canUndo={canUndo}
				/>
			)}

			{/* Laser pointer overlay */}
			<LaserPointer enabled={laserEnabled} />

			{/* Remote control QR modal */}
			<RemoteQRModal
				open={showRemoteModal}
				onClose={() => setShowRemoteModal(false)}
				presentationId={presentationId}
				totalSlides={slides.length}
				onSessionCreated={setInternalSessionId}
			/>
		</div>
	);
}
