import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Svg from './Svg';

/**
 * Right-side drawer with a scrim.
 *
 * Drawers stack: `depth` 0 is the base, 1 sits over it at higher elevation
 * while the one beneath stays mounted and visible. Two rules matter and are
 * easy to get wrong:
 *
 *  - **Esc closes the topmost drawer only.** Every open drawer would otherwise
 *    hear the same keydown and the whole stack would collapse at once.
 *  - **Focus is trapped in the topmost drawer only**, so a stacked child does
 *    not fight its parent for focus.
 */
export default function Drawer({
  open, onClose, title, subtitle, width = 760, depth = 0, topmost = true,
  headerActions, footer, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  depth?: number;
  /** false when another drawer is stacked above this one */
  topmost?: boolean;
  /** primary actions, rendered in the header beside the close button */
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement;
    // focus the panel so Tab starts inside it
    panel.current?.focus();
    return () => restoreTo.current?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open || !topmost) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, topmost, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="scrim" style={{ zIndex: 100 + depth * 2 }}
        onClick={topmost ? onClose : undefined} />
      <div className={'drawer' + (topmost ? '' : ' behind')} ref={panel} tabIndex={-1}
        role="dialog" aria-modal={topmost} aria-label={title}
        style={{ width, zIndex: 101 + depth * 2 }}>
        <div className="drawer-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="drawer-sub">{subtitle}</div>}
          </div>
          <div className="drawer-actions">
            {headerActions}
            <button className="iconbtn" title="Close" aria-label="Close" onClick={onClose}>
              <Svg name="x" />
            </button>
          </div>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}
