"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PresentationSyncMessage {
	type:
		| "slide-change"
		| "timer-start"
		| "timer-reset"
		| "exit"
		| "laser-toggle"
		| "draw-toggle";
	slideIndex?: number;
	timestamp?: number;
	enabled?: boolean;
}

interface UsePresentationSyncOptions {
	presentationId: string;
	role: "presenter" | "viewer";
	onSlideChange?: (index: number) => void;
	onTimerStart?: () => void;
	onTimerReset?: () => void;
	onExit?: () => void;
	onLaserToggle?: (enabled: boolean) => void;
	onDrawToggle?: (enabled: boolean) => void;
}

export function usePresentationSync({
	presentationId,
	role,
	onSlideChange,
	onTimerStart,
	onTimerReset,
	onExit,
	onLaserToggle,
	onDrawToggle,
}: UsePresentationSyncOptions) {
	const channelRef = useRef<BroadcastChannel | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] =
		useState<PresentationSyncMessage | null>(null);

	// Initialize channel
	useEffect(() => {
		const channelName = `presentation-sync-${presentationId}`;
		channelRef.current = new BroadcastChannel(channelName);
		setIsConnected(true);

		const handleMessage = (event: MessageEvent<PresentationSyncMessage>) => {
			const message = event.data;
			setLastMessage(message);

			switch (message.type) {
				case "slide-change":
					if (message.slideIndex !== undefined) {
						onSlideChange?.(message.slideIndex);
					}
					break;
				case "timer-start":
					onTimerStart?.();
					break;
				case "timer-reset":
					onTimerReset?.();
					break;
				case "exit":
					onExit?.();
					break;
				case "laser-toggle":
					if (message.enabled !== undefined) {
						onLaserToggle?.(message.enabled);
					}
					break;
				case "draw-toggle":
					if (message.enabled !== undefined) {
						onDrawToggle?.(message.enabled);
					}
					break;
			}
		};

		channelRef.current.onmessage = handleMessage;

		return () => {
			channelRef.current?.close();
			channelRef.current = null;
			setIsConnected(false);
		};
	}, [
		presentationId,
		onSlideChange,
		onTimerStart,
		onTimerReset,
		onExit,
		onLaserToggle,
		onDrawToggle,
	]);

	// Send functions (only used by presenter role typically, but viewer can send navigation too)
	const sendSlideChange = useCallback((slideIndex: number) => {
		channelRef.current?.postMessage({
			type: "slide-change",
			slideIndex,
			timestamp: Date.now(),
		} satisfies PresentationSyncMessage);
	}, []);

	const sendTimerStart = useCallback(() => {
		channelRef.current?.postMessage({
			type: "timer-start",
			timestamp: Date.now(),
		} satisfies PresentationSyncMessage);
	}, []);

	const sendTimerReset = useCallback(() => {
		channelRef.current?.postMessage({
			type: "timer-reset",
			timestamp: Date.now(),
		} satisfies PresentationSyncMessage);
	}, []);

	const sendExit = useCallback(() => {
		channelRef.current?.postMessage({
			type: "exit",
			timestamp: Date.now(),
		} satisfies PresentationSyncMessage);
	}, []);

	const sendLaserToggle = useCallback((enabled: boolean) => {
		channelRef.current?.postMessage({
			type: "laser-toggle",
			enabled,
			timestamp: Date.now(),
		} satisfies PresentationSyncMessage);
	}, []);

	const sendDrawToggle = useCallback((enabled: boolean) => {
		channelRef.current?.postMessage({
			type: "draw-toggle",
			enabled,
			timestamp: Date.now(),
		} satisfies PresentationSyncMessage);
	}, []);

	return {
		isConnected,
		lastMessage,
		sendSlideChange,
		sendTimerStart,
		sendTimerReset,
		sendExit,
		sendLaserToggle,
		sendDrawToggle,
	};
}
