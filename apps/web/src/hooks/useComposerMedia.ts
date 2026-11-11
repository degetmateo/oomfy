import React, { useState, useRef, useEffect, useCallback, RefObject } from 'react';
import { useImageCropQueue } from './useImageCropQueue.js';
import { extractMediaFromDataTransfer } from '../utils/composerMediaHelper.js';

interface Options {
  allowCrop?: boolean;
  cropTitle?: string;
  maxGifs?: number;
  maxTotal?: number;
  maxLength?: number;
}

export function useComposerMedia(options: Options = {}) {
  const { allowCrop = true, cropTitle = 'Recortar imagen', maxGifs = 4, maxTotal = 4, maxLength } = options;
  const [files, setFiles] = useState<File[]>([]);
  const [gifs, setGifs] = useState<string[]>([]);
  const [textareaEl, setTextareaEl] = useState<HTMLTextAreaElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cropQueue = useImageCropQueue((cropped) => setFiles((prev) => [...prev, ...cropped].slice(0, maxTotal)));

  const attachTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    setTextareaEl(el);
  }, []);

  const attachFiles = (incoming: File[], skipCrop = false) => {
    const remaining = Math.max(0, maxTotal - (files.length + gifs.length));
    if (remaining <= 0 || incoming.length === 0) return;
    const picked = incoming.slice(0, remaining);
    const gifFiles = picked.filter((f) => f.type === 'image/gif' || /\.gif$/i.test(f.name));
    const nonGifs = picked.filter((f) => f.type !== 'image/gif' && !/\.gif$/i.test(f.name));
    if (gifFiles.length > 0) setFiles((p) => [...p, ...gifFiles].slice(0, maxTotal));
    if (nonGifs.length > 0) {
      if (allowCrop && !skipCrop) {
        cropQueue.startCropping(nonGifs, { title: cropTitle, aspectRatio: 'free', allowAspectChange: true });
      } else {
        setFiles((p) => [...p, ...nonGifs].slice(0, maxTotal));
      }
    }
  };

  const attachGifUrl = (url: string) => {
    if (!url || files.length + gifs.length >= maxTotal) return;
    setGifs((prev) => (maxGifs === 1 ? [url] : prev.includes(url) || prev.length >= maxGifs ? prev : [...prev, url]));
  };

  const handleDataTransfer = (dt: DataTransfer | null | undefined, preventDefault: () => void) => {
    const { files: dtFiles, url } = extractMediaFromDataTransfer(dt);
    if (dtFiles.length > 0) { preventDefault(); attachFiles(dtFiles, true); return; }
    if (url) { preventDefault(); attachGifUrl(url); }
  };

  const transferHandlerRef = useRef(handleDataTransfer);
  transferHandlerRef.current = handleDataTransfer;

  useEffect(() => {
    if (!textareaEl) return;
    const onNativeBeforeInput = (e: Event) => {
      const dt = (e as InputEvent).dataTransfer;
      if (dt) transferHandlerRef.current(dt, () => e.preventDefault());
    };
    textareaEl.addEventListener('beforeinput', onNativeBeforeInput);
    return () => textareaEl.removeEventListener('beforeinput', onNativeBeforeInput);
  }, [textareaEl]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleDataTransfer(e.clipboardData, () => e.preventDefault());
  };

  const insertEmoji = (emoji: string, value: string, setValue: (v: string) => void, elRef: RefObject<HTMLTextAreaElement | null> = textareaRef) => {
    const el = elRef.current;
    const [start, end] = [el?.selectionStart ?? value.length, el?.selectionEnd ?? value.length];
    const next = value.slice(0, start) + emoji + value.slice(end);
    if (maxLength && next.length > maxLength) return;
    setValue(next);
    setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); } }, 0);
  };

  return {
    files, setFiles, gifs, setGifs, textareaRef, attachTextareaRef, cropQueue, attachFiles, attachGifUrl,
    removeFile: (i: number) => setFiles((p) => p.filter((_, idx) => idx !== i)),
    removeGif: (i: number) => setGifs((p) => p.filter((_, idx) => idx !== i)),
    handlePaste, insertEmoji, clearMedia: () => { setFiles([]); setGifs([]); },
  };
}
