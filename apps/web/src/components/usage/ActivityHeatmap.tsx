"use client";

export function ActivityHeatmap({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  // Find max count for color scaling
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Get intensity level (0-4)
  const getIntensity = (count: number) => {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  };

  const intensityColors = [
    "bg-muted", // 0 - no activity
    "bg-emerald-200 dark:bg-emerald-900", // 1
    "bg-emerald-400 dark:bg-emerald-700", // 2
    "bg-emerald-500 dark:bg-emerald-500", // 3
    "bg-emerald-600 dark:bg-emerald-400", // 4
  ];

  // Group by week (7 days per column)
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[2px] min-w-max">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] mr-1 pt-4">
          {dayLabels.map((day, i) => (
            <div
              key={i}
              className="h-[10px] w-[10px] text-[8px] text-muted-foreground flex items-center justify-center"
            >
              {i % 2 === 1 ? day : ""}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-[2px]">
            {/* Month label on first week of month */}
            <div className="h-3 text-[8px] text-muted-foreground">
              {weekIndex === 0 ||
              (week[0] &&
                new Date(week[0].date).getDate() <= 7 &&
                weekIndex > 0)
                ? new Date(week[0]?.date || "").toLocaleDateString("en-US", {
                    month: "short",
                  })
                : ""}
            </div>
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`h-[10px] w-[10px] rounded-[2px] ${intensityColors[getIntensity(day.count)]}`}
                title={`${day.date}: ${day.count} messages`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {intensityColors.map((color, i) => (
          <div key={i} className={`h-[10px] w-[10px] rounded-[2px] ${color}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
