import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UrlHelper } from '../../utils/UrlHelper.js';

interface Props {
  text: string | null | undefined;
  className?: string;
}

export const FormattedText: React.FC<Props> = ({ text, className = '' }) => {
  const navigate = useNavigate();

  if (!text) return null;

  // Regex splitting by URLs, @mentions, and #hashtags
  const tokenRegex = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g;
  const parts = text.split(tokenRegex);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (UrlHelper.isInternalUrl(url)) {
      navigate(UrlHelper.getInternalPath(url));
    } else {
      navigate(`/external?url=${encodeURIComponent(url)}`);
    }
  };

  const handleMentionClick = (e: React.MouseEvent, mention: string) => {
    e.stopPropagation();
    navigate(`/${mention.slice(1)}`);
  };

  const handleHashtagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    navigate(`/explore?q=${encodeURIComponent(tag)}`);
  };

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (/^https?:\/\//i.test(part)) {
          return (
            <span
              key={index}
              onClick={(e) => handleLinkClick(e, part)}
              title={`Ir a ${part}`}
              className="text-brand-400 font-bold hover:underline cursor-pointer break-all"
            >
              {part}
            </span>
          );
        }

        if (/^@[a-zA-Z0-9_]+$/i.test(part)) {
          return (
            <span
              key={index}
              onClick={(e) => handleMentionClick(e, part)}
              title={`Ver perfil de ${part}`}
              className="text-brand-400 font-bold hover:underline cursor-pointer"
            >
              {part}
            </span>
          );
        }

        if (/^#[a-zA-Z0-9_]+$/i.test(part)) {
          return (
            <span
              key={index}
              onClick={(e) => handleHashtagClick(e, part)}
              title={`Explorar ${part}`}
              className="text-brand-400 hover:underline cursor-pointer"
            >
              {part}
            </span>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
