import React from 'react';
import { LegalDocumentLayout } from '../components/legal/LegalDocumentLayout.js';
import { TERMS_CONTENT } from '../data/termsContent.js';

export const TermsAndConditionsView: React.FC = () => (
  <LegalDocumentLayout
    title={TERMS_CONTENT.title}
    updatedAt={TERMS_CONTENT.updatedAt}
    description={TERMS_CONTENT.description}
    canonicalPath="/terms"
    sections={TERMS_CONTENT.sections}
    alternateLink={{ to: '/privacy', label: 'Política de Privacidad' }}
  />
);

