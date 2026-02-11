import { ensureDir, writeJsonAtomic } from "../utils/fs";
import { resultsPath } from "../utils/paths";

export async function writeVisualizations(options: {
  metrics: any;
}): Promise<void> {
  const dir = resultsPath("visualizations");
  await ensureDir(dir);

  const data = options.metrics;
  await writeJsonAtomic(
    resultsPath("visualizations", "metrics-slim.json"),
    data,
  );

  const html = (title: string, script: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui; margin: 24px; }
      .wrap { max-width: 900px; }
      canvas { width: 100%; height: 420px; }
      .note { color: #555; font-size: 12px; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  </head>
  <body>
    <div class="wrap">
      <h1>${title}</h1>
      <p class="note">data embedded at build time</p>
      <canvas id="c"></canvas>
    </div>
    <script>
      const METRICS = ${JSON.stringify(data)};
      ${script}
    </script>
  </body>
</html>
`;

  const overallScript = `
const ctx = document.getElementById("c");
new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["basic", "cognitive"],
    datasets: [{
      label: "overall score (0-10)",
      data: [
        METRICS.variants.basic.overallScore,
        METRICS.variants.cognitive.overallScore
      ],
      backgroundColor: ["#999", "#2d6cdf"]
    }]
  },
  options: { scales: { y: { min: 0, max: 10 } } }
});
`;

  const byDiffScript = `
const ctx = document.getElementById("c");
const labels = ["easy","medium","hard"];
new Chart(ctx, {
  type: "bar",
  data: {
    labels,
    datasets: [
      { label: "basic", data: labels.map(l => METRICS.variants.basic.byDifficulty[l]), backgroundColor: "#999" },
      { label: "cognitive", data: labels.map(l => METRICS.variants.cognitive.byDifficulty[l]), backgroundColor: "#2d6cdf" }
    ]
  },
  options: { scales: { y: { min: 0, max: 10 } } }
});
`;

  const byTypeScript = `
const ctx = document.getElementById("c");
const labels = ["factual","temporal","preference","inference"];
new Chart(ctx, {
  type: "bar",
  data: {
    labels,
    datasets: [
      { label: "basic", data: labels.map(l => METRICS.variants.basic.byType[l]), backgroundColor: "#999" },
      { label: "cognitive", data: labels.map(l => METRICS.variants.cognitive.byType[l]), backgroundColor: "#2d6cdf" }
    ]
  },
  options: { scales: { y: { min: 0, max: 10 } } }
});
`;

  const decayScript = `
const ctx = document.getElementById("c");
const labels = ["session1","session2","session3","session4"];
new Chart(ctx, {
  type: "line",
  data: {
    labels,
    datasets: [
      { label: "basic", data: labels.map(l => METRICS.variants.basic.bySession[l]), borderColor: "#999", tension: 0.2 },
      { label: "cognitive", data: labels.map(l => METRICS.variants.cognitive.bySession[l]), borderColor: "#2d6cdf", tension: 0.2 }
    ]
  },
  options: { scales: { y: { min: 0, max: 10 } } }
});
`;

  const heatmapHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>retrieval heatmap (placeholder)</title>
    <style>
      body { font-family: ui-sans-serif, system-ui; margin: 24px; }
      .note { color: #555; font-size: 12px; }
      table { border-collapse: collapse; }
      td, th { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>retrieval heatmap (placeholder)</h1>
    <p class="note">spec asks for score vs #memories; current harness always retrieves fixed limit.</p>
    <table>
      <thead><tr><th>variant</th><th>avg memories retrieved</th></tr></thead>
      <tbody>
        <tr><td>basic</td><td>${data.variants.basic.avgMemoriesRetrieved.toFixed(2)}</td></tr>
        <tr><td>cognitive</td><td>${data.variants.cognitive.avgMemoriesRetrieved.toFixed(2)}</td></tr>
      </tbody>
    </table>
  </body>
</html>`;

  await Bun.write(
    resultsPath("visualizations", "overall-scores.html"),
    html("overall scores", overallScript),
  );
  await Bun.write(
    resultsPath("visualizations", "by-difficulty.html"),
    html("score by difficulty", byDiffScript),
  );
  await Bun.write(
    resultsPath("visualizations", "by-type.html"),
    html("score by type", byTypeScript),
  );
  await Bun.write(
    resultsPath("visualizations", "decay-curve.html"),
    html("score by session", decayScript),
  );
  await Bun.write(
    resultsPath("visualizations", "retrieval-heatmap.html"),
    heatmapHtml,
  );
}
