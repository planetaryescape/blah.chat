import type { ToolRendererProps } from "./types";

/**
 * Renderer for the weather tool.
 * Displays current weather and forecast.
 */
export function WeatherRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const current = parsedResult?.current;
  const units = parsedResult?.units === "fahrenheit" ? "°F" : "°C";

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">{parsedArgs?.location}</span>
      </div>
      {current && state !== "executing" && (
        <div className="space-y-1">
          <div className="font-semibold">
            {current.temperature}
            {units} • {current.condition}
          </div>
          {current.feelsLike && (
            <div className="text-muted-foreground">
              Feels like {current.feelsLike}
              {units}
            </div>
          )}
          {parsedResult.forecast && (
            <div className="text-muted-foreground text-[11px]">
              {parsedResult.forecast}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
