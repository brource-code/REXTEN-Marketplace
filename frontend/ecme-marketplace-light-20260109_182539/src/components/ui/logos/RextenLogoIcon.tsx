import * as React from "react";

interface RextenLogoIconProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'light' | 'dark';
}

export default function RextenLogoIcon({
  variant = 'light',
  ...props
}: RextenLogoIconProps) {
  const color = variant === 'dark' ? '#696cff' : '#2563EB';

  return (
    <svg
      {...props}
      viewBox="0 0 30 30"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-labelledby="rextenLogoIcon"
    >
      <title id="rextenLogoIcon">Rexten Logo Icon</title>
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.6 }} />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.4 }} />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.6 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.2 }} />
        </linearGradient>
        <path d="M4 8L15 2L26 8L15 14L4 8Z" id="layer-1" />
        <path d="M4 14L15 8L26 14L15 20L4 14Z" id="layer-2" />
        <path d="M4 20L15 14L26 20L15 26L4 20Z" id="layer-3" />
      </defs>
      <g id="g-app-brand" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g id="Brand-Logo" transform="translate(0, 0)">
          <g id="Icon">
            <g id="Layer-1">
              <use fill="url(#gradient1)" xlinkHref="#layer-1" />
              <use fillOpacity="0.3" fill="#FFFFFF" xlinkHref="#layer-1" />
            </g>
            <g id="Layer-2" transform="translate(1, 2)">
              <use fill="url(#gradient2)" xlinkHref="#layer-2" />
              <use fillOpacity="0.2" fill="#FFFFFF" xlinkHref="#layer-2" />
            </g>
            <g id="Layer-3" transform="translate(2, 4)">
              <use fill="url(#gradient3)" xlinkHref="#layer-3" />
              <use fillOpacity="0.1" fill="#FFFFFF" xlinkHref="#layer-3" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

