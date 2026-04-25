import * as React from 'react'
import { REXTEN_LOGO_TEXT_DARK, RextenFullLogoArtwork } from './RextenLogoArtwork'

interface RextenMarketplaceLogoDarkProps extends React.SVGProps<SVGSVGElement> {
  customText?: string
  customColor?: string
  customSize?: number
  customIconColor?: string
}

export default function RextenMarketplaceLogoDark(
  props: RextenMarketplaceLogoDarkProps
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
      title="REXTEN Logo Dark"
      textColor={customColor || REXTEN_LOGO_TEXT_DARK}
    />
  )
}

