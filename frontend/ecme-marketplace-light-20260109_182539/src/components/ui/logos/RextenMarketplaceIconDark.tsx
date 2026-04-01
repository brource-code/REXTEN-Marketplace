import * as React from "react";

interface RextenMarketplaceIconDarkProps extends Omit<React.SVGProps<SVGSVGElement>, 'customText' | 'customColor' | 'customSize' | 'customIconColor'> {
  customText?: string;
  customColor?: string;
  customSize?: number;
  customIconColor?: string;
}

export default function RextenMarketplaceIconDark(
  props: RextenMarketplaceIconDarkProps
) {
  // Извлекаем кастомные пропсы, чтобы они не попали в DOM
  const { customText, customColor, customSize, customIconColor, ...svgProps } = props;
  
  // Используем кастомный цвет иконки или дефолтный
  const iconColor = customIconColor || '#696cff';
  
  return (
    <svg
      {...svgProps}
      viewBox="0 0 30 30"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-labelledby="rextenMarketplaceIconDark"
    >
      <title id="rextenMarketplaceIconDark">
        Rexten Icon Dark
      </title>
      <defs>
        <linearGradient id="icon-dark-gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: iconColor, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: iconColor, stopOpacity: 0.6 }} />
        </linearGradient>
        <linearGradient id="icon-dark-gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: iconColor, stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: iconColor, stopOpacity: 0.4 }} />
        </linearGradient>
        <linearGradient id="icon-dark-gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: iconColor, stopOpacity: 0.6 }} />
          <stop offset="100%" style={{ stopColor: iconColor, stopOpacity: 0.2 }} />
        </linearGradient>
        <path d="M4 8L15 2L26 8L15 14L4 8Z" id="icon-dark-layer-1" />
        <path d="M4 14L15 8L26 14L15 20L4 14Z" id="icon-dark-layer-2" />
        <path d="M4 20L15 14L26 20L15 26L4 20Z" id="icon-dark-layer-3" />
      </defs>
      <g id="g-app-brand" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g id="Brand-Logo" transform="translate(0, 0)">
          <g id="Icon">
            <g id="Layer-1">
              <use fill="url(#icon-dark-gradient1)" xlinkHref="#icon-dark-layer-1" />
              <use fillOpacity="0.3" fill="#FFFFFF" xlinkHref="#icon-dark-layer-1" />
            </g>
            <g id="Layer-2" transform="translate(1, 2)">
              <use fill="url(#icon-dark-gradient2)" xlinkHref="#icon-dark-layer-2" />
              <use fillOpacity="0.2" fill="#FFFFFF" xlinkHref="#icon-dark-layer-2" />
            </g>
            <g id="Layer-3" transform="translate(2, 4)">
              <use fill="url(#icon-dark-gradient3)" xlinkHref="#icon-dark-layer-3" />
              <use fillOpacity="0.1" fill="#FFFFFF" xlinkHref="#icon-dark-layer-3" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

