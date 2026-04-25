import * as React from 'react'
import { RextenIconArtwork } from './RextenLogoArtwork'

interface RextenMarketplaceIconDarkProps extends Omit<React.SVGProps<SVGSVGElement>, 'customText' | 'customColor' | 'customSize' | 'customIconColor'> {
  customText?: string;
  customColor?: string;
  customSize?: number;
  customIconColor?: string;
}

export default function RextenMarketplaceIconDark(
  props: RextenMarketplaceIconDarkProps
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
      title="REXTEN Icon Dark"
    />
  )
}

