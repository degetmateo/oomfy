import { useState, useRef, useCallback, useEffect } from 'react';
import { useViewActive } from '../contexts/ViewActivityContext.js';

export function useChatScroll() {
  const isViewActive = useViewActive();
  const isViewActiveRef = useRef(isViewActive);
  isViewActiveRef.current = isViewActive;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const isAutoScrollRef = useRef(true);
  const highlightTimeoutRef = useRef<any>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const lastContentHeightRef = useRef(0);
  const isPrependingRef = useRef(false);
  const prependSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const programmaticScrollUntilRef = useRef(0);

  isAutoScrollRef.current = isAutoScrollEnabled;

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
    if (!isViewActiveRef.current || isPrependingRef.current || Date.now() < programmaticScrollUntilRef.current) return;
    const el = scrollContainerRef.current;
    if (el && el.clientHeight === 0) return;
    const isAtBottom = checkIfAtBottom();
    if (isAutoScrollRef.current !== isAtBottom) {
      setIsAutoScrollEnabled(isAtBottom);
      isAutoScrollRef.current = isAtBottom;
    }
  }, [checkIfAtBottom]);

  const snapToBottomImmediate = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    programmaticScrollUntilRef.current = Date.now() + 100;
    el.scrollTop = el.scrollHeight;
    setIsAutoScrollEnabled(true);
    isAutoScrollRef.current = true;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth', force = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (force || isAutoScrollRef.current) {
      if (behavior === 'smooth') programmaticScrollUntilRef.current = Date.now() + 450;
      if (behavior !== 'instant' && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior });
      else el.scrollTop = el.scrollHeight;
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
