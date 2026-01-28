import type { SVGProps } from "react";

const GoogleDocs = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 47.032 64">
    <defs>
      <linearGradient
        id="google-docs-gradient"
        x1="50%"
        x2="50%"
        y1="0%"
        y2="100%"
      >
        <stop offset="0%" stopColor="#1a73e8" />
        <stop offset="100%" stopColor="#1557b0" />
      </linearGradient>
    </defs>
    <path
      fill="url(#google-docs-gradient)"
      d="M29.375 0H4.704A4.722 4.722 0 0 0 0 4.703v54.594A4.722 4.722 0 0 0 4.704 64h37.624a4.722 4.722 0 0 0 4.704-4.703V12.75L29.375 0z"
    />
    <path
      fill="#a6c5f7"
      d="M29.375 0v8.297c0 2.476 2.007 4.453 4.484 4.453h8.469L29.375 0z"
    />
    <path
      fill="#fff"
      d="M9.844 44.984h27.344v2.953H9.844zm0-8.406h27.344v2.953H9.844zm0-8.406h27.344v2.953H9.844z"
    />
  </svg>
);

export { GoogleDocs };
