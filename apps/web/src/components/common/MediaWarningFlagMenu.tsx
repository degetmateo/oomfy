import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { Flag, Check } from 'lucide-react';
import { MediaWarning } from '@oomfy/shared';
import { usePopoverMenu } from '../../hooks/usePopoverMenu.js';

interface Props {
  warning: MediaWarning | null;
  onChange: (warning: MediaWarning | null) => void;
  itemLabel: string;
}

export const MediaWarningFlagMenu: React.FC<Props> = ({ warning, onChange, itemLabel }) => {
  const triggerId = useId();
  const { menuId, triggerRef, menuRef, isOpen, supportsPopover, useJsPos, coords, closeMenu, toggleFallback } =
    usePopoverMenu({ width: 196 });

  const supportsFocusGroup =
    typeof HTMLElement !== 'undefined' && 'focusGroup' in HTMLElement.prototype;
  const supportsCommandInvoker =
    typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;

  const triggerInvokeProps: Record<string, string> = supportsPopover
    ? supportsCommandInvoker
      ? { commandfor: menuId, command: 'toggle-popover' }
      : { popovertarget: menuId, popovertargetaction: 'toggle' }
    : {};

  const panelStyle: React.CSSProperties | undefined = useJsPos
    ? { position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }
    : undefined;

  const panel =
    supportsPopover || isOpen ? (
      <div
        id={menuId}
        ref={menuRef}
        popover={supportsPopover ? 'auto' : undefined}
        data-js-positioned={useJsPos ? 'true' : undefined}
        data-no-card-nav="true"
        data-no-swipe="true"
        onClick={(e) => e.stopPropagation()}
        style={panelStyle}
        className="pub-menu-popover w-48 bg-dark-bg border border-dark-border shadow-pixel py-1 text-xs font-mono"
      >
        <div
          {...({ focusgroup: 'menu nomemory' } as Record<string, string>)}
          role={supportsFocusGroup ? undefined : 'menu'}
          aria-labelledby={triggerId}
          aria-label={`Opciones de censura para ${itemLabel}`}
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={warning === 'spoiler'}
            onClick={(e) => {
              e.stopPropagation();
              onChange(warning === 'spoiler' ? null : 'spoiler');
              closeMenu(false);
            }}
            className={`w-full px-3 py-2 text-left hover:bg-dark-card flex items-center justify-between gap-2 ${
              warning === 'spoiler' ? 'text-amber-300 font-bold' : 'text-dark-text'
            }`}
          >
            <span>Spoiler</span>
            {warning === 'spoiler' && <Check className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />}
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={warning === 'sensitive'}
            onClick={(e) => {
              e.stopPropagation();
              onChange(warning === 'sensitive' ? null : 'sensitive');
              closeMenu(false);
            }}
            className={`w-full px-3 py-2 text-left hover:bg-dark-card flex items-center justify-between gap-2 border-t border-dark-border/50 ${
              warning === 'sensitive' ? 'text-amber-300 font-bold' : 'text-dark-text'
            }`}
          >
            <span>Contenido sensible</span>
            {warning === 'sensitive' && <Check className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />}
          </button>

          {warning !== null && (
            <>
              <hr className="my-1 border-dark-border" />
              <button
                type="button"
                role={supportsFocusGroup ? undefined : 'menuitem'}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                  closeMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-dark-card text-dark-muted hover:text-white flex items-center gap-2"
              >
                <span>Quitar censura</span>
              </button>
            </>
          )}
        </div>
      </div>
    ) : null;

  const warningTitle =
    warning === 'spoiler'
      ? 'Marcado como Spoiler'
      : warning === 'sensitive'
        ? 'Marcado como Contenido sensible'
        : 'Marcar advertencia de contenido';

  return (
    <>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`${warningTitle}: ${itemLabel}`}
        title={warningTitle}
        {...triggerInvokeProps}
        onClick={(e) => {
          e.stopPropagation();
          if (!supportsPopover) toggleFallback();
        }}
        className={`absolute top-0 left-0 z-10 p-1 transition-colors cursor-pointer ${
          warning
            ? 'bg-amber-500 text-black hover:bg-amber-400'
            : 'bg-black/80 text-white hover:bg-brand-500 hover:text-black'
        }`}
      >
        <Flag className="w-3 h-3" aria-hidden="true" />
      </button>
      {panel && (typeof document !== 'undefined' ? createPortal(panel, document.body) : panel)}
    </>
  );
};
