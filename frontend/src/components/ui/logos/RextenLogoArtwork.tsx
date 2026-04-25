import * as React from 'react'

export const REXTEN_LOGO_ICON_PRIMARY = '#114fee'
export const REXTEN_LOGO_ICON_SECONDARY = '#2ddaff'
export const REXTEN_LOGO_TEXT_LIGHT = '#333333'
export const REXTEN_LOGO_TEXT_DARK = '#ffffff'

const TEXT_PATH =
    'M2.59 0L2.59-30.25 20.74-30.25Q25.28-30.25 27.33-28.2 29.38-26.14 29.38-21.61L29.38-21.61 29.38-17.72Q29.38-14.13 28.2-12.14 27.01-10.15 24.41-9.51L24.41-9.51 29.82 0 21.39 0 16.42-9.07 10.37-9.07 10.37 0 2.59 0ZM21.61-17.72L21.61-21.61Q21.61-24.2 19.01-24.2L19.01-24.2 10.37-24.2 10.37-15.12 19.01-15.12Q21.61-15.12 21.61-17.72L21.61-17.72ZM56.69-6.05L56.69 0 32.71 0 32.71-30.25 56.69-30.25 56.69-24.2 40.48-24.2 40.48-18.37 53.23-18.37 53.23-12.32 40.48-12.32 40.48-6.05 56.69-6.05ZM70.81-20.74L76.65-30.25 85.29-30.25 75.57-15.12 85.5 0 76.86 0 70.81-9.51 64.76 0 56.12 0 66.06-15.12 56.34-30.25 64.94-30.25 70.81-20.74ZM101.36-24.2L101.36 0 93.58 0 93.58-24.2 84.5-24.2 84.5-30.25 110.43-30.25 110.43-24.2 101.36-24.2ZM136.44-6.05L136.44 0 112.46 0 112.46-30.25 136.44-30.25 136.44-24.2 120.23-24.2 120.23-18.37 132.98-18.37 132.98-12.32 120.23-12.32 120.23-6.05 136.44-6.05ZM165.25-30.25L165.25 0 157.04 0 146.67-18.15 146.67 0 138.9 0 138.9-30.25 147.11-30.25 157.48-12.1 157.48-30.25 165.25-30.25Z'

type BrandMarkProps = {
    primaryColor?: string
    secondaryColor?: string
}

export function RextenBrandMarkPaths({
    primaryColor = REXTEN_LOGO_ICON_PRIMARY,
    secondaryColor = REXTEN_LOGO_ICON_SECONDARY,
}: BrandMarkProps) {
    return (
        <g fillRule="evenodd">
            <path
                d="M80 3.77C59.39 19.79 5.22 27 0 46.84v31.38c0 8.5 2.88 15.55 10.74 21.78C.7 68.08 77.26 73.05 80 45.87z"
                fill={primaryColor}
            />
            <path
                d="M51.69 17.48L51.59 0C29.1 15.36 2 18.09 0 46.84v31.38a27 27 0 0 0 2.39 11.67c-.34-34.1 49.56-20.5 49.4-52.8z"
                fill={secondaryColor}
                opacity={0.8}
            />
        </g>
    )
}

type RextenFullLogoArtworkProps = React.SVGProps<SVGSVGElement> & {
    title?: string
    textColor?: string
}

export function RextenFullLogoArtwork({
    title = 'REXTEN Logo',
    textColor = REXTEN_LOGO_TEXT_LIGHT,
    width = 158,
    height = 41,
    ...props
}: RextenFullLogoArtworkProps) {
    const titleId = React.useId()

    return (
        <svg
            {...props}
            width={width}
            height={height}
            viewBox="0 0 219.66920684814454 55.205373992919924"
            preserveAspectRatio="xMinYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-labelledby={titleId}
            style={props.style}
        >
            <title id={titleId}>{title}</title>
            <g transform="translate(2.104600067138672 2.104598159790039)">
                <g transform="scale(0.5099617528685346)">
                    <RextenBrandMarkPaths />
                </g>
            </g>
            <g fill={textColor} transform="translate(54.90459930419922 12.477685089111328)">
                <path d={TEXT_PATH} transform="translate(-2.5900001525878906 30.25)" />
            </g>
        </svg>
    )
}

type RextenIconArtworkProps = React.SVGProps<SVGSVGElement> & {
    title?: string
}

export function RextenIconArtwork({
    title = 'REXTEN Icon',
    ...props
}: RextenIconArtworkProps) {
    const titleId = React.useId()

    return (
        <svg
            {...props}
            viewBox="-0.005629400257021189 0 80.00563049316406 100"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-labelledby={titleId}
        >
            <title id={titleId}>{title}</title>
            <RextenBrandMarkPaths />
        </svg>
    )
}
