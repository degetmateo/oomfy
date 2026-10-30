import React from 'react';

interface Props {
  active?: boolean;
  className?: string;
  size?: number;
}

export const PixelThumb: React.FC<Props> = ({ active = false, className = '', size = 18 }) => {
  const fillColor = active ? '#00dc65' : 'none';
  const strokeColor = active ? '#00dc65' : '#FFFBDF';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 57 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block pixel-button ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      {active && (
        <path
          d="M31 6V18H27V25H23V29H19V49H47V46H43V42H51V38H43V33H51V30L44 29L43 25H51V21H37V6H31ZM5 30V47H13V30H5Z"
          fill={fillColor}
        />
      )}
      <path
        d="M26.7 0H38.7V3H42.7V19H52.7V22H56.7V45H52.7V52H49.7V55H19.7V52H0.7V26H19.7V22H23.7V15H26.7V0ZM31.7 4V16H27.7V23H24.7V27H20.7V30H17.7V47H20.7V51H48.7V48H44.7V44H52.7V40H44.7V35H52.7V32L45.7 31L44.7 27H52.7V23H37.7V4H31.7ZM5.7 30V47H12.7V30H5.7Z"
        fill={strokeColor}
      />
    </svg>
  );
};

