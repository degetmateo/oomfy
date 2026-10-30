import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

export const PixelComment: React.FC<Props> = ({ className = '', size = 18 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 444.3 429"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block pixel-button ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      <polygon
        points="389.6 25.8 389.6 0 55.4 0 55.4 25.8 388.4 25.8 388.4 54.7 417.3 54.7 417.3 25.8 389.6 25.8"
        fill="#FFFBDF"
      />
      <rect x="417.3" y="54.7" width="27" height="193.3" fill="#FFFBDF" />
      <rect x="389.6" y="248" width="27.7" height="27.7" fill="#FFFBDF" />
      <rect x="222.9" y="275.7" width="165.6" height="27.4" fill="#FFFBDF" />
      <rect x="195" y="303.1" width="27.9" height="27.9" fill="#FFFBDF" />
      <rect x="167.4" y="331" width="27.6" height="27.6" fill="#FFFBDF" />
      <rect x="137.6" y="358.6" width="29.8" height="29.8" fill="#FFFBDF" />
      <polygon
        points="110.5 401.9 83.4 401.9 83.4 332.9 57 332.9 57 415.5 83.4 415.5 83.4 429 110.5 429 110.5 415.5 137.6 415.5 137.6 388.3 110.5 388.3 110.5 401.9"
        fill="#FFFBDF"
      />
      <polygon
        points="83.4 303.7 83.4 332.3 109.2 332.3 109.2 275.7 83.4 275.7 55.5 275.7 55.5 248.7 27.3 248.7 27.3 276.9 55.4 276.9 55.4 303.7 83.4 303.7"
        fill="#FFFBDF"
      />
      <rect y="54.7" width="27.3" height="194.1" fill="#FFFBDF" />
      <rect x="27.3" y="25.8" width="28.1" height="28.1" fill="#FFFBDF" />
    </svg>
  );
};

