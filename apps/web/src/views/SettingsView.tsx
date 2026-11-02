import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Key, Laptop, Smartphone } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { AccountSettingsTab } from '../components/settings/AccountSettingsTab.js';
import { SecuritySettingsTab } from '../components/settings/SecuritySettingsTab.js';
import { SessionsSettingsTab } from '../components/settings/SessionsSettingsTab.js';
import { AppPwaSettingsTab } from '../components/settings/AppPwaSettingsTab.js';
import { LogoutSection } from '../components/settings/LogoutSection.js';

type Tab = 'account' | 'security' | 'sessions' | 'app';

export const SettingsView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs: Tab[] = ['account', 'security', 'sessions', 'app'];
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'account'
  );

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'account' as const, label: 'Cuenta', icon: Shield },
    { id: 'security' as const, label: 'Seguridad', icon: Key },
    { id: 'sessions' as const, label: 'Sesiones', icon: Laptop },
    { id: 'app' as const, label: 'App (PWA)', icon: Smartphone },
  ];

  return (
    <div className="flex flex-col min-h-screen font-mono">
      <Header title="Configuración" />

      {/* Navigation Tabs */}
      <div className="flex border-b border-dark-border bg-dark-bg text-xs overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`flex-1 py-3 px-2 font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                isActive ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6 max-w-xl">
        {activeTab === 'account' && <AccountSettingsTab />}
        {activeTab === 'security' && <SecuritySettingsTab />}
        {activeTab === 'sessions' && <SessionsSettingsTab />}
        {activeTab === 'app' && <AppPwaSettingsTab />}

        {/* Global Logout Section for Mobile & Desktop */}
        <LogoutSection />
      </div>
    </div>
  );
};
