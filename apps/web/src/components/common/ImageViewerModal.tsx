import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<Props> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoom = useCallback((delta: number) => {
    setScale((prev) => Math.min(6, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    handleZoom(delta);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y,
    });
  };

  if (!imageUrl) return null;

  return (
    <div
      onClick={onClose}
      onWheel={handleWheel}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between items-center select-none font-mono"
    >
      <div className="w-full flex justify-between items-center p-3 sm:p-4 z-20 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleZoom(0.3); }}
            className="p-2 bg-dark-card border border-dark-border text-white hover:text-brand-400 pixel-button"
            title="Acercar (Rueda hacia arriba)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleZoom(-0.3); }}
            className="p-2 bg-dark-card border border-dark-border text-white hover:text-brand-400 pixel-button"
            title="Alejar (Rueda hacia abajo)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setScale(1); setPosition({ x: 0, y: 0 }); }}
            className="p-2 bg-dark-card border border-dark-border text-white hover:text-brand-400 pixel-button text-xs font-bold flex items-center gap-1.5"
            title="Restablecer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{Math.round(scale * 100)}%</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-dark-card border border-dark-border text-white hover:text-red-400 pixel-button"
          title="Cerrar (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsDragging(false)}
        className={`flex-1 flex items-center justify-center overflow-hidden w-full h-full p-4 ${
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
          }}
          className="object-contain pointer-events-auto"
        />
      </div>

      <div className="p-3 text-[11px] text-dark-muted z-20 text-center">
        Usa la rueda del mouse para hacer zoom · Arrastra para mover la imagen
      </div>
    </div>
  );
};
