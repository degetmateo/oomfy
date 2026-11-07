import React from 'react';
import { X } from 'lucide-react';

interface Props {
  images: File[];
  selectedGifs: string[];
  onRemoveImage: (index: number) => void;
  onRemoveGif: (index: number) => void;
}

export const PublicationAttachmentPreviews: React.FC<Props> = ({
  images,
  selectedGifs,
  onRemoveImage,
  onRemoveGif,
}) => {
  if (images.length === 0 && selectedGifs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2 font-mono">
      {images.map((img, i) => (
        <span key={i} className="text-xs bg-dark-card border border-dark-border px-2 py-1 text-brand-400 flex items-center gap-1">
          {img.name.slice(0, 12)}...
          <button type="button" onClick={() => onRemoveImage(i)} title="Quitar archivo">
            <X className="w-3 h-3 text-red-400 hover:text-white" />
          </button>
        </span>
      ))}
      {selectedGifs.map((gif, i) => (
        <div key={i} className="relative w-16 h-16 border border-dark-border overflow-hidden">
          <img src={gif} alt="GIF" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onRemoveGif(i)}
            className="absolute top-0 right-0 bg-black/80 text-white p-0.5"
            title="Quitar GIF"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

