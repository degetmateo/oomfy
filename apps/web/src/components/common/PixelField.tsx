import React, { useState } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  maxLength?: number;
  isTextarea?: boolean;
  placeholder?: string;
}

export const PixelField: React.FC<Props> = ({
  label,
  value,
  onChange,
  maxLength = 50,
  isTextarea = false,
  placeholder = '',
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`relative p-2.5 bg-dark-input border-2 transition-colors font-mono ${
        focused ? 'border-brand-500' : 'border-dark-border'
      }`}
    >
      <div className="flex justify-between items-center text-xs text-dark-muted mb-1 select-none">
        <span>{label}</span>
        {maxLength && (
          <span className={value.length >= maxLength ? 'text-red-400' : ''}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {isTextarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          rows={3}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent text-sm text-dark-text outline-none resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent text-sm text-dark-text outline-none"
        />
      )}
    </div>
  );
};

