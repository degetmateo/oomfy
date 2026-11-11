import React from 'react';
import { ArrowDown, RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.js';

interface Props {
  onRefresh?: () => Promise<any> | void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<Props> = ({ onRefresh, children, disabled = false }) => {
  const { pullDistance, isRefreshing, isReadyToRefresh } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  return (
    <div className="relative min-h-screen">
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{ height: `${pullDistance}px` }}
          className="overflow-hidden flex items-center justify-center bg-dark-bg/95 border-b border-dark-border text-xs font-mono transition-[height] duration-75 select-none"
        >
          <div className="flex items-center gap-2 text-dark-muted px-4 py-1">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
                <span className="text-brand-400 font-bold">Actualizando...</span>
              </>
            ) : isReadyToRefresh ? (
              <>
                <RefreshCw className="w-4 h-4 text-brand-400 rotate-180 transition-transform" />
                <span className="text-brand-400 font-bold">Suelta para actualizar</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-4 h-4 text-dark-muted transition-transform" />
                <span>Desliza para actualizar</span>
              </>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          transform: pullDistance > 0 && !isRefreshing ? `translateY(${Math.round(pullDistance * 0.2)}px)` : undefined,
        }}
        className="transition-transform duration-75"
      >
        {children}
      </div>
    </div>
  );
};

