import React from 'react';

interface Props {
  active?: boolean;
  className?: string;
  size?: number;
}

export const PixelShare: React.FC<Props> = ({ active = false, className = '', size = 18 }) => {
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
      <path d="M28.5 28H0.5V307H28.5V28Z" fill={color} />
      <path d="M337.7 28H309.7V307H337.7V28Z" fill={color} />
      <path d="M309.7 0H28.5V28H309.7V0Z" fill={color} />
      <path d="M309.7 307H28.5V335H309.7V307Z" fill={color} />
      <path d="M193.7 85.5H101.1V105.5H193.7V85.5Z" fill={color} />
      <path d="M81 105.5V177H101V105.5H81Z" fill={color} />
      <path d="M81 177.5H61V197.5H81V177.5Z" fill={color} />
      <path d="M101 197.5H81V217.5H101V197.5Z" fill={color} />
      <path d="M121 177.5H101V197.5H121V177.5Z" fill={color} />
      <path d="M141 157.5H121V177.5H141V157.5Z" fill={color} />
      <path d="M61 157.5H41V177.5H61V157.5Z" fill={color} />
      <path d="M144.5 249.5L237.1 249.5L237.1 229.5L144.5 229.5L144.5 249.5Z" fill={color} />
      <path d="M257.2 229.5L257.2 158L237.2 158L237.2 229.5L257.2 229.5Z" fill={color} />
      <path d="M257.2 157.5L277.2 157.5L277.2 137.5L257.2 137.5L257.2 157.5Z" fill={color} />
      <path d="M237.2 137.5L257.2 137.5L257.2 117.5L237.2 117.5L237.2 137.5Z" fill={color} />
      <path d="M217.2 157.5L237.2 157.5L237.2 137.5L217.2 137.5L217.2 157.5Z" fill={color} />
      <path d="M197.2 177.5L217.2 177.5L217.2 157.5L197.2 157.5L197.2 177.5Z" fill={color} />
      <path d="M277.2 177.5L297.2 177.5L297.2 157.5L277.2 157.5L277.2 177.5Z" fill={color} />
    </svg>
  );
};

