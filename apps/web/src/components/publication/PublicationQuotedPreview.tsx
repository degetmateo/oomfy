import React from 'react';
import { X } from 'lucide-react';
import { Publication } from '@oomfy/shared';

interface Props {
  quotedPublication: Publication;
  onRemove?: () => void;
}

export const PublicationQuotedPreview: React.FC<Props> = ({ quotedPublication, onRemove }) => {
  return (
    <div className="relative mb-3 border border-dark-border p-2.5 bg-dark-card/50 text-xs font-mono">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 text-dark-muted hover:text-white p-1"
          title="Quitar cita"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-white">@{quotedPublication.author.username}</span>
        <span className="text-dark-muted text-[10px]">· {new Date(quotedPublication.created_at).toLocaleDateString()}</span>
      </div>
      {quotedPublication.content && (
        <p className="text-dark-text whitespace-pre-line leading-relaxed font-sans">{quotedPublication.content}</p>
      )}
      {quotedPublication.images && quotedPublication.images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {quotedPublication.images.map((img: any, i: number) => (
            <img key={i} src={img.url} alt="" className="w-16 h-16 object-cover border border-dark-border" />
          ))}
        </div>
      )}
    </div>
  );
};

