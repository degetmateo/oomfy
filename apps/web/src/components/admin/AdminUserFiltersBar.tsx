import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

export interface AdminFiltersState {
  search: string;
  role: string;
  status: string;
  createdFrom: string;
  createdTo: string;
}

interface Props {
  filters: AdminFiltersState;
  onChange: (filters: AdminFiltersState) => void;
  onReset: () => void;
}

export const AdminUserFiltersBar: React.FC<Props> = ({ filters, onChange, onReset }) => {
  const isFiltered = Boolean(
    filters.search || filters.role !== 'all' || filters.status !== 'all' || filters.createdFrom || filters.createdTo
  );

  return (
    <div className="flex flex-col gap-2 p-3 bg-dark-card/40 border border-dark-border text-xs">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-dark-muted" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Filtrar por nombre o @username..."
          className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          value={filters.role}
          onChange={(e) => onChange({ ...filters, role: e.target.value })}
          className="bg-dark-card border border-dark-border px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-brand-500"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="mod">Mod</option>
          <option value="tester">Tester</option>
          <option value="member">Miembro</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="bg-dark-card border border-dark-border px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-brand-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="suspended">Suspendido</option>
          <option value="pending">Pendiente</option>
        </select>

        <div className="flex items-center gap-1 text-[11px] text-dark-muted font-sans">
          <span>Desde:</span>
          <input
            type="date"
            value={filters.createdFrom}
            onChange={(e) => onChange({ ...filters, createdFrom: e.target.value })}
            className="bg-dark-card border border-dark-border px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1 text-[11px] text-dark-muted font-sans">
          <span>Hasta:</span>
          <input
            type="date"
            value={filters.createdTo}
            onChange={(e) => onChange({ ...filters, createdTo: e.target.value })}
            className="bg-dark-card border border-dark-border px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 border border-dark-border text-dark-muted hover:text-white hover:border-gray-500 pixel-button flex items-center gap-1 ml-auto text-[10px]"
            title="Limpiar filtros"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        )}
      </div>
    </div>
  );
};
