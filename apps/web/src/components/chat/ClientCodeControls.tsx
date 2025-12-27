"use client";

import { Check, Copy, UnfoldHorizontal, WrapText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ClientCodeControls({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [wrapped, setWrapped] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
        onClick={() => setWrapped(!wrapped)}
        aria-label={wrapped ? "Disable line wrapping" : "Enable line wrapping"}
      >
        {wrapped ? (
          <WrapText className="w-3 h-3" />
        ) : (
          <UnfoldHorizontal className="w-3 h-3" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
        onClick={handleCopy}
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="w-3 h-3 text-primary" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </Button>
    </>
  );
}
