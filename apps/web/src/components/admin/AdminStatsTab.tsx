import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Ban, MessageSquare } from 'lucide-react';
import { ApiClient } from '../../services/api.js';
import { AdminStats } from '@oomfy/shared';

export const AdminStatsTab: React.FC = () => {
  const { data, isLoading } = useQuery<{ success: boolean; data: AdminStats }>({
    queryKey: ['admin-stats'],
    queryFn: () => ApiClient.get('/admin/stats'),
    refetchInterval: 15000,
  });

  const stats = data?.data;

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-dark-muted font-mono">Cargando métricas...</div>;
  }

  const cards = [
    { label: 'Usuarios totales', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-white' },
    { label: 'Usuarios activos', value: stats?.activeUsers ?? 0, icon: UserCheck, color: 'text-brand-400' },
    { label: 'Usuarios suspendidos', value: stats?.suspendedUsers ?? 0, icon: Ban, color: 'text-red-400' },
    { label: 'Publicaciones creadas', value: stats?.totalPublications ?? 0, icon: MessageSquare, color: 'text-blue-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {cards.map((c) => (
        <div key={c.label} className="p-4 bg-dark-card border border-dark-border flex flex-col gap-2">
          <div className="flex items-center justify-between text-dark-muted">
            <span className="text-[11px] font-bold">{c.label}</span>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <span className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</span>
        </div>
      ))}
    </div>
  );
};

