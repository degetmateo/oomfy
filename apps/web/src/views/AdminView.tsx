import React, { useState } from 'react';
import { BarChart3, Settings, Users, ShieldAlert } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { AdminStatsTab } from '../components/admin/AdminStatsTab.js';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab.js';
import { AdminUsersTab } from '../components/admin/AdminUsersTab.js';
import { AdminModerationTab } from '../components/admin/AdminModerationTab.js';

type Tab = 'stats' | 'settings' | 'users' | 'moderation';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'stats', label: 'Métricas', icon: BarChart3 },
    { key: 'settings', label: 'Ajustes', icon: Settings },
    { key: 'users', label: 'Usuarios', icon: Users },
    { key: 'moderation', label: 'Moderación', icon: ShieldAlert },
  ];

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title="Administración" subtitle="Gestión y moderación global" />

      <div className="flex border-b border-dark-border bg-dark-bg text-xs">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-3 font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === t.key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-dark-muted hover:text-white'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'stats' && <AdminStatsTab />}
        {activeTab === 'settings' && <AdminSettingsTab />}
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'moderation' && <AdminModerationTab />}
      </div>
    </div>
  );
};

