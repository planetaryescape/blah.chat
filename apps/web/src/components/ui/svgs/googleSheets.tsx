import type { SVGProps } from "react";

const GoogleSheets = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 47.032 64">
    <defs>
      <linearGradient
        id="google-sheets-gradient"
        x1="50%"
        x2="50%"
        y1="0%"
        y2="100%"
      >
        <stop offset="0%" stopColor="#0f9d58" />
        <stop offset="100%" stopColor="#0b8043" />
      </linearGradient>
    </defs>
    <path
      fill="url(#google-sheets-gradient)"
      d="M29.375 0H4.704A4.722 4.722 0 0 0 0 4.703v54.594A4.722 4.722 0 0 0 4.704 64h37.624a4.722 4.722 0 0 0 4.704-4.703V12.75L29.375 0z"
    />
    <path
      fill="#87ceac"
      d="M29.375 0v8.297c0 2.476 2.007 4.453 4.484 4.453h8.469L29.375 0z"
    />
    <path
      fill="#fff"
      d="M36.016 27.172H11.016v20.656h25v-20.656zm-14.688 18.14h-7.796v-4.687h7.796v4.687zm0-7.203h-7.796v-4.687h7.796v4.687zm12.172 7.203h-9.656v-4.687h9.656v4.687zm0-7.203h-9.656v-4.687h9.656v4.687z"
    />
  </svg>
);

export { GoogleSheets };
