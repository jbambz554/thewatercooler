import type { SVGProps } from "react";

const WaterCoolerLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 48 66"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <defs>
      <filter id="wc-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" />
        <feOffset dx="0.6" dy="1.8" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.35" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <g filter="url(#wc-shadow)">
      <path
        d="M16 4 Q16 2 18 2 L30 2 Q32 2 32 4 L32 6 L34 10 Q35 12 35 14 L35 22 Q35 24 33 24 L15 24 Q13 24 13 22 L13 14 Q13 12 14 10 L16 6 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M15 18 Q19 16 24 18 Q29 20 33 18 L33 22 Q33 24 31 24 L17 24 Q15 24 15 22 Z"
        fill="hsl(var(--water))"
        opacity="0.55"
      />
      <path
        d="M15 18 Q19 16 24 18 Q29 20 33 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <rect x="10" y="24" width="28" height="32" rx="2" fill="white" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="28" x2="38" y2="28" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="10" y1="52" x2="38" y2="52" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <circle cx="24" cy="30" r="1.5" fill="currentColor" />
      <rect x="21" y="34" width="6" height="4" rx="0.5" fill="currentColor" />
      <rect x="22" y="38" width="4" height="4" rx="0.3" fill="white" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="24" cy="40" r="1" fill="currentColor" />
      <rect x="17" y="45" width="14" height="2" rx="0.3" fill="white" stroke="currentColor" strokeWidth="0.6" />
      <line x1="19" y1="46" x2="29" y2="46" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
      <rect x="8" y="56" width="32" height="3" rx="0.5" fill="currentColor" />
      <rect x="11" y="59" width="26" height="2" fill="currentColor" opacity="0.6" />
      <path
        d="M24 42 Q24 44.5 22.8 45.8 Q24 47 25.2 45.8 Q24 44.5 24 42 Z"
        fill="hsl(var(--drop))"
        stroke="currentColor"
        strokeWidth="0.4"
      />
    </g>
  </svg>
);

export default WaterCoolerLogo;
