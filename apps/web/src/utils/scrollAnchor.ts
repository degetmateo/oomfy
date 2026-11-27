export interface VisibleScrollAnchor {
  anchorId: string;
  anchorTop: number;
}

const DEFAULT_HEADER_OFFSET_PX = 64;

export function isInsideHiddenSubtree(el: HTMLElement, stopAt: HTMLElement | null): boolean {
  let curr: HTMLElement | null = el.parentElement;
  while (curr && curr !== stopAt) {
    if (
      curr.classList.contains('spa-tab-panel-inactive') ||
      curr.classList.contains('spa-view-inactive') ||
      curr.getAttribute('aria-hidden') === 'true' ||
      (curr as any).inert === true ||
      curr.hasAttribute('inert')
    ) {
      return true;
    }
    curr = curr.parentElement;
  }
  return false;
}

function readAnchorId(el: HTMLElement): string | null {
  return el.getAttribute('data-scroll-anchor') || el.getAttribute('data-feed-post-id');
}

export function pickVisibleScrollAnchor(
  container: HTMLElement | null,
  headerOffset = DEFAULT_HEADER_OFFSET_PX
): VisibleScrollAnchor | null {
  if (!container) return null;
  const candidates = container.querySelectorAll<HTMLElement>('[data-scroll-anchor], [data-feed-post-id]');
  for (const el of Array.from(candidates)) {
    if (isInsideHiddenSubtree(el, container)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;
    if (rect.bottom > headerOffset) {
      const anchorId = readAnchorId(el);
      if (anchorId) {
        return { anchorId, anchorTop: rect.top };
      }
    }
  }
  return null;
}

export function findVisibleScrollAnchor(
  container: HTMLElement | null,
  anchorId: string
): HTMLElement | null {
  if (!container || !anchorId) return null;
  const candidates = container.querySelectorAll<HTMLElement>('[data-scroll-anchor], [data-feed-post-id]');
  for (const el of Array.from(candidates)) {
    if (isInsideHiddenSubtree(el, container)) continue;
    if (readAnchorId(el) === anchorId) {
      return el;
    }
  }
  return null;
}
