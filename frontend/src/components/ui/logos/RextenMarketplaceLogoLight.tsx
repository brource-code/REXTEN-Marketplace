import * as React from 'react'
import { REXTEN_LOGO_TEXT_LIGHT, RextenFullLogoArtwork } from './RextenLogoArtwork'

interface RextenMarketplaceLogoLightProps extends React.SVGProps<SVGSVGElement> {
  customText?: string
  customColor?: string
  customSize?: number
  customIconColor?: string
}

export default function RextenMarketplaceLogoLight(
  props: RextenMarketplaceLogoLightProps
) {
  const {
    customText: _customText,
    customColor,
    customSize: _customSize,
    customIconColor: _customIconColor,
    ...svgProps
  } = props

  return (
    <RextenFullLogoArtwork
      {...svgProps}
      title="REXTEN Logo"
      textColor={customColor || REXTEN_LOGO_TEXT_LIGHT}
    />
  )
}

