import * as React from 'react'
import { RextenIconArtwork } from '@/components/ui/logos/RextenLogoArtwork'

interface RextenLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Оставлено для совместимости; марка всегда в фирменном цвете. */
  variant?: 'light' | 'dark'
}

export default function RextenLogoIcon({
  variant: _variant,
  ...props
}: RextenLogoIconProps) {
  return <RextenIconArtwork {...props} title="REXTEN Logo Icon" />
}
