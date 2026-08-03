import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Anchored popover used by the view switcher, column chooser and overflow menu.
 * Closes on outside click and on Escape.
 */
export default function Popover({
  open, onClose, align = 'right', children,
}: {
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // `capture` so a control that stops propagation cannot trap the popover open
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={'popover' + (align === 'left' ? ' left' : '')} ref={ref} role="menu">
      {children}
    </div>
  );
}
