import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

interface Props {
  files: File[];
  gifs: string[];
  onRemoveFile: (index: number) => void;
  onRemoveGif: (index: number) => void;
  variant?: 'default' | 'compact';
}

export const ComposerAttachmentPreviews: React.FC<Props> = ({
  files,
  gifs,
  onRemoveFile,
  onRemoveGif,
  variant = 'default',
}) => {
  const fileUrls = useMemo(
    () => files.map((f) => (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : '')),
    [files]
  );

  useEffect(() => {
    return () => {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        fileUrls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
      }
    };
  }, [fileUrls]);

  if (files.length === 0 && gifs.length === 0) return null;

  const isCompact = variant === 'compact';
  const wrapClass = isCompact
    ? 'p-2 border-b border-dark-border/40 flex items-center gap-2 overflow-x-auto bg-dark-bg/80 font-mono'
    : 'flex flex-wrap gap-2 my-2 font-mono';
  const thumbClass = isCompact
    ? 'relative w-14 h-14 rounded border border-dark-border overflow-hidden flex-shrink-0'
    : 'relative w-16 h-16 border border-dark-border overflow-hidden bg-dark-card';

  return (
    <div className={wrapClass}>
      {files.map((file, i) => (
        <div key={`${file.name}-${i}`} className={thumbClass}>
          {fileUrls[i] ? (
            <img src={fileUrls[i]} alt={file.name} className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full px-1 text-[10px] text-brand-400 truncate">
              {file.name}
            </span>
          )}
          {fileUrls[i] && !isCompact && (
            <span className="absolute bottom-0 inset-x-0 bg-black/80 px-1 text-[9px] text-brand-400 truncate text-center">
              {file.name}
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemoveFile(i)}
            className="absolute top-0 right-0 bg-black/80 text-white p-0.5 hover:bg-red-600"
            title="Quitar archivo"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {gifs.map((gif, i) => (
        <div key={`${gif}-${i}`} className={isCompact ? 'relative w-20 h-14 rounded border border-dark-border overflow-hidden flex-shrink-0' : thumbClass}>
          <img src={gif} alt="GIF" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onRemoveGif(i)}
            className="absolute top-0 right-0 bg-black/80 text-white p-0.5 hover:bg-red-600"
            title="Quitar GIF"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
