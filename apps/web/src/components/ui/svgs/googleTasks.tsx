import type { SVGProps } from "react";

const GoogleTasks = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 192 192">
    <path fill="none" d="M0 0h192v192H0z" />
    <circle cx="96" cy="96" r="80" fill="#1a73e8" />
    <path
      fill="#fff"
      d="M82.4 129.6l-28-28 9.9-9.9 18.1 18.1 45.3-45.3 9.9 9.9z"
    />
  </svg>
);

export { GoogleTasks };
