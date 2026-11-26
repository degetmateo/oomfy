import React from 'react';
import { MessageCircle } from 'lucide-react';

interface Props {
  className?: string;
  size?: number;
}

export const PixelComment: React.FC<Props> = ({ className = '', size = 18 }) => {
  return (
    <MessageCircle
      width={size}
      height={size}
      size={size}
      strokeWidth={2}
      aria-hidden="true"
      data-icon="comment"
      className={`inline-block flex-shrink-0 ${className}`}
    />
  );
};
