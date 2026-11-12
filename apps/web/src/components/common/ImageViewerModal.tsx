import React from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useImageViewerZoom } from '../../hooks/useImageViewerZoom.js';

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<Props> = ({ imageUrl, onClose }) => {
  const {
    scale, position, isDragging, stageRef, handleZoom, resetZoom,
    handleWheel, handleMouseDown, stopDragging, handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useImageViewerZoom(imageUrl, onClose);

  if (!imageUrl) return null;

  const stopAndClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imagen ampliada"
      data-no-card-nav="true"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => { e.stopPropagation(); stopDragging(); }}
      onPointerUp={stopDragging}
      onClick={stopAndClose}
      onWheel={handleWheel}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between items-center select-none font-mono"
    >
      <div className="w-full flex justify-between items-center p-3 sm:p-4 z-20 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); handleZoom(0.3); }} aria-label="Acercar imagen" className="p-2 bg-dark-card border border-dark-border text-white hover:text-brand-400 pixel-button" title="Acercar (Rueda hacia arriba)">
            <ZoomIn className="w-5 h-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleZoom(-0.3); }} aria-label="Alejar imagen" className="p-2 bg-dark-card border border-dark-border text-white hover:text-brand-400 pixel-button" title="Alejar (Rueda hacia abajo)">
            <ZoomOut className="w-5 h-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); resetZoom(); }} aria-label={`Restablecer zoom (${Math.round(scale * 100)}%)`} className="p-2 bg-dark-card border border-dark-border text-white hover:text-brand-400 pixel-button text-xs font-bold flex items-center gap-1.5" title="Restablecer">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{Math.round(scale * 100)}%</span>
          </button>
        </div>
        <button type="button" onClick={stopAndClose} aria-label="Cerrar vista ampliada" className="p-2 bg-dark-card border border-dark-border text-white hover:text-red-400 pixel-button" title="Cerrar (Esc)">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={stageRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseUp={(e) => { e.stopPropagation(); stopDragging(); }}
        onPointerUp={stopDragging}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'none' }}
        className={`flex-1 flex items-center justify-center overflow-hidden w-full h-full p-4 touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <img
          src={imageUrl}
          alt="Vista ampliada"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            maxHeight: '90vh',
            maxWidth: '90vw',
            imageRendering: 'auto',
            touchAction: 'none',
          }}
          className="object-contain pointer-events-auto touch-none"
        />
      </div>

      <div onClick={(e) => e.stopPropagation()} className="p-3 text-[11px] text-dark-muted z-20 text-center">
        Usa la rueda o pellizca con dos dedos para hacer zoom · Arrastra para mover
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
