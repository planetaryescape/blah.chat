"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ModelDetailsTable } from "@/components/usage/ModelDetailsTable";

const COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#6366f1",
];

const COST_TYPE_COLORS: Record<string, string> = {
  text: "#3b82f6",
  voice: "#10b981",
  images: "#a855f7",
};

const FEATURE_COLORS: Record<string, string> = {
  chat: "#3b82f6",
  notes: "#10b981",
  tasks: "#ec4899",
  files: "#8b5cf6",
  memory: "#6366f1",
  smart_assistant: "#14b8a6",
};

type FeatureDatum = {
  key: string;
  name: string;
  value: number;
  breakdown: { text: number; tts: number; stt: number; image: number };
};

type ModelDatum = { name: string; value: number };
type CostTypeDatum = { name: string; value: number };

interface UsageChartsSectionProps {
  dailySpend?: { date: string; cost: number }[];
  modelPieData: ModelDatum[];
  featureData: FeatureDatum[];
  costTypeData: CostTypeDatum[];
  spendByModel?: any[];
}

export function UsageChartsSection({
  dailySpend,
  modelPieData,
  featureData,
  costTypeData,
  spendByModel,
}: UsageChartsSectionProps) {
  const formatCurrency = (val: unknown) => [
    `$${(val as number).toFixed(4)}`,
    "Cost",
  ];

  return (
    <AccordionItem value="charts" className="border rounded-lg px-4">
      <AccordionTrigger>Charts & Breakdown</AccordionTrigger>
      <AccordionContent className="pt-4 pb-6 space-y-6">
        {dailySpend && dailySpend.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Daily Spend</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySpend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) =>
                      new Date(val).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => `$${val.toFixed(2)}`}
                  />
                  <Tooltip
                    formatter={formatCurrency}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {modelPieData.length > 0 && (
            <CostPie title="Spend by Model" data={modelPieData} />
          )}

          {featureData.length > 0 && (
            <div>
              <CostPie
                title="Cost by Feature"
                data={featureData.map((f) => ({
                  name: f.name,
                  value: f.value,
                }))}
                colors={featureData.map(
                  (f) => FEATURE_COLORS[f.key] || COLORS[0],
                )}
              />
              <FeatureBreakdownList items={featureData} />
            </div>
          )}

          {costTypeData.length > 0 && (
            <CostPie
              title="Cost by Type"
              data={costTypeData}
              colors={costTypeData.map(
                (entry, i) =>
                  COST_TYPE_COLORS[entry.name.toLowerCase()] || COLORS[i],
              )}
            />
          )}
        </div>

        {spendByModel && spendByModel.length > 0 && (
          <ModelDetailsTable data={spendByModel} />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function CostPie({
  title,
  data,
  colors,
}: {
  title: string;
  data: { name: string; value: number }[];
  colors?: string[];
}) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-3">{title}</h4>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) =>
                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
              }
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name ?? `cell-${i}`}
                  fill={colors?.[i] ?? COLORS[i % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(val) => [`$${(val as number).toFixed(4)}`, "Cost"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FeatureBreakdownList({ items }: { items: FeatureDatum[] }) {
  return (
    <div className="mt-4 space-y-2">
      {items.map((feature) => (
        <div key={feature.key} className="text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: FEATURE_COLORS[feature.key] || COLORS[0],
              }}
            />
            <span className="font-medium">{feature.name}</span>
            <span className="ml-auto">${feature.value.toFixed(4)}</span>
          </div>
          <div className="ml-4 flex flex-wrap gap-x-3 gap-y-0.5">
            {feature.breakdown.text > 0 && (
              <span>Text: ${feature.breakdown.text.toFixed(4)}</span>
            )}
            {feature.breakdown.tts > 0 && (
              <span>TTS: ${feature.breakdown.tts.toFixed(4)}</span>
            )}
            {feature.breakdown.stt > 0 && (
              <span>STT: ${feature.breakdown.stt.toFixed(4)}</span>
            )}
            {feature.breakdown.image > 0 && (
              <span>Image: ${feature.breakdown.image.toFixed(4)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
