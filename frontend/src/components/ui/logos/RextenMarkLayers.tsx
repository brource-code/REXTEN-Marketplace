import * as React from 'react'
import { REXTEN_MARK_COLOR } from '@/constants/rexten-brand.constant'

/** @deprecated используйте REXTEN_MARK_COLOR из rexten-brand.constant */
export const REXTEN_MARK_FILL = REXTEN_MARK_COLOR

const D1 = 'M4 8L15 2L26 8L15 14L4 8Z'
const D2 = 'M4 14L15 8L26 14L15 20L4 14Z'
const D3 = 'M4 20L15 14L26 20L15 26L4 20Z'

type RextenMarkLayersProps = {
  fill?: string
}

/**
 * Три слоя знака Rexten — плоская заливка, как в `app/icon.svg`.
 */
export default function RextenMarkLayers({
  fill = REXTEN_MARK_COLOR,
}: RextenMarkLayersProps) {
  return (
    <g stroke="none" strokeWidth={1} fillRule="evenodd">
      <path d={D1} fill={fill} />
      <g transform="translate(1, 2)">
        <path d={D2} fill={fill} />
      </g>
      <g transform="translate(2, 4)">
        <path d={D3} fill={fill} />
      </g>
    </g>
  )
}
