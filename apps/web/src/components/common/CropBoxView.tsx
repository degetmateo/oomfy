import React from 'react';
import { CropRect, HandleType } from '../../hooks/useCropBox.js';

interface Props {
  crop: CropRect;
  onHandleMouseDown: (handle: HandleType, e: React.MouseEvent) => void;
  onHandleTouchStart: (handle: HandleType, e: React.TouchEvent) => void;
}

export const CropBoxView: React.FC<Props> = ({ crop, onHandleMouseDown, onHandleTouchStart }) => {
  const handles: { type: HandleType; className: string }[] = [
    { type: 'nw', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
    { type: 'ne', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
    { type: 'se', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
    { type: 'sw', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
    { type: 'n', className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
    { type: 's', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
    { type: 'w', className: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
    { type: 'e', className: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
  ];

  return (
    <div
      style={{
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      }}
      className="absolute border-2 border-dashed border-brand-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] select-none cursor-move"
      onMouseDown={(e) => onHandleMouseDown('inside', e)}
      onTouchStart={(e) => onHandleTouchStart('inside', e)}
    >
      {/* Rule of thirds grid lines */}
      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
        <div className="border-r border-b border-brand-400" />
        <div className="border-r border-b border-brand-400" />
        <div className="border-b border-brand-400" />
        <div className="border-r border-b border-brand-400" />
        <div className="border-r border-b border-brand-400" />
        <div className="border-b border-brand-400" />
      </div>

      {/* Resize Handles */}
      {handles.map(({ type, className }) => (
        <div
          key={type}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(type, e);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            onHandleTouchStart(type, e);
          }}
          className={`absolute w-3.5 h-3.5 bg-brand-400 border border-black shadow-pixel ${className}`}
        />
      ))}
    </div>
  );
};

