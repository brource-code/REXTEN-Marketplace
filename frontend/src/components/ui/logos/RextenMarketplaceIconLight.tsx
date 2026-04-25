import * as React from 'react'
import { RextenIconArtwork } from './RextenLogoArtwork'

export default function RextenMarketplaceIconLight(
  props: React.SVGProps<SVGSVGElement> & {
    customText?: string;
    customColor?: string;
    customSize?: string | number;
    customIconColor?: string;
  }
) {
  const {
    customText: _customText,
    customColor: _customColor,
    customSize: _customSize,
    customIconColor: _customIconColor,
    ...svgProps
  } = props

  return (
    <RextenIconArtwork
      {...svgProps}
      title="REXTEN Icon Light"
    />
  )
}

