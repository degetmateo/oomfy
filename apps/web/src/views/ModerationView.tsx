import React, { useEffect, useCallback } from 'react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { PullToRefresh } from '../components/common/PullToRefresh.js';
import { AdminReportsList } from '../components/admin/AdminReportsList.js';

export const ModerationView: React.FC = () => {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ['staff-reports'] }) > 0;

  const handleRefresh = useCallback(() => {
    return queryClient.refetchQueries({ queryKey: ['staff-reports'] });
  }, [queryClient]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void handleRefresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [handleRefresh]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="flex flex-col font-mono">
        <Header
          title="Moderación de Staff"
          subtitle="Panel de reportes y revisión de contenido"
          onRefresh={handleRefresh}
          isRefreshing={isFetching}
        />
        <div className="p-4 flex flex-col gap-4">
          <div className="p-3 bg-brand-950/20 border border-brand-500/40 text-xs text-brand-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>
              Panel exclusivo para Staff (Moderadores y Administradores). Revisa y resuelve los reportes enviados por los usuarios.
            </span>
          </div>
          <AdminReportsList />
        </div>
      </div>
    </PullToRefresh>
  );
};
