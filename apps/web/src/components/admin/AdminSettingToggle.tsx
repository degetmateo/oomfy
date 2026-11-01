import React from 'react';

interface Props {
  title: string;
  desc: string;
  isEnabled: boolean;
  onToggle: () => void;
}

export const AdminSettingToggle: React.FC<Props> = ({ title, desc, isEnabled, onToggle }) => (
  <div className="py-4 flex items-center justify-between gap-4">
    <div className="flex-1">
      <p className="text-xs font-bold text-white">{title}</p>
      <p className="text-[11px] text-dark-muted mt-0.5">{desc}</p>
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 text-xs font-bold pixel-button border transition-colors ${
        isEnabled
          ? 'bg-red-500 text-black border-red-400 hover:bg-red-600'
          : 'bg-dark-card text-brand-400 border-dark-border hover:border-brand-500'
      }`}
    >
      {isEnabled ? 'DESACTIVAR' : 'HABILITADO'}
    </button>
  </div>
);

