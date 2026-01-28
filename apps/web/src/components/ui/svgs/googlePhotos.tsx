import type { SVGProps } from "react";

const GooglePhotos = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24">
    <path fill="#f04231" d="M12 5.5c-3.08 0-5.6 2.37-5.85 5.39L12 8.5V5.5z" />
    <path fill="#ffba00" d="M12 5.5v3l5.85 2.39A5.87 5.87 0 0 0 12 5.5z" />
    <path fill="#00ac47" d="M5.5 12c0 3.08 2.37 5.6 5.39 5.85L8.5 12H5.5z" />
    <path fill="#4285f4" d="M12 18.5c3.08 0 5.6-2.37 5.85-5.39L12 15.5v3z" />
    <path
      fill="#f04231"
      d="M12 12v3l-5.85-2.39c.25 3.02 2.77 5.39 5.85 5.39V12z"
    />
    <path fill="#00832d" d="M5.5 12h3l2.39-5.85A5.87 5.87 0 0 0 5.5 12z" />
    <path fill="#2684fc" d="M18.5 12c0-3.08-2.37-5.6-5.39-5.85L15.5 12h3z" />
    <path
      fill="#ffba00"
      d="M18.5 12h-3l-2.39 5.85c3.02-.25 5.39-2.77 5.39-5.85z"
    />
  </svg>
);

export { GooglePhotos };
