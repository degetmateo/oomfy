import React from 'react';

interface Props {
  active?: boolean;
  className?: string;
  size?: number;
}

export const PixelQuote: React.FC<Props> = ({ active = false, className = '', size = 18 }) => {
  const color = active ? '#00dc65' : '#B5B5B5';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 338 335"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block pixel-button ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      {active && (
        <rect x="28" y="28" width="281" height="279" fill="#00dc65" fillOpacity="0.2" />
      )}
      {/* Outer border */}
      <rect x="0" y="28" width="28" height="279" fill={color} />
      <rect x="309" y="28" width="28" height="279" fill={color} />
      <rect x="28" y="0" width="281" height="28" fill={color} />
      <rect x="28" y="307" width="281" height="28" fill={color} />

      {/* Quote marks */}
      <rect x="73.37" y="95.69" width="77.78" height="77.78" fill={color} />
      <rect x="117.81" y="173.47" width="33.33" height="33.33" fill={color} />
      <rect x="84.48" y="206.81" width="33.33" height="33.33" fill={color} />

      <rect x="186.04" y="95.9" width="77.78" height="77.78" fill={color} />
      <rect x="230.48" y="173.68" width="33.33" height="33.33" fill={color} />
      <rect x="197.15" y="207.01" width="33.33" height="33.33" fill={color} />
    </svg>
  );
};

