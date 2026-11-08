import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UrlHelper } from '../../utils/UrlHelper.js';

interface Props {
  text: string | null | undefined;
  className?: string;
}

export const FormattedText: React.FC<Props> = ({ text, className = '' }) => {
  const navigate = useNavigate();

  if (!text) return null;

  const tokenRegex = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+|#[a-zA-Z0-9_-]+)/g;
  const parts = text.split(tokenRegex);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (UrlHelper.isInternalUrl(url)) {
      navigate(UrlHelper.getInternalPath(url));
    } else {
      navigate(`/external?url=${encodeURIComponent(url)}`);
    }
  };

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (/^https?:\/\//i.test(part)) {
          const isInternal = UrlHelper.isInternalUrl(part);
          return (
            <a
              key={index}
              href={part}
              target={isInternal ? undefined : '_blank'}
              rel={isInternal ? undefined : 'ugc nofollow noopener noreferrer'}
              onClick={(e) => handleLinkClick(e, part)}
              title={`Ir a ${part}`}
              className="text-brand-400 font-bold hover:underline cursor-pointer break-all"
            >
              {part}
            </a>
          );
        }

        if (/^@[a-zA-Z0-9_]+$/i.test(part)) {
          return (
            <Link
              key={index}
              to={`/${part.slice(1)}`}
              onClick={(e) => e.stopPropagation()}
              title={`Ver perfil de ${part}`}
              className="text-brand-400 font-bold hover:underline cursor-pointer"
            >
              {part}
            </Link>
          );
        }

        if (/^#[a-zA-Z0-9_-]+$/i.test(part)) {
          const cleanTag = part.slice(1).toLowerCase();
          return (
            <Link
              key={index}
              to={`/t/${encodeURIComponent(cleanTag)}`}
              onClick={(e) => e.stopPropagation()}
              title={`Explorar ${part}`}
              className="text-brand-400 hover:underline cursor-pointer"
            >
              {part}
            </Link>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
