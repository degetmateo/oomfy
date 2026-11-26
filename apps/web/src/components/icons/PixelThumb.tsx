import React from 'react';
import { ThumbsUp } from 'lucide-react';

interface Props {
  active?: boolean;
  className?: string;
  size?: number;
}

export const PixelThumb: React.FC<Props> = ({ active = false, className = '', size = 18 }) => {
  return (
    <ThumbsUp
      width={size}
      height={size}
      size={size}
      strokeWidth={2}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.22 : 0}
      aria-hidden="true"
      data-icon="thumb"
      className={`inline-block flex-shrink-0 ${active ? 'text-brand-400' : ''} ${className}`}
    />
  );
};
