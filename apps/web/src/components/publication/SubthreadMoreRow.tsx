import React from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  label: string;
  isLoading: boolean;
  onClick: (e: React.MouseEvent) => void;
  buttonClassName: string;
}

export const SubthreadMoreRow: React.FC<Props> = ({ label, isLoading, onClick, buttonClassName }) => (
  <div className="px-3.5 sm:px-4 pb-3.5 pt-1.5 flex items-center gap-3 font-mono">
    <div className="w-12 flex justify-center flex-shrink-0" aria-hidden="true">
      <div className="h-7 border-l-2 border-dashed border-brand-500/60 -mt-1" />
    </div>
    <button type="button" onClick={onClick} disabled={isLoading} className={buttonClassName}>
      {isLoading && <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />}
      <span>{label}</span>
    </button>
  </div>
);
