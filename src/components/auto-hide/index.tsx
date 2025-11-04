import { ComponentProps } from 'react';

type Edge = 'top' | 'bottom' | 'left' | 'right';

export interface AutoHideProps extends ComponentProps<'div'> {
  autoPreviewParallelThreshold?: number | string;
  autoPreviewPerpendicularThreshold?: number | string | 'infinite';
  enabledEdges?: Edge[];
  previewMode?: 'always' | 'auto';
}
