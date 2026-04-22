import * as React from "react";
import { REXTEN_MARK_COLOR } from '@/constants/rexten-brand.constant'

const FONT_FAMILY =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

interface RextenLogoSimpleProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'light' | 'dark';
}

export default function RextenLogoSimple({
  variant = 'light',
  ...props
}: RextenLogoSimpleProps) {
  const textColor = variant === 'dark' ? '#FFFFFF' : '#0F172A';
  const bgColor = variant === 'dark' ? '#020617' : 'transparent';

  return (
    <svg
      {...props}
      width={180}
      height={60}
      viewBox="0 0 180 60"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="rextenLogoSimple"
    >
      <title id="rextenLogoSimple">REXTEN Logo</title>
      <g>
        <circle cx={26} cy={30} r={24} fill={REXTEN_MARK_COLOR} />
        <rect x={10} y={16} width={32} height={28} rx={8} fill="#FFFFFF" />
        <path
          d="M15 19c0-5.2 4.1-9.5 11-9.5s11 4.3 11 9.5"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M15.5 33.5l6.8 7.5L34 28"
          stroke={REXTEN_MARK_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <text
        x={64}
        y={38}
        fill={textColor}
        fontFamily={FONT_FAMILY}
        fontSize={32}
        fontWeight={700}
        letterSpacing={1}
      >
        REXTEN
      </text>
    </svg>
  );
}


