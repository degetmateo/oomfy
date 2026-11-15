import React, { useEffect } from 'react';
import { SITE_URL as BASE_URL } from '@oomfy/shared';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

export interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
  jsonLd?: Record<string, any> | null;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonicalPath = '/',
  ogImage = `${BASE_URL}/assets/oomfy-logo-black-bg.png`,
  ogType = 'website',
  noIndex = false,
  jsonLd = null,
}) => {
  useEffect(() => {
    const cleanDesc = description.replace(/\s+/g, ' ').trim().slice(0, 160);
    const safeOgImage = resolveMediaUrl(ogImage) || `${BASE_URL}/assets/oomfy-logo-black-bg.png`;
    const canonicalUrl = canonicalPath.startsWith('http')
      ? canonicalPath
      : `${BASE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;

    document.title = title;
    upsertMeta('name', 'description', cleanDesc);
    upsertMeta('name', 'robots', noIndex ? 'noindex, follow' : 'index, follow');
    upsertLink('canonical', canonicalUrl);

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', cleanDesc);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', safeOgImage);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:site_name', 'Oomfy');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', cleanDesc);
    upsertMeta('name', 'twitter:image', safeOgImage);

    let scriptEl = document.getElementById('oomfy-jsonld') as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'oomfy-jsonld';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, canonicalPath, ogImage, ogType, noIndex, jsonLd]);

  return null;
};

