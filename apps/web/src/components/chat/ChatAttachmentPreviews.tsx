import React from 'react';
import { X } from 'lucide-react';

interface Props {
  files: File[];
  gifUrl: string | null;
  onRemoveFile: (index: number) => void;
  onRemoveGif: () => void;
}

export const ChatAttachmentPreviews: React.FC<Props> = ({
  files,
  gifUrl,
  onRemoveFile,
  onRemoveGif,
}) => {
  if (files.length === 0 && !gifUrl) return null;

  return (
    <div className="p-2 border-b border-dark-border/40 flex items-center gap-2 overflow-x-auto bg-dark-bg/80">
      {files.map((file, i) => (
        <div key={i} className="relative w-14 h-14 rounded border border-dark-border overflow-hidden flex-shrink-0">
          <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onRemoveFile(i)}
            className="absolute top-0 right-0 bg-black/80 text-white p-0.5 rounded-bl hover:bg-red-600"
            title="Quitar archivo"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {gifUrl && (
        <div className="relative w-20 h-14 rounded border border-dark-border overflow-hidden flex-shrink-0">
          <img src={gifUrl} alt="gif preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemoveGif}
            className="absolute top-0 right-0 bg-black/80 text-white p-0.5 rounded-bl hover:bg-red-600"
            title="Quitar GIF"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

