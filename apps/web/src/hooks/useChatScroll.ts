import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useViewActive } from '../contexts/ViewActivityContext.js';

export function useChatScroll() {
  const isViewActive = useViewActive();
  const isViewActiveRef = useRef(isViewActive);
  isViewActiveRef.current = isViewActive;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const isAutoScrollRef = useRef(true);
  const savedScrollTopRef = useRef<number | null>(null);
  const prevViewActiveRef = useRef(isViewActive);
  const highlightTimeoutRef = useRef<any>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const lastContentHeightRef = useRef(0);
  const isPrependingRef = useRef(false);
  const prependSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const programmaticScrollUntilRef = useRef(0);
  const programmaticTypeRef = useRef<'instant' | 'smooth'>('instant');

  isAutoScrollRef.current = isAutoScrollEnabled;

  useLayoutEffect(() => {
    const wasActive = prevViewActiveRef.current;
    prevViewActiveRef.current = isViewActive;
    const el = scrollContainerRef.current;
    if (!el || wasActive === isViewActive) return;

    if (wasActive && !isViewActive) {
      if (el.clientHeight > 0) {
        savedScrollTopRef.current = el.scrollTop;
      }
      return;
    }

    if (!wasActive && isViewActive) {
      programmaticScrollUntilRef.current = Date.now() + 120;
      if (isAutoScrollRef.current) {
        el.scrollTop = el.scrollHeight;
      } else if (savedScrollTopRef.current !== null) {
        el.scrollTop = savedScrollTopRef.current;
      }
    }
  }, [isViewActive]);

  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node || typeof ResizeObserver === 'undefined') return;
    lastContentHeightRef.current = node.scrollHeight;
    const ro = new ResizeObserver(() => {
      const container = scrollContainerRef.current;
      if (!container || !isViewActiveRef.current || container.clientHeight === 0) return;
      const nextHeight = container.scrollHeight;
      if (nextHeight !== lastContentHeightRef.current) {
        lastContentHeightRef.current = nextHeight;
        if (isAutoScrollRef.current && !isPrependingRef.current) {
          container.scrollTop = container.scrollHeight;
        }
      }
    });
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  const checkIfAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || el.clientHeight === 0) return isAutoScrollRef.current;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom <= 48;
  }, []);

  const handleScroll = useCallback(() => {
    if (!isViewActiveRef.current || isPrependingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el || el.clientHeight === 0) return;
    const isAtBottom = checkIfAtBottom();
    if (Date.now() < programmaticScrollUntilRef.current) {
      if (programmaticTypeRef.current === 'smooth' || isAtBottom) return;
      programmaticScrollUntilRef.current = 0;
    }
    savedScrollTopRef.current = el.scrollTop;
    if (isAutoScrollRef.current !== isAtBottom) {
      setIsAutoScrollEnabled(isAtBottom);
      isAutoScrollRef.current = isAtBottom;
    }
  }, [checkIfAtBottom]);

  const snapToBottomImmediate = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    programmaticTypeRef.current = 'instant';
    programmaticScrollUntilRef.current = Date.now() + 100;
    el.scrollTop = el.scrollHeight;
    savedScrollTopRef.current = el.scrollTop;
    setIsAutoScrollEnabled(true);
    isAutoScrollRef.current = true;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth', force = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (force || isAutoScrollRef.current) {
      programmaticTypeRef.current = behavior === 'smooth' ? 'smooth' : 'instant';
      if (behavior === 'smooth') programmaticScrollUntilRef.current = Date.now() + 450;
      if (behavior !== 'instant' && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior });
      else el.scrollTop = el.scrollHeight;
      savedScrollTopRef.current = el.scrollHeight;
      setIsAutoScrollEnabled(true);
      isAutoScrollRef.current = true;
    }
  }, []);

  const beginPrepend = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    prependSnapshotRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
    isPrependingRef.current = true;
    setIsAutoScrollEnabled(false);
    isAutoScrollRef.current = false;
  }, []);

  const restoreScrollAfterPrepend = useCallback((): boolean => {
    const el = scrollContainerRef.current;
    const snap = prependSnapshotRef.current;
    if (!el || !snap) return false;
    el.scrollTop = snap.scrollTop + (el.scrollHeight - snap.scrollHeight);
    savedScrollTopRef.current = el.scrollTop;
    prependSnapshotRef.current = null;
    const release = () => { isPrependingRef.current = false; };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(release);
    else Promise.resolve().then(release);
    return true;
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsAutoScrollEnabled(false);
    isAutoScrollRef.current = false;
    const target = el.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
    if (target) {
      if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 1500);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return {
    scrollContainerRef,
    contentRef,
    isAutoScrollEnabled,
    showScrollBottomButton: !isAutoScrollEnabled,
    highlightedMessageId,
    handleScroll,
    scrollToBottom,
    scrollToMessage,
    snapToBottomImmediate,
    beginPrepend,
    restoreScrollAfterPrepend,
  };
}
