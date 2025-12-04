"use client";

import { Streamdown } from "streamdown";
import { CodeBlock } from "./CodeBlock";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose">
      <Streamdown
        children={content}
        components={{
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            const inline = !match && !className;
            return !inline && match ? (
              <CodeBlock code={code} language={match[1]} />
            ) : (
              <CodeBlock code={code} inline />
            );
          },
        }}
      />
    </div>
  );
}
