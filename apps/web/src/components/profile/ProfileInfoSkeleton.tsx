import React from 'react';

export const ProfileInfoSkeleton: React.FC = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Cargando perfil"
    className="px-4 pb-4 border-b border-dark-border relative bg-dark-bg font-mono"
  >
    <div className="flex justify-between items-end -mt-10 sm:-mt-16 mb-3">
      <div className="w-20 h-20 sm:w-28 sm:h-28 border-2 border-dark-border bg-dark-card animate-pulse" />
      <div className="w-24 h-8 bg-dark-card border border-dark-border animate-pulse mb-1 sm:mb-2" />
    </div>
    <div className="mt-2 space-y-2">
      <div className="h-5 w-40 bg-dark-card animate-pulse" />
      <div className="h-3 w-24 bg-dark-card animate-pulse" />
    </div>
    <div className="mt-3 space-y-1.5">
      <div className="h-3 w-full max-w-md bg-dark-card animate-pulse" />
      <div className="h-3 w-2/3 max-w-xs bg-dark-card animate-pulse" />
    </div>
    <div className="flex gap-4 mt-3">
      <div className="h-3 w-20 bg-dark-card animate-pulse" />
      <div className="h-3 w-20 bg-dark-card animate-pulse" />
    </div>
  </div>
);
