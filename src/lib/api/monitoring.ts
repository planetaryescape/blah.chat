/**
 * API performance monitoring utilities
 * Phase 7: Performance - Track latency, cache hits, errors
 */

import logger from "@/lib/logger";

// Extend Window interface for PostHog
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
	endpoint: string;
	method: string;
	duration: number;
	status: number;
	cacheHit?: boolean;
	userId?: string;
	error?: string;
}

/**
 * Track API performance metrics
 * Logs to Pino + optionally to PostHog/analytics
 */
export function trackAPIPerformance(metrics: PerformanceMetrics): void {
	const { endpoint, method, duration, status, cacheHit, userId, error } =
		metrics;

	// Log structured metrics
	logger.info({
		type: "api_performance",
		endpoint,
		method,
		duration,
		status,
		cacheHit: cacheHit || false,
		userId,
		...(error && { error }),
	});

	// Track in PostHog if available (client-side only, skip on server)
	if (typeof window !== "undefined" && window.posthog) {
		window.posthog.capture("api_request", {
			endpoint,
			method,
			duration,
			status,
			cache_hit: cacheHit || false,
			...(error && { error }),
		});
	}
}

/**
 * Performance monitoring middleware wrapper
 * Usage: wrap API handler to auto-track timing
 */
export function withPerformanceTracking<T>(
	handler: (req: Request) => Promise<Response>,
	endpoint: string,
): (req: Request) => Promise<Response> {
	return async (req: Request): Promise<Response> => {
		const startTime = performance.now();
		const method = req.method;
		let response: Response;

		try {
			response = await handler(req);
			const duration = performance.now() - startTime;

			// Track successful request
			trackAPIPerformance({
				endpoint,
				method,
				duration,
				status: response.status,
				cacheHit: response.headers.get("x-cache-hit") === "true",
			});

			return response;
		} catch (error) {
			const duration = performance.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			// Track failed request
			trackAPIPerformance({
				endpoint,
				method,
				duration,
				status: 500,
				error: errorMessage,
			});

			throw error;
		}
	};
}

/**
 * Calculate percentile from array of numbers
 * Used for p50, p95, p99 latency calculations
 */
export function percentile(arr: number[], p: number): number {
	if (arr.length === 0) return 0;
	const sorted = [...arr].sort((a, b) => a - b);
	const index = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

/**
 * Performance summary for dashboards
 */
export interface PerformanceSummary {
	totalRequests: number;
	averageDuration: number;
	p50Duration: number;
	p95Duration: number;
	p99Duration: number;
	cacheHitRate: number;
	errorRate: number;
}

/**
 * Calculate performance summary from metrics array
 */
export function summarizePerformance(
	metrics: PerformanceMetrics[],
): PerformanceSummary {
	if (metrics.length === 0) {
		return {
			totalRequests: 0,
			averageDuration: 0,
			p50Duration: 0,
			p95Duration: 0,
			p99Duration: 0,
			cacheHitRate: 0,
			errorRate: 0,
		};
	}

	const durations = metrics.map((m) => m.duration);
	const cacheHits = metrics.filter((m) => m.cacheHit).length;
	const errors = metrics.filter((m) => m.status >= 400).length;

	return {
		totalRequests: metrics.length,
		averageDuration:
			durations.reduce((sum, d) => sum + d, 0) / durations.length,
		p50Duration: percentile(durations, 50),
		p95Duration: percentile(durations, 95),
		p99Duration: percentile(durations, 99),
		cacheHitRate: (cacheHits / metrics.length) * 100,
		errorRate: (errors / metrics.length) * 100,
	};
}
