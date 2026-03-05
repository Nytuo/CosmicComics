'use client';

import { AspectRatio as AspectRatioPrimitive } from 'radix-ui';
import React from 'react';

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
