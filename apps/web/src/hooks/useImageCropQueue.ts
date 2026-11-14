import { useState } from 'react';

interface CropQueueOptions {
  aspectRatio?: number | 'free';
  title?: string;
  allowAspectChange?: boolean;
}

export function useImageCropQueue(onComplete: (files: File[]) => void) {
  const [queue, setQueue] = useState<File[]>([]);
  const [croppedResults, setCroppedResults] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [options, setOptions] = useState<CropQueueOptions>({});

  const startCropping = (files: File[], opts?: CropQueueOptions) => {
    if (files.length === 0) return;
    setOptions(opts || {});
    setCroppedResults([]);
    setCurrentFile(files[0]);
    setQueue(files.slice(1));
  };

  const handleCrop = (cropped: File) => {
    const updated = [...croppedResults, cropped];
    if (queue.length > 0) {
      setCroppedResults(updated);
      setCurrentFile(queue[0]);
      setQueue((q) => q.slice(1));
    } else {
      setCurrentFile(null);
      setCroppedResults([]);
      onComplete(updated);
    }
  };

  const handleClose = () => {
    const pending = croppedResults;
    setCurrentFile(null);
    setQueue([]);
    setCroppedResults([]);
    if (pending.length > 0) {
      onComplete(pending);
    }
  };

  return {
    currentFile,
    isCropping: currentFile !== null,
    options,
    startCropping,
    handleCrop,
    handleClose,
  };
}

