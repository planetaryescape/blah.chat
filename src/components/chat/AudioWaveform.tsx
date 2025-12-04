"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  stream: MediaStream;
  height?: number;
  className?: string;
}

export function AudioWaveform({
  stream,
  height = 120,
  className,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream) return;

    // Setup Web Audio API
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 512; // Higher resolution for smoother bars
    analyser.smoothingTimeConstant = 0.85; // Smooth animation
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // ElevenLabs-style: fewer bars, centered, rounded
    const barCount = 64;
    const barWidth = 3;
    const barGap = 2;
    const totalBarWidth = barWidth + barGap;
    const totalWidth = barCount * totalBarWidth;
    const offsetX = (rect.width - totalWidth) / 2;

    // Render loop
    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Sample data evenly across frequency range
      const step = Math.floor(dataArray.length / barCount);

      // Draw centered bars
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step;
        const normalized = dataArray[dataIndex] / 255; // 0-1 range

        // Minimum height for visual appeal
        const minHeight = 4;
        const maxHeight = rect.height * 0.8;
        const barHeight = Math.max(minHeight, normalized * maxHeight);

        const x = offsetX + i * totalBarWidth;
        const y = (rect.height - barHeight) / 2; // Center vertically

        // ElevenLabs-style gradient
        const opacity = 0.6 + normalized * 0.4; // 0.6-1.0 range
        ctx.fillStyle = `hsl(var(--primary) / ${opacity})`;

        // Rounded rectangle
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [stream, height]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full", className)}
      style={{ height: `${height}px` }}
    />
  );
}
