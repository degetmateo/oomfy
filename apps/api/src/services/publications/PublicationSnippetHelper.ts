export class PublicationSnippetHelper {
  public static extractSnippet(publication?: {
    content?: string | null;
    images?: Array<{ url: string }> | null;
  } | null): string {
    if (!publication) return '';

    if (publication.content && publication.content.trim()) {
      const clean = publication.content.trim();
      const match = clean.match(/^([^.!?\n]+[.!?]?)/);
      const sentence = (match ? match[1] : clean).trim();
      return sentence.length > 100 ? `${sentence.slice(0, 97)}...` : sentence;
    }

    if (publication.images && publication.images.length > 0) {
      return '📷 Imagen adjunta';
    }

    return '';
  }
}

