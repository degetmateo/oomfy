import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Key, Laptop, Smartphone, Sparkles } from 'lucide-react';
import { Header } from '../components/layout/Header.js';
import { CachedTabPanel } from '../components/common/CachedTabPanel.js';
import { AccountSettingsTab } from '../components/settings/AccountSettingsTab.js';
import { CustomizationSettingsTab } from '../components/settings/CustomizationSettingsTab.js';
import { SecuritySettingsTab } from '../components/settings/SecuritySettingsTab.js';
import { SessionsSettingsTab } from '../components/settings/SessionsSettingsTab.js';
import { AppPwaSettingsTab } from '../components/settings/AppPwaSettingsTab.js';
import { LogoutSection } from '../components/settings/LogoutSection.js';
import { useTabSwipe } from '../hooks/useTabSwipe.js';
import { useViewActive } from '../contexts/ViewActivityContext.js';
import { useViewSearchParams } from '../hooks/useViewSearchParams.js';

type Tab = 'account' | 'customization' | 'security' | 'sessions' | 'app';

export const SettingsView: React.FC = () => {
  const isViewActive = useViewActive();
  const [searchParams, setSearchParams] = useViewSearchParams();
  const validTabs: Tab[] = ['account', 'customization', 'security', 'sessions', 'app'];
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'account'
  );

  useEffect(() => {
    if (!isViewActive) return;
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, isViewActive]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const { touchHandlers } = useTabSwipe({ tabs: validTabs, activeTab, onTabChange: selectTab });

  const tabs = [
    { id: 'account' as const, label: 'Cuenta', icon: Shield },
    { id: 'customization' as const, label: 'Personalización', icon: Sparkles },
    { id: 'security' as const, label: 'Seguridad', icon: Key },
    { id: 'sessions' as const, label: 'Sesiones', icon: Laptop },
    { id: 'app' as const, label: 'App', icon: Smartphone },
  ];

  return (
    <div {...touchHandlers} className="flex flex-col min-h-screen font-mono">
      <Header title="Configuración" />

      <div className="flex border-b border-dark-border bg-dark-bg text-xs overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`flex-1 py-3 px-2 font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${isActive ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-muted hover:text-white'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6 max-w-xl relative">
        <CachedTabPanel active={activeTab === 'account'}><AccountSettingsTab /></CachedTabPanel>
        <CachedTabPanel active={activeTab === 'customization'}><CustomizationSettingsTab /></CachedTabPanel>
        <CachedTabPanel active={activeTab === 'security'}><SecuritySettingsTab /></CachedTabPanel>
        <CachedTabPanel active={activeTab === 'sessions'}><SessionsSettingsTab /></CachedTabPanel>
        <CachedTabPanel active={activeTab === 'app'}><AppPwaSettingsTab /></CachedTabPanel>

        <LogoutSection />

        <div className="mt-6 pt-4 border-t border-dark-border flex flex-wrap gap-4 text-[11px] text-dark-muted">
          <Link to="/terms" className="hover:text-brand-400 hover:underline">Términos y Condiciones</Link>
          <Link to="/privacy" className="hover:text-brand-400 hover:underline">Política de Privacidad</Link>
        </div>
      </div>
    </div>
  );
};
