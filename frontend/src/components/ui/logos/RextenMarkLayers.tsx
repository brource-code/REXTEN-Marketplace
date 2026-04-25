import * as React from 'react'
import {
  REXTEN_LOGO_ICON_PRIMARY,
  RextenBrandMarkPaths,
} from '@/components/ui/logos/RextenLogoArtwork'

/** @deprecated используйте REXTEN_LOGO_ICON_PRIMARY из RextenLogoArtwork */
export const REXTEN_MARK_FILL = REXTEN_LOGO_ICON_PRIMARY

type RextenMarkLayersProps = {
  fill?: string
}

/**
 * Совместимый wrapper для старых импортов знака REXTEN.
 */
export default function RextenMarkLayers({
  fill = REXTEN_LOGO_ICON_PRIMARY,
}: RextenMarkLayersProps) {
  return <RextenBrandMarkPaths primaryColor={fill} />
}
