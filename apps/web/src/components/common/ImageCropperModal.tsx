import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ImageCropService } from '../../utils/ImageCropService.js';
import { useCropBox } from '../../hooks/useCropBox.js';
import { CropBoxView } from './CropBoxView.js';
import { ImageCropperControls } from './ImageCropperControls.js';

interface Props {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
  aspectRatio?: number | 'free';
  title?: string;
  allowAspectChange?: boolean;
}

export const ImageCropperModal: React.FC<Props> = ({
  file,
  isOpen,
  onClose,
  onCrop,
  aspectRatio: initialAspect = 1,
  title = 'Recortar imagen',
  allowAspectChange = true,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number | 'free'>(initialAspect);
  const [bounds, setBounds] = useState({ width: 340, height: 260 });
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const { crop, setCrop, selectAll, onDragStart, onDragMove, onDragEnd } = useCropBox({
    bounds,
    aspectRatio: aspect,
  });

  useEffect(() => {
    if (file && isOpen) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setAspect(initialAspect);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isOpen, initialAspect]);

  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const w = imgRef.current.clientWidth || 340;
    const h = imgRef.current.clientHeight || 260;
    setBounds({ width: w, height: h });
    if (aspect === 'free') {
      setCrop({ x: 0, y: 0, width: w, height: h });
    } else {
      let initW = Math.round(w * 0.85);
      let initH = Math.round(initW / aspect);
      if (initH > h) {
        initH = Math.round(h * 0.85);
        initW = Math.round(initH * aspect);
      }
      setCrop({
        x: Math.round((w - initW) / 2),
        y: Math.round((h - initH) / 2),
        width: initW,
        height: initH,
      });
    }
  };

  if (!isOpen || !file || !imageSrc) return null;

  const handleConfirmCrop = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);
    try {
      const cropped = await ImageCropService.cropFromRect(
        imgRef.current,
        { width: bounds.width, height: bounds.height },
        crop,
        file
      );
      onCrop(cropped);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-mono select-none"
      onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
      onMouseUp={onDragEnd}
      onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={onDragEnd}
    >
      <div className="w-full max-w-lg bg-[#1a1a1a] border-2 border-dark-border shadow-pixel flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b-2 border-dark-border bg-[#141414]">
          <span className="font-bold text-white text-xs tracking-wider uppercase">{title}</span>
          <button type="button" onClick={onClose} className="p-1 hover:bg-dark-border text-dark-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative min-h-[260px] max-h-[380px] bg-[#0e0e0e] flex items-center justify-center overflow-hidden p-2">
          <div className="relative inline-block overflow-hidden" style={{ width: bounds.width, height: bounds.height }}>
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Para recortar"
              onLoad={handleImageLoad}
              draggable={false}
              className="max-h-[360px] max-w-full object-contain pointer-events-none block mx-auto"
            />
            <CropBoxView
              crop={crop}
              onHandleMouseDown={(h, e) => onDragStart(h, e.clientX, e.clientY)}
              onHandleTouchStart={(h, e) => onDragStart(h, e.touches[0].clientX, e.touches[0].clientY)}
            />
          </div>
        </div>

        <ImageCropperControls
          aspectRatio={aspect}
          onAspectChange={(a) => {
            setAspect(a);
            selectAll();
          }}
          onSelectAll={selectAll}
          onReset={handleImageLoad}
          allowAspectChange={allowAspectChange}
        />

        <div className="flex items-center justify-end gap-2 p-3 border-t border-dark-border bg-[#141414]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-dark-border text-dark-muted hover:text-white pixel-button"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isProcessing}
            className="px-4 py-1.5 text-xs font-bold text-black bg-brand-500 hover:bg-brand-400 pixel-button disabled:opacity-50"
          >
            {isProcessing ? 'Procesando...' : 'Confirmar recorte'}
          </button>
        </div>
      </div>
    </div>
  );
};
