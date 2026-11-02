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
    setCroppedResults(updated);

    if (queue.length > 0) {
      setCurrentFile(queue[0]);
      setQueue((q) => q.slice(1));
    } else {
      setCurrentFile(null);
      onComplete(updated);
    }
  };

  const handleClose = () => {
    setCurrentFile(null);
    setQueue([]);
    if (croppedResults.length > 0) {
      onComplete(croppedResults);
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

