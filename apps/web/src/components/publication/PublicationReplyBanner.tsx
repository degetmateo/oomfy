import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  parentAuthorUsername?: string | null;
  parentPublicationId?: string | null;
}

export const PublicationReplyBanner: React.FC<Props> = ({ parentAuthorUsername, parentPublicationId }) => {
  const navigate = useNavigate();

  return (
    <div className="text-[0.8125rem] leading-[1.4] text-dark-muted font-mono flex items-center gap-1.5 flex-wrap">
      <span>En respuesta a</span>
      <span
        data-no-card-nav="true"
        onClick={(e) => {
          e.stopPropagation();
          if (parentAuthorUsername) navigate(`/${parentAuthorUsername}`);
          else if (parentPublicationId) navigate(`/publication/${parentPublicationId}`);
        }}
        className="text-brand-400 font-bold hover:underline cursor-pointer"
      >
        @{parentAuthorUsername || 'usuario'}
      </span>
    </div>
  );
};
