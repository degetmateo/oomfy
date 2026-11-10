import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../layout/Header.js';
import { SeoHead } from '../common/SeoHead.js';
import type { LegalSection } from '../../data/privacyContent.js';

interface Props {
  title: string;
  updatedAt: string;
  description: string;
  canonicalPath: '/privacy' | '/terms';
  sections: LegalSection[];
  alternateLink: { to: string; label: string };
}

export const LegalDocumentLayout: React.FC<Props> = ({
  title, updatedAt, description, canonicalPath, sections, alternateLink,
}) => (
  <div className="flex flex-col min-h-screen font-mono">
    <SeoHead title={`${title} | Oomfy`} description={description} canonicalPath={canonicalPath} />
    <Header title={title} showBack />

    <article className="p-4 sm:p-6 flex flex-col gap-5">
      <div className="border-b border-dark-border pb-4">
        <p className="text-xs text-brand-400">{updatedAt}</p>
        <p className="text-xs sm:text-sm text-dark-muted mt-1.5 font-sans leading-relaxed">{description}</p>
      </div>

      {sections.map((sec) => (
        <section key={sec.heading} className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-brand-400">{sec.heading}</h2>
          {sec.paragraphs.map((p, i) => (
            <p key={i} className="text-xs sm:text-sm text-dark-text/95 font-sans leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}

      <div className="pt-4 border-t border-dark-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link to={alternateLink.to} className="text-brand-400 font-bold hover:underline">
          Ver {alternateLink.label} →
        </Link>
        <div className="flex items-center gap-3 text-dark-muted">
          <Link to="/" className="hover:text-white hover:underline">Inicio</Link>
          <Link to="/signup" className="hover:text-white hover:underline">Registro</Link>
          <Link to="/signin" className="hover:text-white hover:underline">Iniciar sesión</Link>
        </div>
      </div>
    </article>
  </div>
);

