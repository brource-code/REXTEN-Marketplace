import * as React from "react";

export default function RextenMarketplaceIconLight(
  props: React.SVGProps<SVGSVGElement> & {
    customText?: string;
    customColor?: string;
    customSize?: string | number;
    customIconColor?: string;
  }
) {
  // Извлекаем кастомные пропсы, чтобы не передавать их в DOM элемент
  const { customText, customColor, customSize, customIconColor, ...svgProps } = props;
  
  return (
    <svg
      {...svgProps}
      viewBox="0 0 30 30"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-labelledby="rextenMarketplaceIconLight"
    >
      <title id="rextenMarketplaceIconLight">
        REXTEN Icon Light
      </title>
      <defs>
        <linearGradient id="icon-light-gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#2563EB', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#2563EB', stopOpacity: 0.6 }} />
        </linearGradient>
        <linearGradient id="icon-light-gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#2563EB', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: '#2563EB', stopOpacity: 0.4 }} />
        </linearGradient>
        <linearGradient id="icon-light-gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#2563EB', stopOpacity: 0.6 }} />
          <stop offset="100%" style={{ stopColor: '#2563EB', stopOpacity: 0.2 }} />
        </linearGradient>
        <path d="M4 8L15 2L26 8L15 14L4 8Z" id="icon-light-layer-1" />
        <path d="M4 14L15 8L26 14L15 20L4 14Z" id="icon-light-layer-2" />
        <path d="M4 20L15 14L26 20L15 26L4 20Z" id="icon-light-layer-3" />
      </defs>
      <g id="g-app-brand" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g id="Brand-Logo" transform="translate(0, 0)">
          <g id="Icon">
            <g id="Layer-1">
              <use fill="url(#icon-light-gradient1)" xlinkHref="#icon-light-layer-1" />
              <use fillOpacity="0.3" fill="#FFFFFF" xlinkHref="#icon-light-layer-1" />
            </g>
            <g id="Layer-2" transform="translate(1, 2)">
              <use fill="url(#icon-light-gradient2)" xlinkHref="#icon-light-layer-2" />
              <use fillOpacity="0.2" fill="#FFFFFF" xlinkHref="#icon-light-layer-2" />
            </g>
            <g id="Layer-3" transform="translate(2, 4)">
              <use fill="url(#icon-light-gradient3)" xlinkHref="#icon-light-layer-3" />
              <use fillOpacity="0.1" fill="#FFFFFF" xlinkHref="#icon-light-layer-3" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

