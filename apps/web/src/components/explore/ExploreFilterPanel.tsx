import React from 'react';

interface FilterValues {
  author: string;
  since: string;
  until: string;
  hasMedia: boolean;
}

interface Props {
  values: FilterValues;
  onChange: (val: FilterValues) => void;
  onReset: () => void;
}

export const ExploreFilterPanel: React.FC<Props> = ({ values, onChange, onReset }) => {
  return (
    <div className="p-3 bg-dark-card/60 border-b border-dark-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
      <div>
        <label className="text-dark-muted block mb-1">Usuario (@):</label>
        <input
          type="text"
          value={values.author}
          onChange={(e) => onChange({ ...values, author: e.target.value })}
          placeholder="Ej. buenardo_bro"
          className="w-full bg-dark-bg border border-dark-border p-1.5 text-white outline-none focus:border-brand-500 font-sans text-xs"
        />
      </div>

      <div className="flex items-center gap-2 pt-4">
        <label className="flex items-center gap-2 cursor-pointer text-white">
          <input
            type="checkbox"
            checked={values.hasMedia}
            onChange={(e) => onChange({ ...values, hasMedia: e.target.checked })}
            className="accent-brand-500"
          />
          <span>Solo con imágenes/multimedia</span>
        </label>
      </div>

      <div>
        <label className="text-dark-muted block mb-1">Desde fecha:</label>
        <input
          type="date"
          value={values.since}
          onChange={(e) => onChange({ ...values, since: e.target.value })}
          className="w-full bg-dark-bg border border-dark-border p-1.5 text-white outline-none focus:border-brand-500 font-sans text-xs"
        />
      </div>

      <div>
        <label className="text-dark-muted block mb-1">Hasta fecha:</label>
        <input
          type="date"
          value={values.until}
          onChange={(e) => onChange({ ...values, until: e.target.value })}
          className="w-full bg-dark-bg border border-dark-border p-1.5 text-white outline-none focus:border-brand-500 font-sans text-xs"
        />
      </div>

      <div className="col-span-full flex justify-end">
        <button
          onClick={onReset}
          className="text-dark-muted hover:text-white underline text-[11px]"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
};
