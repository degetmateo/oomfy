import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';

export interface ViewActivityValue {
  isActive: boolean;
  viewKey: string;
  isPersistent: boolean;
}

const DEFAULT_ACTIVITY: ViewActivityValue = {
  isActive: true,
  viewKey: '',
  isPersistent: false,
};

const ViewActivityContext = createContext<ViewActivityValue>(DEFAULT_ACTIVITY);

export const ViewActivityProvider: React.FC<{
  isActive: boolean;
  viewKey: string;
  isPersistent?: boolean;
  children: React.ReactNode;
}> = ({ isActive, viewKey, isPersistent = true, children }) => {
  const value = useMemo<ViewActivityValue>(
    () => ({ isActive, viewKey, isPersistent }),
    [isActive, viewKey, isPersistent]
  );

  return <ViewActivityContext.Provider value={value}>{children}</ViewActivityContext.Provider>;
};

export function useViewActivity(): ViewActivityValue {
  return useContext(ViewActivityContext);
}

export function useViewActive(): boolean {
  return useContext(ViewActivityContext).isActive;
}

export function useCloseOnViewInactive(isOpen: boolean, onClose: () => void): void {
  const isActive = useViewActive();
  const prevActiveRef = useRef(isActive);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isActive;
    if (wasActive && !isActive && isOpen) {
      onCloseRef.current();
    }
  }, [isActive, isOpen]);
}

export function useRevalidateOnViewResume(refetch: () => unknown, minIntervalMs = 60_000): void {
  const isActive = useViewActive();
  const prevActiveRef = useRef(isActive);
  const lastActiveAtRef = useRef(Date.now());
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isActive;

    if (wasActive && !isActive) {
      lastActiveAtRef.current = Date.now();
    } else if (!wasActive && isActive && Date.now() - lastActiveAtRef.current >= minIntervalMs) {
      lastActiveAtRef.current = Date.now();
      void refetchRef.current();
    }
  }, [isActive, minIntervalMs]);
}
