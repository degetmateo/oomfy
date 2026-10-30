import React from 'react';
import { useNavigate } from 'react-router-dom';

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

  const isInternalUrl = (urlStr: string): boolean => {
    try {
      const u = new URL(urlStr);
      const host = u.hostname.toLowerCase();
      return host === 'oomfy.online' || host.includes('localhost') || host === '127.0.0.1';
    } catch {
      return false;
    }
  };

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (isInternalUrl(url)) {
      try {
        const u = new URL(url);
        navigate(u.pathname + u.search + u.hash);
      } catch {
        navigate(url);
      }
    } else {
      navigate(`/external?url=${encodeURIComponent(url)}`);
    }
  };

  const handleMentionClick = (e: React.MouseEvent, mention: string) => {
    e.stopPropagation();
    const username = mention.slice(1);
    navigate(`/${username}`);
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

