"use client";

import { Download } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  data: Record<string, any>[];
  filename: string;
  className?: string;
}

export function ExportButton({ data, filename, className }: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      return;
    }

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
