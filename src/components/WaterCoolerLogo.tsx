import type { SVGProps } from "react";

const WaterCoolerLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 48 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M16 4 Q16 2 18 2 L30 2 Q32 2 32 4 L32 6 L34 10 Q35 12 35 14 L35 22 Q35 24 33 24 L15 24 Q13 24 13 22 L13 14 Q13 12 14 10 L16 6 Z"
      fill="currentColor"
      fillOpacity="0.12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M15 18 Q19 16 24 18 Q29 20 33 18 L33 22 Q33 24 31 24 L17 24 Q15 24 15 22 Z"
      fill="hsl(var(--water))"
      opacity="0.45"
    />
    <rect x="10" y="24" width="28" height="32" rx="2" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1.5" />
    <rect x="22" y="32" width="4" height="5" rx="0.5" fill="currentColor" />
    <circle cx="24" cy="40" r="1.5" fill="currentColor" />
    <line x1="18" y1="48" x2="30" y2="48" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    <rect x="8" y="56" width="32" height="4" rx="1" fill="currentColor" opacity="0.2" />
    <path d="M24 40 Q24 43 22.5 44.5 Q24 46 25.5 44.5 Q24 43 24 40 Z" fill="hsl(var(--water))" />
  </svg>
);

export default WaterCoolerLogo;
