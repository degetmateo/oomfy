import React from 'react';
import { LegalDocumentLayout } from '../components/legal/LegalDocumentLayout.js';
import { PRIVACY_CONTENT } from '../data/privacyContent.js';

export const PrivacyPolicyView: React.FC = () => (
  <LegalDocumentLayout
    title={PRIVACY_CONTENT.title}
    updatedAt={PRIVACY_CONTENT.updatedAt}
    description={PRIVACY_CONTENT.description}
    canonicalPath="/privacy"
    sections={PRIVACY_CONTENT.sections}
    alternateLink={{ to: '/terms', label: 'Términos y Condiciones' }}
  />
);

