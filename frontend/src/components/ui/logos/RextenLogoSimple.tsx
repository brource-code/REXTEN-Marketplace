import * as React from 'react'
import {
  REXTEN_LOGO_TEXT_DARK,
  REXTEN_LOGO_TEXT_LIGHT,
  RextenFullLogoArtwork,
} from './RextenLogoArtwork'

interface RextenLogoSimpleProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'light' | 'dark';
}

export default function RextenLogoSimple({
  variant = 'light',
  ...props
}: RextenLogoSimpleProps) {
  const textColor =
    variant === 'dark' ? REXTEN_LOGO_TEXT_DARK : REXTEN_LOGO_TEXT_LIGHT

  return (
    <RextenFullLogoArtwork
      {...props}
      title="REXTEN Logo"
      textColor={textColor}
    />
  )
}


