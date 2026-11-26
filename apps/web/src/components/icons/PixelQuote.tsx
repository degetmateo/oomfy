import React from 'react';
import { Quote } from 'lucide-react';

interface Props {
  active?: boolean;
  className?: string;
  size?: number;
}

export const PixelQuote: React.FC<Props> = ({ active = false, className = '', size = 18 }) => {
  return (
    <Quote
      width={size}
      height={size}
      size={size}
      strokeWidth={2}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.2 : 0}
      aria-hidden="true"
      data-icon="quote"
      className={`inline-block flex-shrink-0 ${active ? 'text-brand-400' : ''} ${className}`}
    />
  );
};
