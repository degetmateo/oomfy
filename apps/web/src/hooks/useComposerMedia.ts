import React, { useState, useRef, useEffect, useCallback, useMemo, RefObject } from 'react';
import { MediaWarning } from '@oomfy/shared';
import { useImageCropQueue } from './useImageCropQueue.js';
import { extractMediaFromDataTransfer, hasDraggableMediaPayload, syncTextareaHeight } from '../utils/composerMediaHelper.js';

interface Options {
  allowCrop?: boolean;
  cropTitle?: string;
  maxGifs?: number;
  maxTotal?: number;
  maxLength?: number;
}

interface FileAttachmentEntry {
  file: File;
  warning: MediaWarning | null;
}

interface GifAttachmentEntry {
  url: string;
  warning: MediaWarning | null;
}

export function useComposerMedia(options: Options = {}) {
  const { allowCrop = true, cropTitle = 'Recortar imagen', maxGifs = 4, maxTotal = 4, maxLength } = options;
  const [fileEntries, setFileEntries] = useState<FileAttachmentEntry[]>([]);
  const [gifEntries, setGifEntries] = useState<GifAttachmentEntry[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [dropFeedback, setDropFeedback] = useState<string | null>(null);
  const [textareaEl, setTextareaEl] = useState<HTMLTextAreaElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragDepthRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const files = useMemo(() => fileEntries.map((e) => e.file), [fileEntries]);
  const fileWarnings = useMemo(() => fileEntries.map((e) => e.warning), [fileEntries]);
  const gifs = useMemo(() => gifEntries.map((e) => e.url), [gifEntries]);
  const gifWarnings = useMemo(() => gifEntries.map((e) => e.warning), [gifEntries]);

  const setFiles = useCallback<React.Dispatch<React.SetStateAction<File[]>>>((updater) => {
    setFileEntries((prev) => {
      const prevFiles = prev.map((e) => e.file);
      const nextFiles = typeof updater === 'function' ? updater(prevFiles) : updater;
      return nextFiles.map((file, idx) => ({
        file,
        warning: prev[idx]?.file === file ? prev[idx].warning : null,
      }));
    });
  }, []);

  const setGifs = useCallback<React.Dispatch<React.SetStateAction<string[]>>>((updater) => {
    setGifEntries((prev) => {
      const prevGifs = prev.map((e) => e.url);
      const nextGifs = typeof updater === 'function' ? updater(prevGifs) : updater;
      return nextGifs.map((url, idx) => ({
        url,
        warning: prev[idx]?.url === url ? prev[idx].warning : null,
      }));
    });
  }, []);

  const cropQueue = useImageCropQueue((cropped) =>
    setFileEntries((prev) => [...prev, ...cropped.map((file) => ({ file, warning: null }))].slice(0, maxTotal))
  );

  const remainingSlots = Math.max(0, maxTotal - (files.length + gifs.length));

  const showDropFeedback = useCallback((msg: string | null) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setDropFeedback(msg);
    if (msg) {
      feedbackTimerRef.current = setTimeout(() => {
        setDropFeedback(null);
        feedbackTimerRef.current = null;
      }, 4000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isDraggingMedia || typeof window === 'undefined') return;
    const resetDrag = () => {
      dragDepthRef.current = 0;
      setIsDraggingMedia(false);
    };
    window.addEventListener('dragend', resetDrag);
    return () => window.removeEventListener('dragend', resetDrag);
  }, [isDraggingMedia]);

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
    if (gifFiles.length > 0) {
      setFileEntries((p) => [...p, ...gifFiles.map((file) => ({ file, warning: null }))].slice(0, maxTotal));
    }
    if (nonGifs.length > 0) {
      if (allowCrop && !skipCrop) {
        cropQueue.startCropping(nonGifs, { title: cropTitle, aspectRatio: 'free', allowAspectChange: true });
      } else {
        setFileEntries((p) => [...p, ...nonGifs.map((file) => ({ file, warning: null }))].slice(0, maxTotal));
      }
    }
  };

  const attachGifUrl = (url: string) => {
    if (!url || files.length + gifs.length >= maxTotal) return;
    setGifEntries((prev) =>
      maxGifs === 1
        ? [{ url, warning: null }]
        : prev.some((e) => e.url === url) || prev.length >= maxGifs
          ? prev
          : [...prev, { url, warning: null }]
    );
  };

  const handleDataTransfer = (
    dt: DataTransfer | null | undefined,
    preventDefault: () => void,
    opts?: { stopPropagation?: () => void; reportFeedback?: boolean }
  ) => {
    const { files: dtFiles, url, rejectedCount } = extractMediaFromDataTransfer(dt);
    if (dtFiles.length > 0) {
      preventDefault();
      opts?.stopPropagation?.();
      if (remainingSlots <= 0) {
        if (opts?.reportFeedback) showDropFeedback(`Has alcanzado el límite de ${maxTotal} archivos adjuntos.`);
        return;
      }
      attachFiles(dtFiles, true);
      if (opts?.reportFeedback) {
        if (rejectedCount > 0 && dtFiles.length > remainingSlots) {
          showDropFeedback('Algunos archivos se omitieron por formato no compatible o por el límite máximo.');
        } else if (rejectedCount > 0) {
          showDropFeedback('Algunos archivos no son imágenes/GIFs válidos y se omitieron.');
        } else if (dtFiles.length > remainingSlots) {
          showDropFeedback(`Solo se adjuntaron ${remainingSlots} de ${dtFiles.length} por el límite de ${maxTotal}.`);
        } else {
          showDropFeedback(null);
        }
      }
      return;
    }
    if (url) {
      preventDefault();
      opts?.stopPropagation?.();
      if (remainingSlots <= 0) {
        if (opts?.reportFeedback) showDropFeedback(`Has alcanzado el límite de ${maxTotal} archivos adjuntos.`);
        return;
      }
      if (maxGifs > 1 && gifs.length >= maxGifs) {
        if (opts?.reportFeedback) showDropFeedback(`Has alcanzado el límite de ${maxGifs} GIFs.`);
        return;
      }
      attachGifUrl(url);
      if (opts?.reportFeedback) showDropFeedback(null);
      return;
    }
    if (rejectedCount > 0) {
      preventDefault();
      opts?.stopPropagation?.();
      if (opts?.reportFeedback) showDropFeedback('Solo se permiten imágenes y GIFs (PNG, JPG, WEBP o GIF).');
    }
  };

  const transferHandlerRef = useRef(handleDataTransfer);
  transferHandlerRef.current = handleDataTransfer;

  useEffect(() => {
    if (!textareaEl) return;
    syncTextareaHeight(textareaEl);
    const onInput = () => syncTextareaHeight(textareaEl);
    const onNativeBeforeInput = (e: Event) => {
      const dt = (e as InputEvent).dataTransfer;
      if (dt) transferHandlerRef.current(dt, () => e.preventDefault());
    };
    textareaEl.addEventListener('input', onInput);
    textareaEl.addEventListener('beforeinput', onNativeBeforeInput);
    return () => {
      textareaEl.removeEventListener('input', onInput);
      textareaEl.removeEventListener('beforeinput', onNativeBeforeInput);
    };
  }, [textareaEl]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleDataTransfer(e.clipboardData, () => e.preventDefault());
  };

  const dragProps: Pick<React.HTMLAttributes<HTMLElement>, 'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop'> = {
    onDragEnter: (e) => {
      if (!hasDraggableMediaPayload(e.dataTransfer)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDraggingMedia(true);
    },
    onDragOver: (e) => {
      if (!hasDraggableMediaPayload(e.dataTransfer)) return;
      e.preventDefault();
      try {
        e.dataTransfer.dropEffect = remainingSlots > 0 ? 'copy' : 'none';
      } catch { /* ignore read-only dataTransfer in synthetic events */ }
      setIsDraggingMedia(true);
    },
    onDragLeave: (e) => {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      const related = e.relatedTarget as Node | null;
      if (dragDepthRef.current === 0 || (related && !e.currentTarget.contains(related))) {
        dragDepthRef.current = 0;
        setIsDraggingMedia(false);
      }
    },
    onDrop: (e) => {
      dragDepthRef.current = 0;
      setIsDraggingMedia(false);
      handleDataTransfer(e.dataTransfer, () => e.preventDefault(), {
        stopPropagation: () => e.stopPropagation(),
        reportFeedback: true,
      });
    },
  };

  const insertEmoji = (emoji: string, value: string, setValue: (v: string) => void, elRef: RefObject<HTMLTextAreaElement | null> = textareaRef) => {
    const el = elRef.current;
    const [start, end] = [el?.selectionStart ?? value.length, el?.selectionEnd ?? value.length];
    const next = value.slice(0, start) + emoji + value.slice(end);
    if (maxLength && next.length > maxLength) return;
    setValue(next);
    setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); } }, 0);
  };

  const setFileWarning = useCallback((index: number, warning: MediaWarning | null) => {
    setFileEntries((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, warning } : entry)));
  }, []);

  const setGifWarning = useCallback((index: number, warning: MediaWarning | null) => {
    setGifEntries((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, warning } : entry)));
  }, []);

  return {
    files,
    fileWarnings,
    setFiles,
    setFileWarning,
    gifs,
    gifWarnings,
    setGifs,
    setGifWarning,
    textareaRef,
    textareaEl,
    attachTextareaRef,
    cropQueue,
    attachFiles,
    attachGifUrl,
    isDraggingMedia,
    dropFeedback,
    remainingSlots,
    maxTotal,
    dragProps,
    removeFile: (i: number) => setFileEntries((p) => p.filter((_, idx) => idx !== i)),
    removeGif: (i: number) => setGifEntries((p) => p.filter((_, idx) => idx !== i)),
    handlePaste,
    insertEmoji,
    clearMedia: () => {
      setFileEntries([]);
      setGifEntries([]);
      showDropFeedback(null);
      if (textareaRef.current) { textareaRef.current.value = ''; syncTextareaHeight(textareaRef.current); }
    },
  };
}
