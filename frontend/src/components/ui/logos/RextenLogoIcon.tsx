import * as React from 'react'
import RextenMarkLayers, { REXTEN_MARK_FILL } from '@/components/ui/logos/RextenMarkLayers'

interface RextenLogoIconProps extends React.SVGProps<SVGSVGElement> {
  /** Оставлено для совместимости; марка всегда в фирменном цвете. */
  variant?: 'light' | 'dark'
}

export default function RextenLogoIcon({
  variant: _variant,
  ...props
}: RextenLogoIconProps) {
  return (
    <svg
      {...props}
      viewBox="0 0 30 30"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="rextenLogoIcon"
    >
      <title id="rextenLogoIcon">REXTEN Logo Icon</title>
      <RextenMarkLayers fill={REXTEN_MARK_FILL} />
    </svg>
  )
}
