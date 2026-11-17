import { useState, useRef, useCallback, useEffect } from 'react';

export function useChatScroll() {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const isAutoScrollRef = useRef(true);
  const highlightTimeoutRef = useRef<any>(null);

  isAutoScrollRef.current = isAutoScrollEnabled;

  const checkIfAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom <= 48;
  }, []);

  const handleScroll = useCallback(() => {
    const isAtBottom = checkIfAtBottom();
    if (isAutoScrollRef.current !== isAtBottom) {
      setIsAutoScrollEnabled(isAtBottom);
      isAutoScrollRef.current = isAtBottom;
    }
  }, [checkIfAtBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth', force = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (force || isAutoScrollRef.current) {
      if (typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior });
      else el.scrollTop = el.scrollHeight;
      setIsAutoScrollEnabled(true);
      isAutoScrollRef.current = true;
    }
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
    };
  }, []);

  return {
    scrollContainerRef,
    isAutoScrollEnabled,
    showScrollBottomButton: !isAutoScrollEnabled,
    highlightedMessageId,
    handleScroll,
    scrollToBottom,
    scrollToMessage,
  };
}
