import React from 'react';
import { Maximize2, RotateCcw } from 'lucide-react';

interface Props {
  aspectRatio: number | 'free';
  onAspectChange: (val: number | 'free') => void;
  onSelectAll: () => void;
  onReset: () => void;
  allowAspectChange?: boolean;
}

export const ImageCropperControls: React.FC<Props> = ({
  aspectRatio,
  onAspectChange,
  onSelectAll,
  onReset,
  allowAspectChange = true,
}) => {
  return (
    <div className="flex flex-col gap-2 p-3 bg-[#141414] border-t border-dark-border text-xs select-none">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {allowAspectChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-dark-muted uppercase font-bold mr-1">Aspecto:</span>
            {[
              { label: 'Libre', val: 'free' as const },
              { label: '1:1', val: 1 },
              { label: '16:9', val: 16 / 9 },
              { label: '3:1', val: 3 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onAspectChange(item.val)}
                className={`px-2 py-0.5 text-[10px] border pixel-button ${
                  aspectRatio === item.val
                    ? 'border-brand-500 text-brand-400 bg-brand-950/40'
                    : 'border-dark-border text-dark-muted hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={onSelectAll}
            title="Seleccionar toda la imagen"
            className="px-2 py-0.5 border border-dark-border hover:border-brand-500 text-dark-muted hover:text-brand-400 pixel-button flex items-center gap-1 text-[10px]"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Toda la imagen</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            title="Restablecer selección"
            className="p-1 border border-dark-border hover:border-gray-500 text-dark-muted hover:text-white pixel-button"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
