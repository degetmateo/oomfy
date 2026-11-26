import React from 'react';
import { Repeat2 } from 'lucide-react';

interface Props {
  active?: boolean;
  className?: string;
  size?: number;
}

export const PixelShare: React.FC<Props> = ({ active = false, className = '', size = 18 }) => {
  return (
    <Repeat2
      width={size}
      height={size}
      size={size}
      strokeWidth={active ? 2.4 : 2}
      aria-hidden="true"
      data-icon="share"
      className={`inline-block flex-shrink-0 ${active ? 'text-brand-400' : ''} ${className}`}
    />
  );
};
