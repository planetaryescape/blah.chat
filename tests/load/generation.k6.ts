/**
 * k6 Load Test: Generation Endpoint
 *
 * Tests the /api/v1/generations endpoint under sustained load.
 * Thresholds aligned with docs/operations/alert-thresholds.md.
 *
 * Usage:
 *   k6 run tests/load/generation.k6.ts \
 *     -e BASE_URL=https://blah.chat \
 *     -e API_KEY=your_api_key \
 *     -e CONVERSATION_ID=test_conv_id
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

const ttftTrend = new Trend("ttft_ms");
const errorRate = new Rate("generation_errors");

export const options = {
  scenarios: {
    sustained_load: {
      executor: "constant-vus",
      vus: 50,
      duration: "2m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    generation_errors: ["rate<0.05"],
    ttft_ms: ["p(95)<3000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const API_KEY = __ENV.API_KEY || "";
const CONVERSATION_ID = __ENV.CONVERSATION_ID || "";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };

  const payload = JSON.stringify({
    conversationId: CONVERSATION_ID,
    content: `Load test message ${Date.now()}`,
    modelId: "openai:gpt-5-mini",
  });

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/generations`, payload, {
    headers,
    timeout: "30s",
  });

  const isSuccess = res.status === 200 || res.status === 202;

  check(res, {
    "generation accepted": () => isSuccess,
    "status is 200 or 202": () => isSuccess,
  });

  if (!isSuccess) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
    ttftTrend.add(Date.now() - startTime);
  }

  sleep(1);
}

export function handleSummary(data: Record<string, unknown>) {
  return {
    stdout: JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        metrics: {
          http_req_duration_p95: (
            data.metrics as Record<string, { values: Record<string, number> }>
          )?.http_req_duration?.values?.["p(95)"],
          generation_error_rate: (
            data.metrics as Record<string, { values: Record<string, number> }>
          )?.generation_errors?.values?.rate,
          ttft_p95: (
            data.metrics as Record<string, { values: Record<string, number> }>
          )?.ttft_ms?.values?.["p(95)"],
        },
      },
      null,
      2,
    ),
  };
}
