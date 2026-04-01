import * as React from "react";

const FONT_FAMILY = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

interface RextenMarketplaceLogoLightProps extends React.SVGProps<SVGSVGElement> {
  customText?: string
  customColor?: string
  customSize?: number
  customIconColor?: string
}

export default function RextenMarketplaceLogoLight(
  props: RextenMarketplaceLogoLightProps
) {
  const { customText = 'REXTEN', customColor = '#0F172A', customSize = 26, customIconColor = '#2563EB', ...svgProps } = props
  
  // Генерируем уникальный ID для градиентов на основе цвета
  const gradientId = customIconColor.replace(/[^a-zA-Z0-9]/g, '')
  
  return (
    <svg
      {...svgProps}
      viewBox="0 0 180 60"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-labelledby="rextenMarketplaceLogoLight"
      style={{ width: '100%', height: 'auto', ...props.style }}
    >
      <title id="rextenMarketplaceLogoLight">Rexten Logo</title>
      <defs>
        <linearGradient id={`logo-gradient1-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: customIconColor, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: customIconColor, stopOpacity: 0.6 }} />
        </linearGradient>
        <linearGradient id={`logo-gradient2-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: customIconColor, stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: customIconColor, stopOpacity: 0.4 }} />
        </linearGradient>
        <linearGradient id={`logo-gradient3-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: customIconColor, stopOpacity: 0.6 }} />
          <stop offset="100%" style={{ stopColor: customIconColor, stopOpacity: 0.2 }} />
        </linearGradient>
        <path d="M4 8L15 2L26 8L15 14L4 8Z" id="logo-layer-1" />
        <path d="M4 14L15 8L26 14L15 20L4 14Z" id="logo-layer-2" />
        <path d="M4 20L15 14L26 20L15 26L4 20Z" id="logo-layer-3" />
      </defs>
      <g id="logo-icon" transform="translate(12, 12) scale(0.9)">
        <g id="Layer-1">
          <use fill={`url(#logo-gradient1-${gradientId})`} xlinkHref="#logo-layer-1" />
          <use fillOpacity="0.3" fill="#FFFFFF" xlinkHref="#logo-layer-1" />
        </g>
        <g id="Layer-2" transform="translate(1, 2)">
          <use fill={`url(#logo-gradient2-${gradientId})`} xlinkHref="#logo-layer-2" />
          <use fillOpacity="0.2" fill="#FFFFFF" xlinkHref="#logo-layer-2" />
        </g>
        <g id="Layer-3" transform="translate(2, 4)">
          <use fill={`url(#logo-gradient3-${gradientId})`} xlinkHref="#logo-layer-3" />
          <use fillOpacity="0.1" fill="#FFFFFF" xlinkHref="#logo-layer-3" />
        </g>
      </g>
      {customText && (
        <text
          x={58}
          y={36}
          fill={customColor}
          fontFamily={FONT_FAMILY}
          fontSize={customSize}
          fontWeight={800}
          letterSpacing={0.2}
        >
          {customText}
        </text>
      )}
    </svg>
  );
}

